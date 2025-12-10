-- Fix rate_limits policy to explicitly target authenticated users only
DROP POLICY IF EXISTS "Users can manage own rate limits" ON public.reservation_rate_limits;
CREATE POLICY "Authenticated users can manage own rate limits"
ON public.reservation_rate_limits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix reservations policies
DROP POLICY IF EXISTS "Authenticated users can create their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete own reservations or admins delet" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update own reservations or admins updat" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can view own reservations or admins view al" ON public.reservations;

CREATE POLICY "Authenticated users can create reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can view reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);

CREATE POLICY "Users and admins can update reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);

CREATE POLICY "Users and admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can view user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix workshops policies - keep public read access but restrict admin operations
DROP POLICY IF EXISTS "Admins can manage workshops" ON public.workshops;
DROP POLICY IF EXISTS "Anyone can view workshops" ON public.workshops;

CREATE POLICY "Anyone can view active workshops"
ON public.workshops
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage workshops"
ON public.workshops
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));