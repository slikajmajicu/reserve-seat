-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add user_id column to reservations (nullable for existing/public reservations)
ALTER TABLE public.reservations 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing RLS policies on reservations
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON public.reservations;

-- Create new RLS policies for reservations
CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own reservations or admins can view all"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update their own reservations or admins can update all"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete their own reservations or admins can delete all"
ON public.reservations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Update workshops policies to require admin role
DROP POLICY IF EXISTS "Authenticated users can manage workshops" ON public.workshops;

CREATE POLICY "Admins can manage workshops"
ON public.workshops
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policy for user_roles (only admins can manage roles)
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));