import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { proposal_id } = await req.json();
    if (!proposal_id) return new Response(JSON.stringify({ error: "missing proposal_id" }), { status: 400, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: p, error: pErr } = await admin
      .from("proposals")
      .select("id, user_id, client_name, accepted_name, total_value, currency")
      .eq("id", proposal_id)
      .maybeSingle();
    if (pErr || !p) {
      return new Response(JSON.stringify({ error: pErr?.message || "not found" }), { status: 404, headers: corsHeaders });
    }

    const title = `Proposta aceita: ${p.client_name}`;
    const who = p.accepted_name || "Cliente";
    const valueStr = p.total_value
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: p.currency || "BRL" }).format(Number(p.total_value))
      : "";
    const message = `${who} aceitou a proposta${valueStr ? ` (${valueStr})` : ""}.`;

    const { error: nErr } = await admin.from("admin_notifications").insert({
      user_id: p.user_id,
      type: "proposal_accepted",
      title,
      message,
      read: false,
    });
    if (nErr) {
      return new Response(JSON.stringify({ error: nErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
