// Parses an Instagram insights screenshot and extracts the 6 standard metrics.
// Uses Lovable AI Gateway (Gemini) for OCR + structured extraction.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um extrator de métricas de prints do painel "Insights" do Instagram (versão web).
Receberá uma imagem que pode conter os cards: Visualizações, Alcance, Interações com o conteúdo, Visitas (ao perfil), Cliques no link, Seguidores.

Para cada card extraia:
- valor atual (número absoluto, sem abreviar — "141,9 mil" => 141900, "1,7 mil" => 1700, "2,1 mil" => 2100, "304" => 304)
- variação percentual (positiva ou negativa, ex: "58,7%" => 58.7, "↓ 21,4%" => -21.4)

Devolva APENAS JSON no formato:
{
  "views": { "current": number|null, "delta_pct": number|null },
  "reach": { "current": number|null, "delta_pct": number|null },
  "content_interactions": { "current": number|null, "delta_pct": number|null },
  "profile_visits": { "current": number|null, "delta_pct": number|null },
  "link_clicks": { "current": number|null, "delta_pct": number|null },
  "followers": { "current": number|null, "delta_pct": number|null }
}

Se um card não estiver visível, use null. Não invente valores. Não adicione comentários.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, image_base64 } = await req.json();
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imagePart = image_base64
      ? { type: "image_url", image_url: { url: `data:image/png;base64,${image_base64}` } }
      : { type: "image_url", image_url: { url: image_url } };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia as métricas deste print." },
              imagePart,
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes na Lovable AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, { current: number | null; delta_pct: number | null }> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to recover JSON from possible code-fenced response
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const metrics: Record<string, number> = {};
    const prevMetrics: Record<string, number> = {};
    for (const key of ["views", "reach", "content_interactions", "profile_visits", "link_clicks", "followers"]) {
      const entry = parsed[key];
      if (entry && typeof entry.current === "number") {
        metrics[key] = entry.current;
        if (typeof entry.delta_pct === "number") {
          // Reconstruct previous value: current / (1 + delta/100). delta is %.
          const prev = entry.delta_pct === -100
            ? 0
            : entry.current / (1 + entry.delta_pct / 100);
          if (Number.isFinite(prev) && prev >= 0) prevMetrics[key] = Math.round(prev);
        }
      }
    }

    return new Response(
      JSON.stringify({ metrics, previous_metrics: prevMetrics, raw: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("parse-instagram-screenshot failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
