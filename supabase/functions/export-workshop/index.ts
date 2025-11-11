import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  workshopId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workshopId }: ExportRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching reservations for workshop:", workshopId);

    const { data: reservations, error } = await supabaseClient
      .from("reservations")
      .select("*, workshops(date)")
      .eq("workshop_id", workshopId)
      .order("seat_number", { ascending: true });

    if (error) throw error;

    console.log("Found reservations:", reservations?.length);

    // Generate CSV format (simple Excel-compatible format)
    const headers = [
      "Seat Number",
      "First Name",
      "Last Name",
      "Email",
      "Phone Number",
      "City",
      "T-shirt Option",
      "Status",
      "Reservation Time",
    ];

    const rows = reservations?.map((r: any) => [
      r.seat_number || "-",
      r.first_name,
      r.last_name,
      r.email,
      r.phone_number,
      r.city,
      r.tshirt_option === "own" ? "Bringing own" : "Buy on-site",
      r.status,
      new Date(r.reservation_timestamp).toLocaleString(),
    ]) || [];

    // Create CSV content with UTF-8 BOM for Excel compatibility
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    console.log("Generated CSV with", rows.length, "rows");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="workshop-reservations.csv"`,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in export-workshop function:", error);
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
