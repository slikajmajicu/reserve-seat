import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  firstName: string;
  workshopDate: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, workshopDate, status }: EmailRequest = await req.json();

    console.log("Sending confirmation email to:", email);

    const subject =
      status === "confirmed"
        ? "Workshop Reservation Confirmed"
        : "You're on the Waitlist";

    const htmlContent =
      status === "confirmed"
        ? `
        <h1>Welcome, ${firstName}!</h1>
        <p>You have successfully reserved your place for the workshop on <strong>${workshopDate}</strong>.</p>
        <h2>What to expect:</h2>
        <ul>
          <li>Check-in starts 15 minutes before the workshop</li>
          <li>All materials will be provided</li>
          <li>Feel free to bring your creativity!</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>See you soon!<br>The Workshop Team</p>
      `
        : `
        <h1>Thank you, ${firstName}!</h1>
        <p>The workshop on <strong>${workshopDate}</strong> is currently full.</p>
        <p>We've added you to our waitlist, and we'll notify you immediately if a spot becomes available.</p>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>The Workshop Team</p>
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
