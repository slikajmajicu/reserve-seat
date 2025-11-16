-- 1. Update reservations INSERT policy to require authentication and user ownership
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;

CREATE POLICY "Authenticated users can create their own reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Make user_id NOT NULL and set default
ALTER TABLE public.reservations
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 3. Update SELECT, UPDATE, DELETE policies to require authentication and user ownership
DROP POLICY IF EXISTS "Users can view their own reservations or admins can view all" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations or admins can update al" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations or admins can delete al" ON public.reservations;

CREATE POLICY "Authenticated users can view their own reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can update their own reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can delete their own reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Add SELECT policy for user_roles to allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);