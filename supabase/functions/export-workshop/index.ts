import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import ExcelJS from "npm:exceljs@4.4.0";

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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reservations");

    // Define columns
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone Number", key: "phone", width: 20 },
      { header: "City", key: "city", width: 20 },
      { header: "Bringing Own Shirt", key: "shirt", width: 20 },
      { header: "Workshop", key: "workshop", width: 30 },
      { header: "Date", key: "date", width: 15 },
      { header: "Timestamp", key: "timestamp", width: 25 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows
    reservations?.forEach((r: any) => {
      worksheet.addRow({
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        phone: r.phone_number,
        city: r.city,
        shirt: r.tshirt_option === "own" ? "YES" : "NO",
        workshop: `Workshop ${new Date(r.workshops.date).toLocaleDateString()}`,
        date: new Date(r.workshops.date).toLocaleDateString(),
        timestamp: new Date(r.reservation_timestamp).toLocaleString(),
      });
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    console.log("Generated Excel with", reservations?.length, "rows");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reservations.xlsx"`,
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
