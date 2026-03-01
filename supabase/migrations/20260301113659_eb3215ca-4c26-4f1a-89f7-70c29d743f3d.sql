
-- Make legacy columns nullable for guest reservation flow
ALTER TABLE public.reservations 
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN phone_number DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN tshirt_option DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN workshop_id DROP NOT NULL;

-- Add guest-specific columns
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS requester_name TEXT,
  ADD COLUMN IF NOT EXISTS requester_email TEXT,
  ADD COLUMN IF NOT EXISTS requested_date DATE,
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Change default status to pending for new flow
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'pending';

-- Add RLS policy for anonymous pending inserts (edge function uses service role, 
-- but this is a fallback policy)
CREATE POLICY "Allow anonymous pending inserts"
  ON public.reservations FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

-- Allow anon to read their own pending reservations by email
CREATE POLICY "Anon can select pending by email"
  ON public.reservations FOR SELECT
  TO anon
  USING (status = 'pending');
