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
    const { imageUrl, profileText, profileDescription, customPrompt } = await req.json();

    // Determine which AI provider to use
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (OPENAI_API_KEY) {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      apiKey = OPENAI_API_KEY;
      model = "gpt-4o";
    } else if (LOVABLE_API_KEY) {
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = LOVABLE_API_KEY;
      model = "google/gemini-2.5-flash";
    } else {
      throw new Error("Kein AI-Key konfiguriert (OPENAI_API_KEY oder LOVABLE_API_KEY)");
    }

    const systemPrompt = `Du bist ein Outreach-Assistent. Du kriegst ein Bild oder einen Ausschnitt aus dem LinkedIn Profil der Person.

Deine Aufgaben:
1. Extrahiere den Vornamen der Person
2. Generiere genau 5 kurze Icebreaker (1-2 Sätze, MAX 3 Sätze)

${profileDescription ? `Kontext zum Absender: ${profileDescription}` : ""}

WICHTIG: Der Icebreaker ist NUR ein kurzer persönlicher Einstieg in eine längere Nachricht. Er soll KEIN neues Thema aufmachen, KEINE Frage stellen, KEIN Angebot machen. Er bezieht sich nur kurz auf etwas aus dem Profil der Person.

Stil:
- Wie eine kurze WhatsApp-Nachricht an einen Bekannten
- Locker, direkt, kein Business-Deutsch
- Konkrete Fakten aus dem Profil aufgreifen (Jahre als GF, Branche, Stadt, etc.)
- Respekt/Anerkennung zeigen wo passend
- KEINE Fragen, KEINE Angebote, KEINE Floskeln wie "Ich habe gesehen dass..."

Beispiele für gute Icebreaker:
- "35 Jahre Geschäftsführer in der Baubranche - und dann noch mitten im Stuttgart. Respekt! Du hast schon einiges gesehen."
- "Seit 2018 in der Logistik selbstständig in Hamburg - läuft bei dir!"
- "IT-Beratung und Geschäftsführer seit über 10 Jahren in München. Starker Weg."

Beispiele für SCHLECHTE Icebreaker (NICHT so machen):
- "Wie gehst du mit der Digitalisierung in deiner Branche um?" (stellt eine Frage)
- "Ich könnte dir bei deinen Prozessen helfen" (macht ein Angebot)
- "Mir ist aufgefallen, dass du im Bereich X tätig bist" (Floskel)`;

    const userPrompt = customPrompt
      ? `Analysiere dieses LinkedIn-Profil und generiere Icebreaker mit folgendem Fokus: ${customPrompt}`
      : "Analysiere dieses LinkedIn-Profil und generiere 5 personalisierte Icebreaker.";

    // Build message content: image and/or text (both allowed)
    const userContent: any[] = [{ type: "text", text: userPrompt }];

    if (profileText) {
      userContent.push({ type: "text", text: `\n\nProfildaten:\n${profileText}` });
    }
    if (imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }
    if (!imageUrl && !profileText) {
      throw new Error("Kein Bild oder Text übergeben");
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile_data",
              description:
                "Extract name and generate icebreakers from a LinkedIn profile.",
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
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);

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
