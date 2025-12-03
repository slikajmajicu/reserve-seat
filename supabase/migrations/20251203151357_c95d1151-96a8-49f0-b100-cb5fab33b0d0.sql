-- Drop the existing INSERT policy that allows anonymous access
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;

-- Create new INSERT policy that requires authentication and user_id match
CREATE POLICY "Authenticated users can create their own reservations"
ON public.reservations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Make user_id NOT NULL to ensure all reservations are tied to users
ALTER TABLE public.reservations ALTER COLUMN user_id SET NOT NULL;