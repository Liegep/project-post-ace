import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_id, title, description, exclude_brief_id } = await req.json();

    if (!client_id || !title) {
      return new Response(JSON.stringify({ error: "client_id and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing briefs for this client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("content_briefs")
      .select("id, title, description, status, created_at, content_type")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (exclude_brief_id) {
      query = query.neq("id", exclude_brief_id);
    }

    const { data: existingBriefs, error: dbError } = await query;
    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existingBriefs || existingBriefs.length === 0) {
      return new Response(JSON.stringify({
        similarity_level: "new",
        similarity_percent: 0,
        similar_briefs: [],
        suggestions: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to analyze similarity
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const briefsList = existingBriefs.map((b: any) => ({
      id: b.id,
      title: b.title,
      description: (b.description || "").substring(0, 200),
      status: b.status,
      content_type: b.content_type,
      created_at: b.created_at,
    }));

    const systemPrompt = `Você é um assistente que analisa similaridade entre pautas de conteúdo para mídias sociais.
Você recebe uma NOVA pauta (título e descrição) e uma LISTA de pautas existentes do mesmo cliente.
Sua tarefa é:
1. Determinar a porcentagem de similaridade (0-100) considerando tema, palavras-chave e intenção.
2. Identificar as pautas mais semelhantes (máximo 3).
3. Se a similaridade for >= 30%, sugerir 3-4 variações criativas (novo ângulo, formato diferente, abordagem alternativa, variação de título).

Responda SEMPRE usando a função analyze_similarity.`;

    const userPrompt = `NOVA PAUTA:
Título: ${title}
Descrição: ${description || "(sem descrição)"}

PAUTAS EXISTENTES DO CLIENTE:
${JSON.stringify(briefsList, null, 2)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_similarity",
              description: "Return the similarity analysis result",
              parameters: {
                type: "object",
                properties: {
                  similarity_percent: {
                    type: "number",
                    description: "Overall similarity percentage 0-100",
                  },
                  similar_briefs: {
                    type: "array",
                    description: "Top similar briefs (max 3)",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        similarity_reason: { type: "string", description: "Brief reason why it's similar" },
                      },
                      required: ["id", "title", "similarity_reason"],
                      additionalProperties: false,
                    },
                  },
                  suggestions: {
                    type: "array",
                    description: "Creative variation suggestions (only if similarity >= 30%)",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["angle", "format", "title", "approach"] },
                        text: { type: "string", description: "The suggestion text" },
                      },
                      required: ["type", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["similarity_percent", "similar_briefs", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_similarity" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({
        similarity_level: "new",
        similarity_percent: 0,
        similar_briefs: [],
        suggestions: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const pct = result.similarity_percent || 0;

    // Enrich similar briefs with date and status from DB
    const enrichedSimilar = (result.similar_briefs || []).map((sb: any) => {
      const dbBrief = existingBriefs.find((b: any) => b.id === sb.id);
      return {
        ...sb,
        status: dbBrief?.status || "draft",
        content_type: dbBrief?.content_type || "",
        created_at: dbBrief?.created_at || "",
      };
    });

    return new Response(JSON.stringify({
      similarity_level: pct < 30 ? "new" : pct < 70 ? "similar" : "very_similar",
      similarity_percent: pct,
      similar_briefs: enrichedSimilar,
      suggestions: result.suggestions || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
