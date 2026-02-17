import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const FUNCTION_NAME = "send-confirmation-email";

interface EmailRequest {
  email: string;
  firstName: string;
  workshopTitle: string;
  workshopDate: string;
  status: string;
}

const checkRateLimit = async (
  supabase: any,
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> => {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("edge_function_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("function_name", FUNCTION_NAME)
    .gte("created_at", windowStart);

  if (countError) {
    console.error("Rate limit check error:", countError);
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  const currentCount = count || 0;
  const allowed = currentCount < RATE_LIMIT_MAX;
  const remaining = Math.max(0, RATE_LIMIT_MAX - currentCount - 1);

  if (allowed) {
    await supabase.from("edge_function_rate_limits").insert({
      identifier,
      function_name: FUNCTION_NAME,
    });
  }

  return { allowed, remaining };
};

const verifyAuth = async (req: Request): Promise<{ authenticated: boolean; userId?: string }> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false };
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { authenticated: false };
  return { authenticated: true, userId: user.id };
};

const sanitize = (str: string) =>
  str.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );

const buildEmailHtml = (firstName: string, workshopTitle: string, workshopDate: string, status: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Montserrat',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background-color:#1a1f36;padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;">reserve-seat</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1f36;margin:0 0 8px;font-size:22px;">
            ${status === "confirmed" ? "🎉 Reservation Confirmed!" : "📋 You're on the Waitlist"}
          </h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:15px;">
            ${status === "confirmed"
              ? `Great news, ${sanitize(firstName)}! Your spot is secured.`
              : `Hi ${sanitize(firstName)}, you've been added to the waitlist. We'll notify you if a spot opens up.`}
          </p>
          <!-- Details Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <tr><td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Workshop Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;width:40%;">📚 Workshop</td>
                  <td style="padding:8px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(workshopTitle)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Date &amp; Time</td>
                  <td style="padding:8px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(workshopDate)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#6b7280;">✅ Status</td>
                  <td style="padding:8px 0;font-size:14px;color:${status === "confirmed" ? "#059669" : "#d97706"};font-weight:600;">${sanitize(status.toUpperCase())}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <!-- Tips -->
          ${status === "confirmed" ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
            <tr><td style="padding:16px 24px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#065f46;">💡 Quick Tips</p>
              <p style="margin:0;font-size:13px;color:#047857;line-height:1.6;">
                • Arrive 5-10 minutes early<br>
                • Save this email as your confirmation<br>
                • To cancel, contact us at least 24 hours in advance
              </p>
            </td></tr>
          </table>
          ` : ""}
          <p style="margin:32px 0 0;font-size:15px;color:#1a1f36;">
            We look forward to seeing you!<br>
            <strong>The Reserve Seat Team</strong>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} reserve-seat · Workshop reservation made simple</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authenticated, userId } = await verifyAuth(req);
    if (!authenticated || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { allowed, remaining } = await checkRateLimit(supabaseService, userId);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
          "X-RateLimit-Remaining": "0",
          "Retry-After": RATE_LIMIT_WINDOW_SECONDS.toString(),
          ...corsHeaders,
        },
      });
    }

    const body = await req.json();
    const { email, firstName, workshopTitle, workshopDate, status } = body as EmailRequest;

    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!firstName || typeof firstName !== "string" || firstName.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid first name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!workshopTitle || typeof workshopTitle !== "string" || workshopTitle.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid workshop title" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!workshopDate || typeof workshopDate !== "string") {
      return new Response(JSON.stringify({ error: "Invalid workshop date" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "Workshop <onboarding@resend.dev>",
      to: [email],
      subject: status === "confirmed"
        ? "🎉 Workshop Reservation Confirmed!"
        : "📋 Workshop Waitlist Confirmation",
      html: buildEmailHtml(firstName, workshopTitle, workshopDate, status || "confirmed"),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
