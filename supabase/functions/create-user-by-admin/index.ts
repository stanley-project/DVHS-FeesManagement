// supabase/functions/create-user-by-admin/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// You need to set SUPABASE_SERVICE_ROLE_KEY as a secret in Supabase
// `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { name, phone_number, role, email_suffix } = await req.json();

    // 1. Create user in auth.users using admin client (this enables OTP)
    // Note: For phone number logins without password, email is usually not required.
    // But if you use email as a fallback or for identification, generate one.
    const generatedEmail = `${phone_number}@${email_suffix || 'deepthischool.edu'}`;
    const password = Math.random().toString(36).slice(-8); // Generate a temporary password (optional, but good for admin.createUser)

    const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone: phone_number,
      email: generatedEmail, // Provide an email as well, even if not used for login, for Supabase internal consistency
      password: password, // A temporary password, users will use OTP anyway. Or remove if you enable passwordless specific signup in auth settings
      phone_confirm: true, // Auto-confirm phone number for OTP readiness
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newAuthUserId = authUserData.user!.id;
    const newAuthUserEmail = authUserData.user!.email; // Get the generated email


    return new Response(JSON.stringify({ success: true, userId: newAuthUserId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});