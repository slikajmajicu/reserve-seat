

# Anti-Spam Protection for Guest Reservation Requests

## Overview
Add three layers of spam protection to the public reservation request form -- honeypot field, server-side email validation with disposable domain blocking, and per-email rate limiting -- all without external services or captcha.

## What Changes

### 1. New Database Table: `reservation_request_limits`
A simple table to track how many requests each email address has made, enabling per-email rate limiting (max 3 per 24 hours). RLS allows anonymous inserts (needed for guest flow). Old records are cleaned up automatically by the edge function on each request.

### 2. New Edge Function: `submit-reservation-request`
A single server-side endpoint that consolidates reservation insertion and admin notification. It performs:
- Honeypot check (silent fake-success if triggered)
- Input validation (name length, email format, future date)
- Disposable email domain blocking (mailinator, yopmail, tempmail, etc.)
- Rate limit enforcement (3 requests per email per 24 hours, HTTP 429)
- Input sanitization (XSS prevention, length limits)
- Reservation insert (via service role key, bypassing RLS)
- Admin email notification via Resend (fire-and-forget)

This replaces what would otherwise be a direct client-side insert + separate `notify-admin-new-request` call, making the architecture cleaner and more secure.

### 3. Frontend: Honeypot Field + Edge Function Call
The WorkshopCalendar component (which will be rewritten as part of the homepage redesign) will include:
- A hidden honeypot input field (invisible to users, filled by bots)
- Form submission via `supabase.functions.invoke("submit-reservation-request")` instead of direct database insert
- Error handling for rate limit (429) and validation errors

## Dependencies on Previous Plans
This plan builds on two previously approved but not yet implemented plans:
1. **Homepage redesign** -- makes reservation columns nullable, adds `message` column, redesigns WorkshopCalendar with inline form
2. **Admin notification flow** -- adds confirm/reject edge functions and PendingReservations admin component

The `submit-reservation-request` edge function replaces the previously planned `notify-admin-new-request` function, consolidating both operations into one call.

---

## Technical Details

### Database Migration

```sql
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

-- Service role inserts via edge function; no direct client access needed
CREATE POLICY "Service role manages rate limits"
  ON public.reservation_request_limits FOR ALL
  USING (false);
```

Note: RLS policy blocks all client access. The edge function uses the service role key to insert/delete/query, so no public policy is needed. This is more secure than allowing anonymous inserts.

### Files to Create
- `supabase/functions/submit-reservation-request/index.ts` -- Consolidated edge function with all three anti-spam layers + reservation insert + admin notification
- The previously planned `notify-admin-new-request` function is no longer needed as a separate function

### Files to Modify
- `src/components/WorkshopCalendar.tsx` -- Add honeypot state and hidden field; submit via edge function instead of direct insert (this modification happens as part of the full calendar rewrite from the homepage redesign plan)

### Configuration
Add to `supabase/config.toml`:
```toml
[functions.submit-reservation-request]
verify_jwt = false
```

### Edge Function: `submit-reservation-request`
Uses existing secrets (all already configured):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` -- database access
- `RESEND_API_KEY`, `ADMIN_EMAIL` -- admin notification email

Request body:
```text
{
  requester_name: string,
  requester_email: string,
  requested_date: string (YYYY-MM-DD),
  message: string (optional),
  honeypot: string (must be empty),
  user_id: string | null
}
```

Response codes:
- 200: Success (or fake success for honeypot)
- 400: Validation error (name too short, invalid email, past date)
- 429: Rate limit exceeded (3 per 24 hours per email)
- 500: Server error

### Anti-Spam Layers Summary

| Layer | Where | What it catches |
|-------|-------|----------------|
| Honeypot | Client + Server | Automated bots that fill all form fields |
| Email validation | Server | Disposable/fake email addresses |
| Rate limiting | Server + Database | Repeated submissions from same email |

### Implementation Order
This will be implemented as part of the full batch alongside the homepage redesign and admin flow:
1. Database migrations (nullable columns + rate limits table)
2. Edge functions (submit-reservation-request, confirm-reservation, reject-reservation)
3. Homepage UI (Index.tsx, WorkshopCalendar.tsx with honeypot + edge function call)
4. Admin dashboard (PendingReservations.tsx with confirm/reject dialogs)

