import { createClient } from "npm:@supabase/supabase-js@2";
 
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
    // This client bypasses RLS and can access auth.users directly
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Validate credentials against public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, role, is_active, login_code')
      .eq('phone_number', phone_number)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      console.error("User lookup error:", userError?.message || "User not found or inactive");
      return new Response(
        JSON.stringify({ error: "Invalid phone number or login code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Compare the provided login_code with the stored login_code
    // Note: For production, you should hash and compare the login_code securely.
    // For this example, we assume login_code in public.users is plain text.
    if (userData.login_code !== login_code) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number or login code" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const dummyEmail = userData.email || `${phone_number}@deepthischool.edu`; // Use actual email if exists, else dummy

    // 2. Sign in with Supabase Auth using dummy email + login_code
    const { data: authData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: dummyEmail,
      password: login_code,
    });

    if (signInErr) {
      console.error("Supabase Sign-in error:", signInErr);
      return new Response(
        JSON.stringify({ error: signInErr.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    // Return the session & user profile
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