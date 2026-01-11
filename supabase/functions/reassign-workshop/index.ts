import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 10 reassignments per minute per admin
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const FUNCTION_NAME = "reassign-workshop";

interface ReassignRequest {
  reservationId: string;
  targetWorkshopId: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  console.log("Reassign workshop request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supabaseAdmin } = await verifyAdminAuth(req);
    console.log("Admin verified:", userId);

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(supabaseAdmin, userId);
    
    if (!allowed) {
      console.warn(`Rate limit exceeded for admin ${userId} on ${FUNCTION_NAME}`);
      return new Response(
        JSON.stringify({ error: "Too many reassignment requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
            "X-RateLimit-Remaining": "0",
            "Retry-After": RATE_LIMIT_WINDOW_SECONDS.toString(),
          } 
        }
      );
    }

    // Parse and validate request body
    const body: ReassignRequest = await req.json();
    const { reservationId, targetWorkshopId } = body;

    if (!reservationId || !UUID_REGEX.test(reservationId)) {
      return new Response(
        JSON.stringify({ error: "Invalid reservation ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetWorkshopId || !UUID_REGEX.test(targetWorkshopId)) {
      return new Response(
        JSON.stringify({ error: "Invalid target workshop ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the reservation
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from("reservations")
      .select("*, workshops(date, title)")
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error("Reservation not found:", reservationError);
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceWorkshopId = reservation.workshop_id;

    if (sourceWorkshopId === targetWorkshopId) {
      return new Response(
        JSON.stringify({ error: "Reservation is already in this workshop" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch target workshop
    const { data: targetWorkshop, error: targetWorkshopError } = await supabaseAdmin
      .from("workshops")
      .select("*")
      .eq("id", targetWorkshopId)
      .single();

    if (targetWorkshopError || !targetWorkshop) {
      console.error("Target workshop not found:", targetWorkshopError);
      return new Response(
        JSON.stringify({ error: "Target workshop not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate: is user already registered in target workshop?
    const { data: existingReservation, error: duplicateError } = await supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("workshop_id", targetWorkshopId)
      .eq("email", reservation.email)
      .single();

    if (existingReservation) {
      return new Response(
        JSON.stringify({ error: "User already has a reservation in the target workshop" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count confirmed reservations in target workshop
    const { count: confirmedCount, error: countError } = await supabaseAdmin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("workshop_id", targetWorkshopId)
      .eq("status", "confirmed");

    if (countError) {
      console.error("Error counting reservations:", countError);
      throw new Error("Failed to check workshop capacity");
    }

    const currentConfirmed = confirmedCount || 0;
    const hasAvailableSeats = currentConfirmed < targetWorkshop.max_capacity;

    // Determine new status and seat number
    let newStatus: string;
    let newSeatNumber: number | null;

    if (hasAvailableSeats) {
      newStatus = "confirmed";
      newSeatNumber = currentConfirmed + 1;
    } else {
      newStatus = "waitlisted";
      newSeatNumber = null;
    }

    console.log(`Reassigning reservation ${reservationId} from ${sourceWorkshopId} to ${targetWorkshopId}`);
    console.log(`New status: ${newStatus}, new seat: ${newSeatNumber}`);

    // Update the reservation
    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({
        workshop_id: targetWorkshopId,
        status: newStatus,
        seat_number: newSeatNumber,
      })
      .eq("id", reservationId);

    if (updateError) {
      console.error("Error updating reservation:", updateError);
      throw new Error("Failed to update reservation");
    }

    // Log PII access
    await supabaseAdmin.from("pii_access_log").insert({
      admin_user_id: userId,
      action: "reassign_workshop",
      table_name: "reservations",
      record_count: 1,
      metadata: {
        reservation_id: reservationId,
        source_workshop_id: sourceWorkshopId,
        target_workshop_id: targetWorkshopId,
        previous_status: reservation.status,
        new_status: newStatus,
        previous_seat: reservation.seat_number,
        new_seat: newSeatNumber,
      },
    });

    console.log("Reservation reassigned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reservation reassigned successfully`,
        data: {
          reservationId,
          targetWorkshopId,
          newStatus,
          newSeatNumber,
          targetWorkshopDate: targetWorkshop.date,
          targetWorkshopTitle: targetWorkshop.title,
        },
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error("Reassign workshop error:", error);

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

    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(handler);