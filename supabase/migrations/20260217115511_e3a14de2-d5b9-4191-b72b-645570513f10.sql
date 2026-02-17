
CREATE TABLE IF NOT EXISTS public.reservation_request_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_limits_email
  ON public.reservation_request_limits(email);

CREATE INDEX idx_request_limits_created_at
  ON public.reservation_request_limits(created_at);

ALTER TABLE public.reservation_request_limits ENABLE ROW LEVEL SECURITY;

-- Block all client access; edge function uses service role key
CREATE POLICY "Service role manages rate limits"
  ON public.reservation_request_limits FOR ALL
  USING (false);
