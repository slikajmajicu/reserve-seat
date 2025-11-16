-- Phase 1 & 2: Make user_id nullable and update reservation policies for mixed access

-- Make user_id nullable again to support anonymous reservations
ALTER TABLE public.reservations
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- Phase 2: Update INSERT policy to allow anonymous OR authenticated reservations
DROP POLICY IF EXISTS "Authenticated users can create their own reservations" ON public.reservations;

CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN true  -- Allow anonymous public reservations
    ELSE auth.uid() = user_id          -- Or authenticated with ownership
  END
);

-- Phase 4: Update SELECT policy for mixed access
DROP POLICY IF EXISTS "Authenticated users can view their own reservations" ON public.reservations;

CREATE POLICY "Users can view their own reservations or admins view all"
ON public.reservations
FOR SELECT
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false                          -- Block anonymous
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN true  -- Admins see all
    ELSE auth.uid() = user_id                                      -- Users see their own
  END
);

-- Phase 4: Update UPDATE policy for mixed access
DROP POLICY IF EXISTS "Authenticated users can update their own reservations" ON public.reservations;

CREATE POLICY "Users can update their own reservations or admins update all"
ON public.reservations
FOR UPDATE
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false                          -- Block anonymous
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN true  -- Admins update all
    ELSE auth.uid() = user_id                                      -- Users update their own
  END
);

-- Phase 4: Update DELETE policy for mixed access
DROP POLICY IF EXISTS "Authenticated users can delete their own reservations" ON public.reservations;

CREATE POLICY "Users can delete their own reservations or admins delete all"
ON public.reservations
FOR DELETE
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false                          -- Block anonymous
    WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN true  -- Admins delete all
    ELSE auth.uid() = user_id                                      -- Users delete their own
  END
);

-- Phase 3: Add is_active column to workshops for closure functionality
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workshops_is_active ON public.workshops(is_active);