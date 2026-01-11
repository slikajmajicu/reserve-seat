import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 5 capacity alerts per minute per admin
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const FUNCTION_NAME = "send-capacity-alert";

interface CapacityAlertRequest {
  workshopId: string;
  workshopDate: string;
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

const verifyAdminAuth = async (req: Request): Promise<{ authenticated: boolean; isAdmin: boolean; userId?: string }> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, isAdmin: false };
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { authenticated: false, isAdmin: false };
  }

  // Verify admin role using service role key
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: roleData } = await supabaseService
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return { authenticated: true, isAdmin: !!roleData, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication and admin role
    const { authenticated, isAdmin, userId } = await verifyAdminAuth(req);
    if (!authenticated) {
      console.error("Unauthorized request to send-capacity-alert");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAdmin || !userId) {
      console.error("Non-admin user attempted to trigger capacity alert");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check rate limit
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { allowed, remaining } = await checkRateLimit(supabaseService, userId);
    
    if (!allowed) {
      console.warn(`Rate limit exceeded for admin ${userId} on ${FUNCTION_NAME}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
            "X-RateLimit-Remaining": "0",
            "Retry-After": RATE_LIMIT_WINDOW_SECONDS.toString(),
            ...corsHeaders 
          } 
        }
      );
    }

    const body = await req.json();
    const { workshopId, workshopDate } = body as CapacityAlertRequest;
    
    // Input validation - workshopId should be a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!workshopId || typeof workshopId !== 'string' || !uuidRegex.test(workshopId)) {
      return new Response(
        JSON.stringify({ error: "Invalid workshop ID" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!workshopDate || typeof workshopDate !== 'string' || workshopDate.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid workshop date" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role for data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all confirmed participants for this workshop
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("workshop_id", workshopId)
      .eq("status", "confirmed")
      .order("seat_number");

    if (error) {
      throw error;
    }

    // Sanitize for email
    const sanitize = (str: string) => str.replace(/[<>&"']/g, c => 
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );

    // Generate CSV content
    const csvHeader = "Seat Number,First Name,Last Name,Email,Phone Number,City,T-Shirt Option\n";
    const csvRows = reservations?.map(r => 
      `${r.seat_number},"${r.first_name}","${r.last_name}","${r.email}","${r.phone_number}","${r.city}","${r.tshirt_option}"`
    ).join("\n") || "";
    
    // Add UTF-8 BOM for Excel compatibility
    const csv = "\uFEFF" + csvHeader + csvRows;
    const csvBase64 = btoa(unescape(encodeURIComponent(csv)));

    // Send email with CSV attachment
    const emailResponse = await resend.emails.send({
      from: "Workshop Notifications <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Workshop Full - ${sanitize(workshopDate)}`,
      html: `
        <h1>Workshop Capacity Reached</h1>
        <p>The workshop scheduled for <strong>${sanitize(workshopDate)}</strong> has reached its maximum capacity of 10 confirmed participants.</p>
        <p>Please find the attached Excel file with all confirmed participants.</p>
        <h2>Summary:</h2>
        <p><strong>Workshop Date:</strong> ${sanitize(workshopDate)}</p>
        <p><strong>Confirmed Participants:</strong> ${reservations?.length || 0}</p>
        <hr>
        <p><a href="${Deno.env.get("VITE_SUPABASE_URL") || "your-app-url"}/admin">View in Admin Dashboard</a></p>
      `,
      attachments: [
        {
          filename: `workshop_${workshopDate.replace(/[^a-zA-Z0-9]/g, '_')}_participants.csv`,
          content: csvBase64,
        },
      ],
    });

    console.log("Capacity alert sent:", emailResponse);

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
    console.error("Error in send-capacity-alert:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);