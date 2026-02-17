import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Email validation ──────────────────────────────────────────────────────────
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  const blockedDomains = [
    "mailinator.com", "guerrillamail.com", "tempmail.com",
    "10minutemail.com", "throwaway.email", "fakeinbox.com",
    "trashmail.com", "yopmail.com", "sharklasers.com",
    "guerrillamailblock.com", "grr.la", "dispostable.com",
    "temp-mail.org", "minutemail.com", "maildrop.cc",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return !blockedDomains.includes(domain);
};

// ── Sanitize input ───────────────────────────────────────────────────────────
const sanitize = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim()
    .substring(0, 500);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { requester_name, requester_email, requested_date, message, honeypot, user_id } = body;

    // ── HONEYPOT CHECK ─────────────────────────────────────────────────────
    if (honeypot && honeypot.trim() !== "") {
      console.warn("Honeypot triggered:", requester_email);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── INPUT VALIDATION ───────────────────────────────────────────────────
    if (!requester_name || requester_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Please enter your full name." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requester_email || !isValidEmail(requester_email.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: "Please enter a valid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requested_date) {
      return new Response(
        JSON.stringify({ success: false, error: "Please select a date." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedDate = new Date(requested_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return new Response(
        JSON.stringify({ success: false, error: "Please select a future date." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const cleanEmail = requester_email.trim().toLowerCase();

    // ── RATE LIMIT CHECK ───────────────────────────────────────────────────
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("reservation_request_limits")
      .select("*", { count: "exact", head: true })
      .eq("email", cleanEmail)
      .gte("created_at", cutoff);

    if (countError) throw countError;

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You have reached the maximum of 3 reservation requests in 24 hours. Please try again tomorrow.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SANITIZE INPUTS ────────────────────────────────────────────────────
    const cleanName = sanitize(requester_name);
    const cleanMessage = message ? sanitize(message) : null;

    // ── INSERT RESERVATION ─────────────────────────────────────────────────
    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        first_name: cleanName,
        email: cleanEmail,
        last_name: "",
        phone_number: "",
        city: "",
        tshirt_option: "",
        status: "pending",
        user_id: user_id || "00000000-0000-0000-0000-000000000000",
        workshop_id: "00000000-0000-0000-0000-000000000000",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ── LOG RATE LIMIT RECORD ──────────────────────────────────────────────
    await supabase
      .from("reservation_request_limits")
      .insert({ email: cleanEmail });

    // ── CLEANUP OLD RATE LIMIT RECORDS ─────────────────────────────────────
    await supabase
      .from("reservation_request_limits")
      .delete()
      .lt("created_at", cutoff);

    // ── NOTIFY ADMIN ───────────────────────────────────────────────────────
    try {
      const formattedDate = new Date(requested_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

      const adminHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px">📬 New Reservation Request</h1>
    <p style="margin:6px 0 0;color:#e9d5ff;font-size:13px">Action required — review in your dashboard</p>
  </div>
  <div style="padding:28px 32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#71717a;font-size:13px">Name</td></tr>
      <tr><td style="padding:0 0 12px;font-size:15px;font-weight:600">${cleanName}</td></tr>
      <tr><td style="padding:8px 0;color:#71717a;font-size:13px">Email</td></tr>
      <tr><td style="padding:0 0 12px;font-size:15px">${cleanEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#71717a;font-size:13px">Requested Date</td></tr>
      <tr><td style="padding:0 0 12px;font-size:15px;font-weight:600">${formattedDate}</td></tr>
      ${cleanMessage ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px">Message</td></tr><tr><td style="padding:0 0 12px;font-size:15px">${cleanMessage}</td></tr>` : ""}
    </table>
    <div style="text-align:center;margin-top:24px">
      <a href="https://reserve-seat.lovable.app/admin" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Review Request in Dashboard</a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#fafafa;text-align:center">
    <p style="margin:0;color:#a1a1aa;font-size:12px">reserve-seat.lovable.app · Belgrade, Serbia</p>
  </div>
</div>
</body></html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Reserve Seat <onboarding@resend.dev>",
          to: ADMIN_EMAIL,
          subject: `📬 New request: ${cleanName} — ${formattedDate}`,
          html: adminHtml,
        }),
      });
    } catch (emailErr) {
      console.error("Admin notification failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, reservation_id: reservation.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-reservation-request error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
