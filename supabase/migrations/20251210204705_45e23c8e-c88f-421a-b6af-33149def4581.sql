-- =============================================
-- 1. CREATE PII ACCESS LOGGING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_count integer,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pii_access_log_admin ON public.pii_access_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_action ON public.pii_access_log(action, created_at DESC);

-- Enable RLS on the log table itself
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
CREATE POLICY "Only admins can view pii access logs"
ON public.pii_access_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs (via security definer function)
CREATE POLICY "System can insert pii access logs"
ON public.pii_access_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. CREATE PII ACCESS LOGGING FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_action text,
  p_table_name text,
  p_record_count integer DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if user is admin
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO public.pii_access_log (
      admin_user_id,
      action,
      table_name,
      record_count,
      metadata
    ) VALUES (
      auth.uid(),
      p_action,
      p_table_name,
      p_record_count,
      p_metadata
    );
  END IF;
END;
$$;

-- =============================================
-- 3. STRENGTHEN USER_ROLES PROTECTION
-- =============================================
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Create strict admin-only management policy
-- This ensures only existing admins can add new admins
CREATE POLICY "Only admins can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. VERIFY RESERVATIONS RLS IS STRICT
-- =============================================
-- Drop all existing reservation policies to rebuild
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users and admins can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users and admins can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users and admins can delete reservations" ON public.reservations;

-- Strict INSERT: Users can only insert their own reservations
CREATE POLICY "Users can only insert own reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Strict SELECT: Users see only their own, admins see all
CREATE POLICY "Users view own or admins view all"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Strict UPDATE: Users update only their own, admins can update all
CREATE POLICY "Users update own or admins update all"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Strict DELETE: Users delete only their own, admins can delete all
CREATE POLICY "Users delete own or admins delete all"
ON public.reservations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- 5. ADD ADMIN ACCESS LOGGING TRIGGER
-- =============================================
-- Function to log when admins access reservations
CREATE OR REPLACE FUNCTION public.log_admin_reservation_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log admin access (not users viewing their own)
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    INSERT INTO public.pii_access_log (
      admin_user_id,
      action,
      table_name,
      record_count,
      metadata
    ) VALUES (
      auth.uid(),
      'view_reservations',
      'reservations',
      1,
      jsonb_build_object('reservation_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- 6. PROTECT RATE LIMITS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage own rate limits" ON public.reservation_rate_limits;

CREATE POLICY "Users can view own rate limits"
ON public.reservation_rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System inserts rate limits"
ON public.reservation_rate_limits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all rate limits for monitoring
CREATE POLICY "Admins can view all rate limits"
ON public.reservation_rate_limits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));