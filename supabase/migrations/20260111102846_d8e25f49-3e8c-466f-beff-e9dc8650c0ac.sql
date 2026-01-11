-- Drop and recreate the user_reservations_safe view with proper WHERE clause
DROP VIEW IF EXISTS public.user_reservations_safe;

CREATE VIEW public.user_reservations_safe
WITH (security_invoker = on)
AS
SELECT 
  r.id,
  r.workshop_id,
  r.user_id,
  r.seat_number,
  r.reservation_timestamp,
  r.created_at,
  CASE 
    WHEN auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN r.first_name 
    ELSE LEFT(r.first_name, 1) || '***' 
  END as first_name,
  CASE 
    WHEN auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN r.last_name 
    ELSE '***' 
  END as last_name,
  CASE 
    WHEN auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN r.email 
    ELSE '***@***.***' 
  END as email,
  CASE 
    WHEN auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN r.phone_number 
    ELSE '***-***-****' 
  END as phone_number,
  CASE 
    WHEN auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN r.city 
    ELSE '***' 
  END as city,
  r.tshirt_option,
  r.status
FROM public.reservations r
WHERE auth.uid() = r.user_id OR public.has_role(auth.uid(), 'admin'::app_role);