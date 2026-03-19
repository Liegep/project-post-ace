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
      console.error("Claims error:", claimsError);
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

    const { email, password, full_name, client_ids } = await req.json();
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "email, password, and full_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user (or reuse existing orphaned auth user)
    let targetUserId: string;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // If user already exists, find and reuse them
      if (createError.message.includes("already been registered")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
        targetUserId = existingUser.id;

        // Clean up old data
        await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("user_client_assignments").delete().eq("user_id", targetUserId);
        await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      targetUserId = newUser.user.id;
    }

    // Assign admin (carteira) role
    await supabaseAdmin.from("user_roles").insert({
      user_id: targetUserId,
      role: "admin",
    });

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      id: targetUserId,
      full_name,
      email,
      role: "admin",
    });

    // Assign clients if provided
    if (client_ids && Array.isArray(client_ids) && client_ids.length > 0) {
      const assignments = client_ids.map((client_id: string) => ({
        user_id: targetUserId,
        client_id,
        assigned_by: userId,
      }));
      await supabaseAdmin.from("user_client_assignments").insert(assignments);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
