-- Add RLS policies for admin to manage workshops and reservations

-- Admin can manage workshops
CREATE POLICY "Authenticated users can manage workshops"
ON public.workshops
FOR ALL
USING (auth.role() = 'authenticated');

-- Admin can update reservations
CREATE POLICY "Authenticated users can update reservations"
ON public.reservations
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Admin can delete reservations
CREATE POLICY "Authenticated users can delete reservations"
ON public.reservations
FOR DELETE
USING (auth.role() = 'authenticated');