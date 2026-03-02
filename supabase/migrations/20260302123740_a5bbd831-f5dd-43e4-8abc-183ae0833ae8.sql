
-- Fix: skip rate limit trigger for guest reservations, but rate-limit by requester_email
CREATE OR REPLACE FUNCTION public.enforce_reservation_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Guest submissions: rate-limit by requester_email instead of user_id
  IF NEW.user_id IS NULL THEN
    IF NEW.requester_email IS NOT NULL THEN
      SELECT COUNT(*) INTO attempt_count
      FROM public.reservations
      WHERE requester_email = NEW.requester_email
        AND user_id IS NULL
        AND created_at > (now() - interval '1 hour');
      IF attempt_count >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Maximum 3 requests per hour allowed.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Authenticated users: existing logic
  IF NOT public.is_email_verified(NEW.user_id) THEN
    RAISE EXCEPTION 'Email must be verified to create reservations';
  END IF;

  SELECT COUNT(*) INTO attempt_count
  FROM public.reservation_rate_limits
  WHERE user_id = NEW.user_id AND created_at > (now() - interval '1 hour');

  IF attempt_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 5 reservations per hour allowed.';
  END IF;

  INSERT INTO public.reservation_rate_limits (user_id) VALUES (NEW.user_id);
  DELETE FROM public.reservation_rate_limits WHERE created_at < (now() - interval '24 hours');
  RETURN NEW;
END;
$$;

-- Fix: skip workshop count update when workshop_id is NULL
CREATE OR REPLACE FUNCTION public.update_workshop_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.workshop_id IS NULL THEN RETURN NULL; END IF;
    UPDATE public.workshops SET reserved_count = reserved_count + 1, updated_at = now()
    WHERE id = NEW.workshop_id;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.workshop_id IS NULL THEN RETURN NULL; END IF;
    UPDATE public.workshops SET reserved_count = reserved_count - 1, updated_at = now()
    WHERE id = OLD.workshop_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('bc74762c-bcf9-40a1-98c9-e7e0098c17e5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
