import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CapacityAlertRequest {
  workshopId: string;
  workshopDate: string;
}

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
    const { authenticated, isAdmin } = await verifyAdminAuth(req);
    if (!authenticated) {
      console.error("Unauthorized request to send-capacity-alert");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAdmin) {
      console.error("Non-admin user attempted to trigger capacity alert");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { workshopId, workshopDate }: CapacityAlertRequest = await req.json();

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL not configured");
      return new Response(
        JSON.stringify({ error: "Admin email not configured" }),
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
      subject: `Workshop Full - ${workshopDate}`,
      html: `
        <h1>Workshop Capacity Reached</h1>
        <p>The workshop scheduled for <strong>${workshopDate}</strong> has reached its maximum capacity of 10 confirmed participants.</p>
        <p>Please find the attached Excel file with all confirmed participants.</p>
        <h2>Summary:</h2>
        <p><strong>Workshop Date:</strong> ${workshopDate}</p>
        <p><strong>Confirmed Participants:</strong> ${reservations?.length || 0}</p>
        <hr>
        <p><a href="${Deno.env.get("VITE_SUPABASE_URL") || "your-app-url"}/admin">View in Admin Dashboard</a></p>
      `,
      attachments: [
        {
          filename: `workshop_${workshopDate}_participants.csv`,
          content: csvBase64,
        },
      ],
    });

    console.log("Capacity alert sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-capacity-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
