import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  firstName: string;
  workshopTitle: string;
  workshopDate: string;
  status: string;
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
      console.error("Unauthorized request to send-confirmation-email");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    
    // Input validation
    const { email, firstName, workshopTitle, workshopDate } = body as EmailRequest;
    
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!firstName || typeof firstName !== 'string' || firstName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid first name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!workshopTitle || typeof workshopTitle !== 'string' || workshopTitle.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid workshop title" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!workshopDate || typeof workshopDate !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid workshop date" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs for HTML email
    const sanitize = (str: string) => str.replace(/[<>&"']/g, c => 
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );

    const subject = "Workshop Reservation Confirmed!";
    const htmlContent = `
      <h1>Congratulations, ${sanitize(firstName)}!</h1>
      <p>You have successfully reserved your place in the workshop.</p>
      <p><strong>Workshop:</strong> ${sanitize(workshopTitle)}</p>
      <p><strong>Date & Time:</strong> ${sanitize(workshopDate)}</p>
      <p>We look forward to seeing you!</p>
      <p>Best regards,<br>Workshop Team</p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Workshop <onboarding@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
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
