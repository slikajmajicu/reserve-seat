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
const FUNCTION_NAME = "send-admin-notification";

interface NotificationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  tshirtOption: string;
  workshopTitle: string;
  workshopDate: string;
  status: string;
  seatNumber?: number;
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

const buildAdminEmailHtml = (data: NotificationRequest) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Montserrat',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background-color:#1a1f36;padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><h1 style="color:#ffffff;margin:0;font-size:20px;">reserve-seat</h1></td>
              <td style="text-align:right;">
                <span style="background-color:${data.status === "confirmed" ? "#059669" : "#d97706"};color:#ffffff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${sanitize(data.status.toUpperCase())}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="color:#1a1f36;margin:0 0 24px;font-size:20px;">📩 New Workshop Reservation</h2>
          <!-- Participant -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:20px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Participant Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;width:35%;">👤 Name</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(data.firstName)} ${sanitize(data.lastName)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">✉️ Email</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;">${sanitize(data.email)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">📱 Phone</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;">${sanitize(data.phoneNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 City</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;">${sanitize(data.city)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">👕 T-Shirt</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;">${sanitize(data.tshirtOption === "own" ? "Bringing own" : "Buy on-site")}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <!-- Workshop -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Workshop Information</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;width:35%;">📚 Title</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(data.workshopTitle || "")}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">📅 Date &amp; Time</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${sanitize(data.workshopDate || "")}</td>
                </tr>
                ${data.seatNumber ? `
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#6b7280;">💺 Seat #</td>
                  <td style="padding:6px 0;font-size:14px;color:#1a1f36;font-weight:600;">${data.seatNumber}</td>
                </tr>` : ""}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} reserve-seat · Admin Notification</p>
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
    const data = body as NotificationRequest;

    if (!data.email || typeof data.email !== "string" || !data.email.includes("@") || data.email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!data.firstName || typeof data.firstName !== "string" || data.firstName.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid first name" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!data.lastName || typeof data.lastName !== "string" || data.lastName.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid last name" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!data.phoneNumber || typeof data.phoneNumber !== "string" || data.phoneNumber.length > 30) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!data.city || typeof data.city !== "string" || data.city.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid city" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "Workshop Notifications <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `📩 New Reservation - ${sanitize(data.firstName)} ${sanitize(data.lastName)} · ${sanitize(data.workshopTitle || "Workshop")}`,
      html: buildAdminEmailHtml(data),
    });

    console.log("Admin notification sent:", emailResponse);

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
    console.error("Error in send-admin-notification:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
