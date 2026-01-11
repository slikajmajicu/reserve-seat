import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration: 20 requests per minute per user (higher for auth checks)
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const FUNCTION_NAME = "verify-admin";

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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("verify-admin: No authorization header provided");
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token for auth verification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log("verify-admin: Invalid token", claimsError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    
    // Use service role client for rate limiting and role check
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(supabaseService, userId);
    
    if (!allowed) {
      console.warn(`Rate limit exceeded for user ${userId} on ${FUNCTION_NAME}`);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Too many requests" }),
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

    console.log(`verify-admin: Checking admin status for user ${userId}`);

    const { data: roleData, error: roleError } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("verify-admin: Error checking role", roleError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Failed to verify role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = !!roleData;
    console.log(`verify-admin: User ${userId} isAdmin: ${isAdmin}`);

    return new Response(
      JSON.stringify({ isAdmin }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        } 
      }
    );
  } catch (error) {
    console.error("verify-admin: Unexpected error", error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});