-- Fix function search paths for security

-- Drop triggers first
DROP TRIGGER IF EXISTS update_workshop_count_trigger ON public.reservations;
DROP TRIGGER IF EXISTS update_workshops_updated_at ON public.workshops;

-- Drop and recreate update_workshop_count function with search_path
DROP FUNCTION IF EXISTS public.update_workshop_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_workshop_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.workshops
    SET reserved_count = reserved_count + 1,
        updated_at = now()
    WHERE id = NEW.workshop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.workshops
    SET reserved_count = reserved_count - 1,
        updated_at = now()
    WHERE id = OLD.workshop_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop and recreate update_updated_at_column function with search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_workshop_count_trigger
AFTER INSERT OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_workshop_count();

CREATE TRIGGER update_workshops_updated_at
BEFORE UPDATE ON public.workshops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();