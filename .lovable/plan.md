## Fix Plan: Edge Function Error, Admin Access, and Homepage

### Issue 1: Reservation form returns 500 error

**Root cause**: There's a database trigger enforce_reservation_rate_limit_trigger on the reservations table that fires BEFORE INSERT. This trigger requires user_id to be NOT NULL (it checks reservation_rate_limits which has user_id NOT NULL). Guest reservations send user_id = null, so the trigger crashes with a NOT NULL constraint violation.

Additionally, the update_workshop_count_trigger will also fail for guest reservations since workshop_id is null.

**Fix**:

- Run a database migration to modify the enforce_reservation_rate_limit() function to skip execution when NEW.user_id IS NULL (guest submissions)
- Modify the update_workshop_count() function to skip when NEW.workshop_id IS NULL

### Issue 2: Cannot access admin dashboard

**Root cause**: The user bc74762c-bcf9-40a1-98c9-e7e0098c17e5 (**[nemanjatestlova@gmail.com](mailto:nemanjatestlova@gmail.com)**) has no entry in the user_roles table. The verify-admin function correctly returns {"isAdmin": false}.

**Fix**:

- Insert the admin role for this user into the user_roles table via a database migration

### Issue 3: Homepage as the main landing page

**Status**: The homepage is already the main page at /. The blank screen mentioned is likely caused by Issue 1 (the 500 error). No code changes needed here -- fixing the edge function error should resolve this.

---

### Technical Details

**Migration SQL for trigger fixes:**

```
-- Fix: skip rate limit trigger for guest (no user_id) reservations
CREATE OR REPLACE FUNCTION public.enforce_reservation_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE attempt_count integer;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  -- ... existing logic unchanged
END;
$$;

-- Fix: skip workshop count update when no workshop_id
CREATE OR REPLACE FUNCTION public.update_workshop_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.workshop_id IS NULL THEN RETURN NULL; END IF;
    -- ... existing logic
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.workshop_id IS NULL THEN RETURN NULL; END IF;
    -- ... existing logic
  END IF;
  RETURN NULL;
END;
$$;

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('bc74762c-bcf9-40a1-98c9-e7e0098c17e5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING{
```

  "action": "full_system_recovery_and_upgrade",

  "database_migrations": [

    {

      "description": "Fix Trigger Logic & Grant Admin",

      "sql": "CREATE OR REPLACE FUNCTION public.enforce_reservation_rate_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF NEW.user_id IS NULL THEN RETURN NEW; END IF; /* Existing logic */ RETURN NEW; END; $$; CREATE OR REPLACE FUNCTION public.update_workshop_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF TG_OP = 'INSERT' AND NEW.workshop_id IS NOT NULL THEN /* Increment logic */ ELSIF TG_OP = 'DELETE' AND OLD.workshop_id IS NOT NULL THEN /* Decrement logic */ END IF; RETURN NULL; END; $$; INSERT INTO public.user_roles (user_id, role) VALUES ('bc74762c-bcf9-40a1-98c9-e7e0098c17e5', 'admin') ON CONFLICT DO NOTHING;"

    },

    {

      "description": "Anti-Spam Table",

      "sql": "CREATE TABLE IF NOT EXISTS public.reservation_request_limits (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, email TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()); CREATE INDEX idx_request_limits_email ON public.reservation_request_limits(email); ALTER TABLE public.reservation_request_limits ENABLE ROW LEVEL SECURITY; CREATE POLICY \"Public insert for rate limiting\" ON public.reservation_request_limits FOR INSERT WITH CHECK (true);"

    }

  ],

  "edge_function_update": {

    "path": "supabase/functions/submit-reservation-request/index.ts",

    "features": [

      "Switch from Resend to Gmail SMTP using '[https://deno.land/x/smtp/mod.ts](https://deno.land/x/smtp/mod.ts)'.",

      "Implement Honeypot check (fail silently if 'website' field is filled).",

      "Implement Rate Limit check (check 'reservation_request_limits' for > 3 requests/24h per email).",

      "Sanitize inputs to prevent XSS."

    ],

    "secrets_required": ["SMTP_USER", "SMTP_PASS", "ADMIN_EMAIL"]

  },

  "frontend_changes": {

    "component": "src/components/WorkshopCalendar.tsx",

    "tasks": [

      "Add hidden honeypot input field with style 'position: absolute; left: -9999px'.",

      "Update handleSubmit to call 'supabase.functions.invoke(\"submit-reservation-request\")'.",

      "Explicitly pass 'user_id: session?.user?.id || null' to match the new database trigger logic."

    ]

  }

}