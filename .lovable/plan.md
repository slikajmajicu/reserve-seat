

# Enhance Workshop Reservation System

## Overview
Upgrade the existing workshop reservation system with three improvements: a public calendar view on the homepage, enhanced time slot display, and improved email notification templates.

## 1. Public Calendar View on Homepage

Add a visual calendar to the homepage that shows upcoming workshops to visitors **before** they sign in. This replaces the current text-only "How It Works" section with an interactive preview.

**What visitors will see:**
- A monthly calendar widget highlighting dates that have workshops
- Clicking a date shows the workshops available that day (title, time, seats remaining)
- A "Sign up to reserve" call-to-action directing to the auth page

**Data source:** The existing `workshops` table already has a public SELECT policy (`Anyone can view active workshops`), so no database changes are needed.

## 2. Add End Time to Workshops

Currently workshops only have a `start_time`. Adding an `end_time` column gives users a complete picture of the time commitment.

**Database change:**
- Add `end_time` (TIME, nullable) column to the `workshops` table
- Update the admin "Add Workshop" dialog to include an end time field
- Display the time range (e.g., "9:00 AM - 11:00 AM") in the calendar view, reservation form, and admin dashboard

## 3. Improved Email Templates

Upgrade the existing `send-confirmation-email` and `send-admin-notification` edge functions with professional HTML email templates that include:
- Styled headers with the app branding
- Clear booking details in a formatted card layout
- Actionable tips (arrive early, save confirmation, cancellation policy)
- Footer with privacy policy and terms of service links

No new edge functions are needed -- the existing ones will be updated in place.

## What Will NOT Change
- No new database tables (no `time_slots` or `bookings` -- the existing `workshops` and `reservations` tables already handle this)
- No changes to authentication (Google OAuth is already working with Lovable's managed sign-in)
- No changes to RLS policies (they are already properly configured)
- Privacy Policy and Terms of Service pages already exist

---

## Technical Details

### Files to Create
- `src/components/WorkshopCalendar.tsx` -- Calendar component showing workshop dates with availability indicators

### Files to Modify
- `src/pages/Index.tsx` -- Replace "How It Works" section with the public calendar view
- `src/components/admin/AddWorkshopDialog.tsx` -- Add end_time field
- `src/components/admin/WorkshopsList.tsx` -- Display end_time in the table
- `src/components/ReservationForm.tsx` -- Show end_time in workshop selection dropdown
- `supabase/functions/send-confirmation-email/index.ts` -- Enhanced HTML template
- `supabase/functions/send-admin-notification/index.ts` -- Enhanced HTML template

### Database Migration
```sql
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE;
```

### Calendar Component Approach
- Uses the existing `react-day-picker` / `Calendar` UI component already installed
- Fetches active workshops from the `workshops` table (public read access is already enabled)
- Highlights dates with workshops using custom day modifiers
- Shows a popover or card below the calendar with workshop details for the selected date
