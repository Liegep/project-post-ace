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
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find invitation
    const { data: invitation, error: findError } = await supabaseAdmin
      .from("admin_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (findError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = invitation.role || "admin";
    const clientIds: string[] = invitation.client_ids || [];

    // Create user via admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      id: newUser.user.id,
      full_name: invitation.email.split("@")[0],
      email: invitation.email,
      role,
    });

    // Assign clients for team members
    if (role === "team_member" && clientIds.length > 0) {
      const assignments = clientIds.map((client_id: string) => ({
        user_id: newUser.user.id,
        client_id,
        assigned_by: invitation.invited_by,
      }));
      await supabaseAdmin.from("user_client_assignments").insert(assignments);
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ success: true, email: invitation.email, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
