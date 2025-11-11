-- Create workshops table
CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  max_capacity integer NOT NULL DEFAULT 10,
  reserved_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  city text NOT NULL,
  tshirt_option text NOT NULL CHECK (tshirt_option IN ('own', 'buy_onsite')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted')),
  seat_number integer,
  reservation_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshops (public read access)
CREATE POLICY "Anyone can view workshops"
ON public.workshops
FOR SELECT
USING (true);

-- RLS Policies for reservations (public can insert their own, admins can manage all)
CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view their own reservations"
ON public.reservations
FOR SELECT
USING (true);

-- Create function to update workshop reserved count
CREATE OR REPLACE FUNCTION public.update_workshop_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to auto-update workshop count
CREATE TRIGGER update_workshop_count_trigger
AFTER INSERT OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_workshop_count();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger for workshops updated_at
CREATE TRIGGER update_workshops_updated_at
BEFORE UPDATE ON public.workshops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Insert some sample workshop dates
INSERT INTO public.workshops (date) VALUES
  (CURRENT_DATE + INTERVAL '7 days'),
  (CURRENT_DATE + INTERVAL '14 days'),
  (CURRENT_DATE + INTERVAL '21 days'),
  (CURRENT_DATE + INTERVAL '28 days');