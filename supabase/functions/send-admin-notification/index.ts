import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  workshopDate: string;
  status: string;
  seatNumber?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();

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

    const seatInfo = data.seatNumber 
      ? `<p><strong>Seat Number:</strong> ${data.seatNumber}</p>`
      : "";

    const emailResponse = await resend.emails.send({
      from: "Workshop Notifications <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `New Workshop Reservation - ${data.firstName} ${data.lastName}`,
      html: `
        <h1>New Workshop Reservation Received</h1>
        <h2>Participant Details:</h2>
        <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phoneNumber}</p>
        <p><strong>City:</strong> ${data.city}</p>
        <p><strong>T-Shirt Option:</strong> ${data.tshirtOption}</p>
        <hr>
        <h2>Workshop Information:</h2>
        <p><strong>Date:</strong> ${data.workshopDate}</p>
        <p><strong>Status:</strong> ${data.status.toUpperCase()}</p>
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
