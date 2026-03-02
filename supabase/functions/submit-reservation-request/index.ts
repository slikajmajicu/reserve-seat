import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_USER = Deno.env.get("SMTP_USER")!;
const SMTP_PASS = Deno.env.get("SMTP_PASS")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

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

const sanitize = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim()
    .substring(0, 500);

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { requester_name, requester_email, requested_date, message, honeypot, user_id } = body;

    // Honeypot check — silent fake success
    if (honeypot && honeypot.trim() !== "") {
      console.warn("Honeypot triggered:", requester_email);
      return jsonResponse({ success: true });
    }

    // Validate name
    if (!requester_name || requester_name.trim().length < 2) {
      return jsonResponse({ success: false, error: "Please enter your full name." }, 400);
    }

    // Validate email
    if (!requester_email || !isValidEmail(requester_email.trim())) {
      return jsonResponse({ success: false, error: "Please enter a valid email address." }, 400);
    }

    // Validate date
    if (!requested_date) {
      return jsonResponse({ success: false, error: "Please select a date." }, 400);
    }

    const selectedDate = new Date(requested_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return jsonResponse({ success: false, error: "Please select a future date." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const cleanEmail = requester_email.trim().toLowerCase();
    const cleanName = sanitize(requester_name);
    const cleanMessage = message ? sanitize(message) : null;

    // Rate limit check — 3 per email per 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("reservation_request_limits")
      .select("*", { count: "exact", head: true })
      .eq("email", cleanEmail)
      .gte("created_at", cutoff);

    if (countError) throw countError;

    if ((count ?? 0) >= 3) {
      return jsonResponse({
        success: false,
        error: "You have reached the maximum of 3 reservation requests in 24 hours. Please try again tomorrow.",
      }, 429);
    }

    // Insert reservation
    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        requester_name: cleanName,
        requester_email: cleanEmail,
        requested_date: requested_date,
        message: cleanMessage,
        first_name: cleanName,
        email: cleanEmail,
        last_name: "",
        phone_number: "",
        city: "",
        tshirt_option: "",
        status: "pending",
        user_id: user_id || null,
        workshop_id: null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log rate limit
    await supabase.from("reservation_request_limits").insert({ email: cleanEmail });

    // Cleanup old rate records
    await supabase
      .from("reservation_request_limits")
      .delete()
      .lt("created_at", cutoff);

    // Send emails via Gmail SMTP (non-blocking)
    try {
      const formattedDate = new Date(requested_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

      // Confirmation email to the requester
      const confirmationHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <div style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:28px 32px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px">✅ Reservation Request Received</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:15px">Hi ${cleanName},</p>
    <p style="margin:0 0 16px;font-size:15px">Thank you for your reservation request for <strong>${formattedDate}</strong>. We've received it and will review it shortly.</p>
    <p style="margin:0 0 16px;font-size:15px">You'll receive a confirmation email once your spot is secured.</p>
    ${cleanMessage ? `<p style="margin:0 0 16px;font-size:13px;color:#71717a">Your message: "${cleanMessage}"</p>` : ""}
  </div>
  <div style="padding:16px 32px;background:#fafafa;text-align:center">
    <p style="margin:0;color:#a1a1aa;font-size:12px">reserve-seat.lovable.app · Belgrade, Serbia</p>
  </div>
</div>
</body></html>`;

      await transporter.sendMail({
        from: `Reserve Seat <${SMTP_USER}>`,
        to: cleanEmail,
        subject: `Your reservation request for ${formattedDate}`,
        html: confirmationHtml,
      });

      // Admin notification email
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

      await transporter.sendMail({
        from: `Reserve Seat <${SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `📬 New request: ${cleanName} — ${formattedDate}`,
        html: adminHtml,
      });
    } catch (emailErr) {
      // Non-blocking: log error but don't roll back the reservation
      console.error("Email notification failed:", emailErr);
      try {
        await supabase.from("pii_access_log").insert({
          admin_user_id: "00000000-0000-0000-0000-000000000000",
          action: "email_send_failure",
          table_name: "reservations",
          record_count: 1,
          metadata: { error: String(emailErr), reservation_id: reservation.id },
        });
      } catch (_) {
        // Swallow logging errors
      }
    }

    return jsonResponse({ success: true, reservation_id: reservation.id });
  } catch (err) {
    console.error("submit-reservation-request error:", err);
    return jsonResponse({ success: false, error: "Something went wrong. Please try again." }, 500);
  }
});
