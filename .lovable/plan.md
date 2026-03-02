## Fix Reservations, Migrate Email to Gmail SMTP, and Enhance Admin Dashboard

### 1. Fix Database Triggers for Guest Reservations

The 500 error occurs because two triggers on the `reservations` table crash when `user_id` or `workshop_id` is NULL (guest submissions).

**Changes:**

- Run a database migration to update `enforce_reservation_rate_limit()` to `RETURN NEW` immediately when `NEW.user_id IS NULL`
- Update `update_workshop_count()` to `RETURN NULL` when `NEW.workshop_id IS NULL` (INSERT) or `OLD.workshop_id IS NULL` (DELETE)
- Insert admin role for user `bc74762c-bcf9-40a1-98c9-e7e0098c17e5` into `user_roles`

### 2. Migrate Email to Gmail SMTP

Replace Resend with Nodemailer over Gmail SMTP in the `submit-reservation-request` edge function.

**Changes:**

- Update `supabase/functions/submit-reservation-request/index.ts`:
  - Import `nodemailer` from npm via esm.sh
  - Use `SMTP_USER` and `SMTP_PASS` environment variables
  - Configure transporter with `smtp.gmail.com`, port 465, secure: true
  - Send confirmation email to the requester and notification email to the admin on successful reservation insert
  - Remove the Resend API call
- Request two new secrets from the user: `SMTP_USER` (Gmail address) and `SMTP_PASS` (Gmail App Password)

**Note:** The other edge functions (`send-confirmation-email`, `send-admin-notification`, etc.) still use Resend. This plan only migrates the reservation submission flow. If you want all email functions migrated, that can be done as a follow-up.

### 3. Enhance Admin Dashboard to Show Guest Requests

The `ReservationsList` component currently expects `workshop_id` to always exist (it joins `workshops(date)`). Guest requests have `workshop_id = NULL`, so they either error or are invisible.

**Changes:**

- Update `src/components/admin/ReservationsList.tsx`:
  - Make the `workshops` join optional in the query (use left join behavior)
  - Update the `Reservation` type to allow nullable `workshop_id`, and add `requester_name`, `requester_email`, `requested_date`, `message` fields
  - Display `requester_name` / `requester_email` when `first_name` is empty (guest submissions)
  - Show `requested_date` when `workshops` relation is null
  - Add a "Message" column or expandable row to display the guest's message
  - Add a status filter dropdown so admins can filter by "pending", "confirmed", etc.

### 4. Routing and Homepage

The homepage is already at `/` and renders `Index.tsx`. No routing changes are needed. The form data is already persisted to the `reservations` table (once the trigger fix is applied). No code changes required here.

---

### Technical Details

**Migration SQL:**

```sql
CREATE OR REPLACE FUNCTION public.enforce_reservation_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE attempt_count integer;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
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

INSERT INTO public.user_roles (user_id, role)
VALUES ('bc74762c-bcf9-40a1-98c9-e7e0098c17e5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Edge function email (Nodemailer via Gmail SMTP):**

```typescript
import nodemailer from "npm:nodemailer@6";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: Deno.env.get("SMTP_USER"),
    pass: Deno.env.get("SMTP_PASS"),
  },
});
```

**Files to modify:**

- `supabase/functions/submit-reservation-request/index.ts` (replace Resend with Nodemailer)
- `src/components/admin/ReservationsList.tsx` (handle null workshop_id, show guest fields)
- Database migration (fix triggers + grant admin role)

**Secrets needed:**

- `SMTP_USER` -- Gmail address used to send emails
- `SMTP_PASS` -- Gmail App Password (not regular password)  
  
  
{
    "instructions": "Implement the Fix Plan with added security and admin functionality.",
    "modifications": [
      {
        "component": "Database Triggers",
        "action": "Update 'enforce_reservation_rate_limit' to rate-limit guests by 'requester_email' (max 3 per hour) so the system is protected from spam even without a user_id."
      },
      {
        "component": "Admin Dashboard",
        "action": "In ReservationsList.tsx, add a 'Status' badge (Pending/Confirmed/Cancelled). Add an action button for 'Pending' reservations that allows the admin to assign a Workshop ID and toggle the status to 'Confirmed'."
      },
      {
        "component": "Email Logic",
        "action": "In the submit-reservation-request function, implement a robust try/catch block for Nodemailer. If the email fails, log the error to Supabase but do NOT roll back the database insert—we want the data even if the email notification hiccups."
      },
      {
        "component": "UI/UX",
        "action": "Ensure the 'Homepage' form gives a clear success message that says 'Check your email for confirmation' to guide the guest user."
      }
    ]
  }