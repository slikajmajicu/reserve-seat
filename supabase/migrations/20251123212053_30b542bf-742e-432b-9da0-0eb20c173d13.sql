-- Add unique constraint to prevent duplicate email registrations per workshop
CREATE UNIQUE INDEX IF NOT EXISTS unique_email_per_workshop 
ON public.reservations(workshop_id, email);