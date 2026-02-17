import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const sanitize = (str: string) =>
  str.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL not configured");
    }

    const { email, provider, user_name } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const providerLabel = provider === "google" ? "Google OAuth" : "Email / Password";
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Belgrade",
      dateStyle: "full",
      timeStyle: "medium",
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Montserrat',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#1a1f36;padding:24px 40px;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">🔔 New Sign-In — reserve-seat</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#374151;font-size:15px;margin:0 0 24px;">A user just signed in to your platform.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;width:30%;">✉️ Email</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(email)}</td>
                </tr>
                ${user_name ? `<tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">👤 Name</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(String(user_name))}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">🔑 Method</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(providerLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">🕐 Time</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;">${sanitize(timestamp)}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} reserve-seat · Login Notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const emailResponse = await resend.emails.send({
      from: "Workshop Notifications <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `New sign-in: ${sanitize(email)} (${providerLabel})`,
      html,
    });

    return new Response(JSON.stringify({ success: true, id: emailResponse }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Error in notify-admin-login:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
