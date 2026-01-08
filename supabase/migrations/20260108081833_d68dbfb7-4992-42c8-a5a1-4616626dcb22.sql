-- Create a security definer function to get full reservation data for admins only
-- This ensures PII is only accessible through server-verified admin access
CREATE OR REPLACE FUNCTION public.get_admin_reservations(workshop_filter uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  workshop_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  city text,
  tshirt_option text,
  status text,
  seat_number integer,
  reservation_timestamp timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.workshop_id,
    r.user_id,
    r.first_name,
    r.last_name,
    r.email,
    r.phone_number,
    r.city,
    r.tshirt_option,
    r.status,
    r.seat_number,
    r.reservation_timestamp,
    r.created_at
  FROM public.reservations r
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND (workshop_filter IS NULL OR r.workshop_id = workshop_filter)
  ORDER BY r.reservation_timestamp DESC
$$;

-- Create a view for regular users that masks PII
-- Users can only see their own full data, others see masked data
CREATE OR REPLACE VIEW public.user_reservations_safe AS
SELECT 
  r.id,
  r.workshop_id,
  r.user_id,
  -- Mask first name: show only first initial for non-owners
  CASE 
    WHEN auth.uid() = r.user_id THEN r.first_name 
    ELSE LEFT(r.first_name, 1) || '***'
  END as first_name,
  -- Show last name (less sensitive)
  r.last_name,
  -- Completely mask email for non-owners
  CASE 
    WHEN auth.uid() = r.user_id THEN r.email 
    ELSE '***@***.***'
  END as email,
  -- Completely mask phone for non-owners
  CASE 
    WHEN auth.uid() = r.user_id THEN r.phone_number 
    ELSE '***-***-****'
  END as phone_number,
  -- Mask city for non-owners
  CASE 
    WHEN auth.uid() = r.user_id THEN r.city 
    ELSE '***'
  END as city,
  r.tshirt_option,
  r.status,
  r.seat_number,
  r.reservation_timestamp,
  r.created_at
FROM public.reservations r
WHERE auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.user_reservations_safe TO authenticated;