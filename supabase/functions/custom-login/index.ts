import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { ...corsHeaders },
      status: 204,
    });
  }

  try {
    const { phone_number, login_code } = await req.json();

    if (!phone_number || !login_code) {
      return new Response(
        JSON.stringify({ error: "Phone number and login code are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Step 1: Look up the user in public.users table to get their email
    const { data: userRow, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('id, name, role, is_active, email, phone_number')
      .eq('phone_number', phone_number)
      .eq('is_active', true)
      .single();

    if (fetchErr || !userRow) {
      console.error("User lookup error:", fetchErr?.message || "User not found or inactive");
      return new Response(
        JSON.stringify({ error: "Invalid phone number or login code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Use email from database or generate dummy email if not present
    const dummyEmail = userRow.email || `${phone_number}@deepthischool.edu`;

    // Step 2: Sign in with Supabase Auth using dummy email + login_code as password
    const { data: authData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: dummyEmail,
      password: login_code,
    });

    if (signInErr) {
      console.error("Supabase Sign-in error:", signInErr);
      return new Response(
        JSON.stringify({ error: "Invalid phone number or login code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Step 3: Return the session & user profile
    return new Response(
      JSON.stringify({
        session: authData.session,
        user: authData.user,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});