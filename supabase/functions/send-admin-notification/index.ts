import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  
  if (error || !user) {
    return { authenticated: false };
  }

  return { authenticated: true, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { authenticated } = await verifyAuth(req);
    if (!authenticated) {
      console.error("Unauthorized request to send-admin-notification");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const data = body as NotificationRequest;
    
    // Input validation
    if (!data.email || typeof data.email !== 'string' || !data.email.includes('@') || data.email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid first name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid last name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!data.phoneNumber || typeof data.phoneNumber !== 'string' || data.phoneNumber.length > 30) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!data.city || typeof data.city !== 'string' || data.city.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid city" }),
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

    // Sanitize inputs for HTML email
    const sanitize = (str: string) => str.replace(/[<>&"']/g, c => 
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );

    const seatInfo = data.seatNumber 
      ? `<p><strong>Seat Number:</strong> ${data.seatNumber}</p>`
      : "";

    const emailResponse = await resend.emails.send({
      from: "Workshop Notifications <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `New Workshop Reservation - ${sanitize(data.firstName)} ${sanitize(data.lastName)}`,
      html: `
        <h1>New Workshop Reservation Received</h1>
        <h2>Participant Details:</h2>
        <p><strong>Name:</strong> ${sanitize(data.firstName)} ${sanitize(data.lastName)}</p>
        <p><strong>Email:</strong> ${sanitize(data.email)}</p>
        <p><strong>Phone:</strong> ${sanitize(data.phoneNumber)}</p>
        <p><strong>City:</strong> ${sanitize(data.city)}</p>
        <p><strong>T-Shirt Option:</strong> ${sanitize(data.tshirtOption || '')}</p>
        <hr>
        <h2>Workshop Information:</h2>
        <p><strong>Title:</strong> ${sanitize(data.workshopTitle || '')}</p>
        <p><strong>Date & Time:</strong> ${sanitize(data.workshopDate || '')}</p>
        <p><strong>Status:</strong> ${sanitize((data.status || '').toUpperCase())}</p>
        ${seatInfo}
        <hr>
        <p><a href="${Deno.env.get("VITE_SUPABASE_URL") || "your-app-url"}/admin">View in Admin Dashboard</a></p>
      `,
    });

    console.log("Admin notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification:", error);
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
