import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, profileDescription, customPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Du bist ein Outreach-Assistent. Du analysierst LinkedIn-Profil-Screenshots.

Deine Aufgaben:
1. Extrahiere den vollständigen Namen der Person aus dem Screenshot. Sei sehr genau.
2. Generiere genau 5 kurze, personalisierte Icebreaker-Sätze basierend auf dem Profil.

${profileDescription ? `Kontext zum Absender: ${profileDescription}` : ""}

Die Icebreaker sollen:
- Sich auf konkrete Infos aus dem Profil beziehen (Position, Unternehmen, Posts, etc.)
- Natürlich und nicht zu förmlich klingen
- Maximal 1-2 Sätze lang sein
- Variiert sein (verschiedene Aspekte des Profils ansprechen)`;

    const userPrompt = customPrompt
      ? `Analysiere dieses LinkedIn-Profil und generiere Icebreaker mit folgendem Fokus: ${customPrompt}`
      : "Analysiere dieses LinkedIn-Profil und generiere 5 personalisierte Icebreaker.";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_profile_data",
                description:
                  "Extract name and generate icebreakers from a LinkedIn profile screenshot.",
                parameters: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Full name of the person from the LinkedIn profile",
                    },
                    icebreakers: {
                      type: "array",
                      items: { type: "string" },
                      description: "Exactly 5 personalized icebreaker sentences",
                    },
                  },
                  required: ["name", "icebreakers"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_profile_data" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte lade Credits nach." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("Unexpected AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Unerwartete AI-Antwort" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ name: parsed.name, icebreakers: parsed.icebreakers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
