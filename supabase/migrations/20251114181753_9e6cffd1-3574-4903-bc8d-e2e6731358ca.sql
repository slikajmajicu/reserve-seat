-- Create function to send admin notification on new reservation
CREATE OR REPLACE FUNCTION public.notify_admin_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workshop_date_text TEXT;
BEGIN
  -- Get workshop date
  SELECT TO_CHAR(date, 'FMMonth DD, YYYY')
  INTO workshop_date_text
  FROM public.workshops
  WHERE id = NEW.workshop_id;

  -- Call edge function to send admin notification
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-admin-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'firstName', NEW.first_name,
      'lastName', NEW.last_name,
      'email', NEW.email,
      'phoneNumber', NEW.phone_number,
      'city', NEW.city,
      'tshirtOption', NEW.tshirt_option,
      'workshopDate', workshop_date_text,
      'status', NEW.status,
      'seatNumber', NEW.seat_number
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for admin notification
DROP TRIGGER IF EXISTS trigger_admin_notification ON public.reservations;
CREATE TRIGGER trigger_admin_notification
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_reservation();

-- Create function to check capacity and send alert
CREATE OR REPLACE FUNCTION public.check_workshop_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confirmed_count INTEGER;
  workshop_date_text TEXT;
BEGIN
  -- Count confirmed reservations for this workshop
  SELECT COUNT(*)
  INTO confirmed_count
  FROM public.reservations
  WHERE workshop_id = NEW.workshop_id
  AND status = 'confirmed';

  -- If exactly 10 confirmed (just reached capacity), send alert
  IF confirmed_count = 10 THEN
    -- Get workshop date
    SELECT TO_CHAR(date, 'FMMonth DD, YYYY')
    INTO workshop_date_text
    FROM public.workshops
    WHERE id = NEW.workshop_id;

    -- Call edge function to send capacity alert with Excel export
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-capacity-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'workshopId', NEW.workshop_id::text,
        'workshopDate', workshop_date_text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for capacity check
DROP TRIGGER IF EXISTS trigger_capacity_check ON public.reservations;
CREATE TRIGGER trigger_capacity_check
AFTER INSERT ON public.reservations
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION public.check_workshop_capacity();