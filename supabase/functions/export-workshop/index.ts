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

const verifyAdminAuth = async (req: Request): Promise<{ authenticated: boolean; isAdmin: boolean; userId?: string }> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, isAdmin: false };
  }

  const token = authHeader.replace("Bearer ", "");
  
  // First verify the user with anon key
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  
  if (error || !user) {
    return { authenticated: false, isAdmin: false };
  }

  // Use service role to check admin status (bypasses RLS)
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: roleData, error: roleError } = await supabaseService
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("Error checking admin role:", roleError);
    return { authenticated: true, isAdmin: false, userId: user.id };
  }

  return { authenticated: true, isAdmin: !!roleData, userId: user.id };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication AND admin role
    const { authenticated, isAdmin, userId } = await verifyAdminAuth(req);
    
    if (!authenticated) {
      console.error("Unauthorized request to export-workshop");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isAdmin) {
      console.error("Non-admin user attempted to export workshop data");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { workshopId }: ExportRequest = await req.json();
    console.log("Received workshopId:", workshopId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching reservations for workshop:", workshopId);

    const { data: reservations, error } = await supabaseClient
      .from("reservations")
      .select("*, workshops(date, title, start_time)")
      .eq("workshop_id", workshopId)
      .order("seat_number", { ascending: true });

    if (error) throw error;

    console.log("Found reservations:", reservations?.length);

    // Log PII access for audit trail
    if (userId && reservations && reservations.length > 0) {
      await supabaseClient
        .from("pii_access_log")
        .insert({
          admin_user_id: userId,
          action: "reservations_export",
          table_name: "reservations",
          record_count: reservations.length,
          metadata: { workshop_id: workshopId }
        });
      console.log("PII access logged for admin:", userId);
    }

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
      { header: "Workshop Title", key: "workshop_title", width: 30 },
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 15 },
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
      const time = r.workshops.start_time
        ? new Date(`2000-01-01T${r.workshops.start_time}`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "-";

      worksheet.addRow({
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        phone: r.phone_number,
        city: r.city,
        shirt: r.tshirt_option === "own" ? "YES" : "NO",
        workshop_title: r.workshops.title || "Workshop Session",
        date: new Date(r.workshops.date).toLocaleDateString(),
        time: time,
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
