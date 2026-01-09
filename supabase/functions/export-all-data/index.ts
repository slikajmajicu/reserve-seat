import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "https://esm.sh/exceljs@4.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdminAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);

  if (claimsError || !claimsData?.claims) {
    throw new Error("Invalid token");
  }

  const userId = claimsData.claims.sub;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  if (roleError || !roleData) {
    throw new Error("Forbidden: Admin access required");
  }

  return { userId, supabaseAdmin };
}

async function handler(req: Request): Promise<Response> {
  console.log("Export all data request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supabaseAdmin } = await verifyAdminAuth(req);
    console.log("Admin verified:", userId);

    // Fetch all workshops
    const { data: workshops, error: workshopsError } = await supabaseAdmin
      .from("workshops")
      .select("*")
      .order("date", { ascending: false });

    if (workshopsError) {
      console.error("Error fetching workshops:", workshopsError);
      throw new Error("Failed to fetch workshops");
    }

    // Fetch all reservations with workshop details
    const { data: reservations, error: reservationsError } = await supabaseAdmin
      .from("reservations")
      .select("*, workshops(date, title, start_time)")
      .order("reservation_timestamp", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      throw new Error("Failed to fetch reservations");
    }

    // Log PII access
    await supabaseAdmin.from("pii_access_log").insert({
      admin_user_id: userId,
      action: "export_all_data",
      table_name: "workshops,reservations",
      record_count: (workshops?.length || 0) + (reservations?.length || 0),
      metadata: { 
        workshops_count: workshops?.length || 0,
        reservations_count: reservations?.length || 0
      },
    });

    console.log("PII access logged, generating Excel file");

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Workshop Admin";
    workbook.created = new Date();

    // Sheet 1: Workshops
    const workshopsSheet = workbook.addWorksheet("Workshops");
    workshopsSheet.columns = [
      { header: "ID", key: "id", width: 40 },
      { header: "Title", key: "title", width: 30 },
      { header: "Date", key: "date", width: 15 },
      { header: "Start Time", key: "start_time", width: 12 },
      { header: "Max Capacity", key: "max_capacity", width: 15 },
      { header: "Reserved Count", key: "reserved_count", width: 15 },
      { header: "Available Seats", key: "available", width: 15 },
      { header: "Active", key: "is_active", width: 10 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    workshopsSheet.getRow(1).font = { bold: true };
    workshopsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    workshopsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    workshops?.forEach((workshop) => {
      workshopsSheet.addRow({
        id: workshop.id,
        title: workshop.title || "Workshop Session",
        date: workshop.date,
        start_time: workshop.start_time || "N/A",
        max_capacity: workshop.max_capacity,
        reserved_count: workshop.reserved_count,
        available: workshop.max_capacity - workshop.reserved_count,
        is_active: workshop.is_active ? "Yes" : "No",
        created_at: new Date(workshop.created_at).toLocaleString(),
      });
    });

    // Sheet 2: Reservations
    const reservationsSheet = workbook.addWorksheet("Reservations");
    reservationsSheet.columns = [
      { header: "ID", key: "id", width: 40 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone Number", key: "phone_number", width: 18 },
      { header: "City", key: "city", width: 15 },
      { header: "T-Shirt Option", key: "tshirt_option", width: 18 },
      { header: "Workshop Title", key: "workshop_title", width: 25 },
      { header: "Workshop Date", key: "workshop_date", width: 15 },
      { header: "Workshop Time", key: "workshop_time", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Seat Number", key: "seat_number", width: 12 },
      { header: "Reservation Timestamp", key: "reservation_timestamp", width: 22 },
    ];

    reservationsSheet.getRow(1).font = { bold: true };
    reservationsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF70AD47" },
    };
    reservationsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    reservations?.forEach((reservation: any) => {
      reservationsSheet.addRow({
        id: reservation.id,
        name: `${reservation.first_name} ${reservation.last_name}`,
        email: reservation.email,
        phone_number: reservation.phone_number,
        city: reservation.city,
        tshirt_option: reservation.tshirt_option === "own" ? "Own" : "Buy on-site",
        workshop_title: reservation.workshops?.title || "Workshop Session",
        workshop_date: reservation.workshops?.date,
        workshop_time: reservation.workshops?.start_time || "N/A",
        status: reservation.status,
        seat_number: reservation.seat_number || "N/A",
        reservation_timestamp: new Date(reservation.reservation_timestamp).toLocaleString(),
      });
    });

    // Sheet 3: Summary
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 35 },
      { header: "Value", key: "value", width: 20 },
    ];

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFED7D31" },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    const confirmedCount = reservations?.filter((r: any) => r.status === "confirmed").length || 0;
    const waitlistedCount = reservations?.filter((r: any) => r.status === "waitlisted").length || 0;
    const activeWorkshops = workshops?.filter((w: any) => w.is_active).length || 0;
    const totalCapacity = workshops?.reduce((sum: number, w: any) => sum + w.max_capacity, 0) || 0;
    const totalReserved = workshops?.reduce((sum: number, w: any) => sum + w.reserved_count, 0) || 0;

    summarySheet.addRow({ metric: "Total Workshops", value: workshops?.length || 0 });
    summarySheet.addRow({ metric: "Active Workshops", value: activeWorkshops });
    summarySheet.addRow({ metric: "Total Reservations", value: reservations?.length || 0 });
    summarySheet.addRow({ metric: "Confirmed Reservations", value: confirmedCount });
    summarySheet.addRow({ metric: "Waitlisted Reservations", value: waitlistedCount });
    summarySheet.addRow({ metric: "Total Capacity (All Workshops)", value: totalCapacity });
    summarySheet.addRow({ metric: "Total Reserved (All Workshops)", value: totalReserved });
    summarySheet.addRow({ metric: "Overall Availability", value: totalCapacity - totalReserved });
    summarySheet.addRow({ metric: "Export Date", value: new Date().toLocaleString() });
    summarySheet.addRow({ metric: "Exported By", value: userId });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    console.log("Excel file generated successfully");

    const filename = `workshop-data-export-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export all data error:", error);

    if (error.message === "Unauthorized") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (error.message === "Forbidden: Admin access required") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(handler);
