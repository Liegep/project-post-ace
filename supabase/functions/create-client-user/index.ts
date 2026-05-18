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

    const body = await req.json();
    const rawEmail = body.email;
    const password = body.password;
    const client_id = body.client_id;
    const client_name = body.client_name;
    const mode = body.mode;
    const existingUserId = body.user_id;

    // Normalize email: trim, lowercase, strip invisible/zero-width chars
    const email = typeof rawEmail === "string"
      ? rawEmail.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF\s]/g, "")
      : rawEmail;

    // Validate email format before hitting auth API (gives clearer error message)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: `E-mail inválido: "${rawEmail}". Verifique se não há espaços, vírgulas ou caracteres especiais.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Check if user already exists — paginate through all auth users
    // (default listUsers page size is 50, which misses existing users beyond page 1)
    let existingUser: any = null;
    const normalizedEmail = String(email).trim().toLowerCase();

    // First try via profiles table (fast path)
    const { data: existingProfileByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (existingProfileByEmail?.id) {
      const { data: userById } = await supabaseAdmin.auth.admin.getUserById(existingProfileByEmail.id);
      if (userById?.user) existingUser = userById.user;
    }

    // Fallback: paginate auth users (handles users without a profile row)
    if (!existingUser) {
      for (let page = 1; page <= 20; page++) {
        const { data: pageData, error: pageErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (pageErr) break;
        const match = pageData?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
        if (match) { existingUser = match; break; }
        if (!pageData?.users || pageData.users.length < 200) break;
      }
    }

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;

      // Update password
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password });

      // Ensure client role exists
      const { data: hasClientRole } = await supabaseAdmin.rpc("has_role", {
        _user_id: targetUserId,
        _role: "client",
      });
      if (!hasClientRole) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: targetUserId,
          role: "client",
        });
      }

      // Ensure profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();
      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          id: targetUserId,
          full_name: client_name || email,
          email,
          role: "client",
        });
      }

      // Check if assignment already exists
      const { data: existingAssignment } = await supabaseAdmin
        .from("user_client_assignments")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("client_id", client_id)
        .maybeSingle();
      if (!existingAssignment) {
        await supabaseAdmin.from("user_client_assignments").insert({
          user_id: targetUserId,
          client_id,
          assigned_by: userId,
        });
      }
    } else {
      // Create new auth user
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

      targetUserId = newUser.user.id;

      await supabaseAdmin.from("user_roles").insert({
        user_id: targetUserId,
        role: "client",
      });

      await supabaseAdmin.from("profiles").insert({
        id: targetUserId,
        full_name: client_name || email,
        email,
        role: "client",
      });

      await supabaseAdmin.from("user_client_assignments").insert({
        user_id: targetUserId,
        client_id,
        assigned_by: userId,
      });
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
