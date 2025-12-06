-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own reservations or admins view all" ON public.reservations;

-- Create a new PERMISSIVE SELECT policy with explicit authentication check
CREATE POLICY "Authenticated users can view own reservations or admins view all"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);

-- Also recreate UPDATE policy with TO authenticated
DROP POLICY IF EXISTS "Users can update their own reservations or admins update all" ON public.reservations;

CREATE POLICY "Authenticated users can update own reservations or admins update all"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);

-- Also recreate DELETE policy with TO authenticated
DROP POLICY IF EXISTS "Users can delete their own reservations or admins delete all" ON public.reservations;

CREATE POLICY "Authenticated users can delete own reservations or admins delete all"
ON public.reservations
FOR DELETE
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id
  END
);