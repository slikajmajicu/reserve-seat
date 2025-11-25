-- Drop the unique constraint on workshops date to allow multiple workshops per day
ALTER TABLE public.workshops DROP CONSTRAINT IF EXISTS workshops_date_key;

-- Add title column for workshop identification
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS title text DEFAULT 'Workshop Session';

-- Add start_time column for scheduling multiple workshops on same day
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS start_time time without time zone;