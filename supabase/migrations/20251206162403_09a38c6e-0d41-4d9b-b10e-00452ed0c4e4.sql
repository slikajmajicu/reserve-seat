-- Drop the existing policy that allows users to view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- The "Admins can manage user roles" policy already exists and is correct
-- Only admins can SELECT/INSERT/UPDATE/DELETE on user_roles

-- Add explicit SELECT policy for admins only (in case the ALL policy doesn't cover it)
CREATE POLICY "Only admins can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));