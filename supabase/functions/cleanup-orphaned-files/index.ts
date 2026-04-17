import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);

    // Authorization: only admins may run this
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let isAdmin = false;
    if (token && token !== key) {
      const { data: userRes } = await supabase.auth.getUser(token);
      const uid = userRes?.user?.id;
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        isAdmin = !!roles?.some((r: any) =>
          ["super_admin", "admin"].includes(r.role)
        );
      }
    } else if (token === key) {
      isAdmin = true; // service-role direct call (cron)
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun: boolean = body.dryRun ?? false;
    const olderThanHours: number = body.olderThanHours ?? 24;

    // List orphans
    const { data: orphans, error: listErr } = await supabase.rpc(
      "list_orphaned_media_files",
      { older_than_hours: olderThanHours }
    );
    if (listErr) throw listErr;

    const totalSize = (orphans || []).reduce(
      (acc: number, o: any) => acc + Number(o.size || 0),
      0
    );

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          orphanCount: orphans?.length ?? 0,
          totalBytes: totalSize,
          sample: (orphans || []).slice(0, 10),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: deleted, error: delErr } = await supabase.rpc(
      "delete_orphaned_media_files",
      { older_than_hours: olderThanHours }
    );
    if (delErr) throw delErr;

    return new Response(
      JSON.stringify({
        deleted,
        freedBytes: totalSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cleanup-orphaned-files error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
