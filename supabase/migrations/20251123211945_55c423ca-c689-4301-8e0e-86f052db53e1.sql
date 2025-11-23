-- Drop the problematic functions and their triggers using CASCADE
DROP FUNCTION IF EXISTS public.notify_admin_new_reservation() CASCADE;
DROP FUNCTION IF EXISTS public.check_workshop_capacity() CASCADE;

-- These functions will be replaced by edge function calls from the frontend instead of database triggers