import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only admins can create client users
    const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, client_id, client_name, mode, user_id: existingUserId } = await req.json();

    // Mode: "create" or "update"
    if (mode === "update" && existingUserId) {
      // Update password for existing client user
      if (password) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
          password,
        });
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update email if changed
      if (email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
          email,
        });
        if (emailError) {
          return new Response(JSON.stringify({ error: emailError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await supabaseAdmin.from("profiles").update({ email }).eq("id", existingUserId);
      }

      return new Response(
        JSON.stringify({ success: true, user_id: existingUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create mode
    if (!email || !password || !client_id) {
      return new Response(JSON.stringify({ error: "email, password, and client_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign client role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "client",
    });

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      full_name: client_name || email,
      email,
      role: "client",
    });

    // Assign to client
    await supabaseAdmin.from("user_client_assignments").insert({
      user_id: newUser.user.id,
      client_id,
      assigned_by: userId,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
