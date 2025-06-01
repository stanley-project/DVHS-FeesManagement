// supabase/functions/login-with-code/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { phone_number, login_code } = await req.json();

    // Basic validation
    if (!phone_number || !login_code) {
      return new Response(
        JSON.stringify({ error: "Phone number and login code are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user exists and login code matches
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("login_code", login_code)
      .eq("is_active", true)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number or login code" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate session using admin auth client with the user's ID
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.signInWithUser({
      userId: userData.id,
      properties: {
        role: userData.role,
      },
    });

    if (sessionError) {
      return new Response(
        JSON.stringify({ error: "Failed to create session", details: sessionError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userData.id,
          name: userData.name,
          phone_number: userData.phone_number,
          email: userData.email,
          role: userData.role,
        },
        session: sessionData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});