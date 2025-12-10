-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS public.reservation_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_created 
ON public.reservation_rate_limits(user_id, created_at);

-- Enable RLS
ALTER TABLE public.reservation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own rate limit records
CREATE POLICY "Users can manage own rate limits"
ON public.reservation_rate_limits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to check email verification
CREATE OR REPLACE FUNCTION public.is_email_verified(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(email_confirmed_at IS NOT NULL, false)
  FROM auth.users
  WHERE id = user_id_param;
$$;

-- Create function to enforce rate limit and email verification
CREATE OR REPLACE FUNCTION public.enforce_reservation_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Check email verification first
  IF NOT public.is_email_verified(NEW.user_id) THEN
    RAISE EXCEPTION 'Email must be verified to create reservations';
  END IF;

  -- Count attempts in the last hour
  SELECT COUNT(*) INTO attempt_count
  FROM public.reservation_rate_limits
  WHERE user_id = NEW.user_id
    AND created_at > (now() - interval '1 hour');
  
  -- Check if under limit (5 per hour)
  IF attempt_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 5 reservations per hour allowed.';
  END IF;
  
  -- Record this attempt
  INSERT INTO public.reservation_rate_limits (user_id)
  VALUES (NEW.user_id);
  
  -- Clean up old records periodically (older than 24 hours)
  DELETE FROM public.reservation_rate_limits
  WHERE created_at < (now() - interval '24 hours');
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce rate limit before insert
DROP TRIGGER IF EXISTS enforce_reservation_rate_limit_trigger ON public.reservations;
CREATE TRIGGER enforce_reservation_rate_limit_trigger
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_reservation_rate_limit();