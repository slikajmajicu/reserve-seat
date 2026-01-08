-- Drop and recreate the view without SECURITY DEFINER
-- The underlying reservations table RLS policies will protect the data
DROP VIEW IF EXISTS public.user_reservations_safe;

CREATE VIEW public.user_reservations_safe AS
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
FROM public.reservations r;

-- Set the view to use the SECURITY INVOKER (default) behavior
-- This means RLS from the underlying table will apply
ALTER VIEW public.user_reservations_safe SET (security_invoker = on);

-- Grant access to the view for authenticated users
GRANT SELECT ON public.user_reservations_safe TO authenticated;