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
2. Generiere genau 5 kurze Icebreaker (1 Satz, MAXIMAL 2 kurze Sätze)

${profileDescription ? `Kontext zum Absender: ${profileDescription}` : ""}

WICHTIG: Der Icebreaker ist ein ABGESCHLOSSENER, kurzer persönlicher Kommentar - wie ein Kompliment oder eine Feststellung. Er ist KEIN Gesprächseinstieg, KEINE Einleitung, KEIN Aufhänger. Er steht für sich allein und leitet NICHTS ein.

ABSOLUT VERBOTEN:
- Fragen jeder Art ("Wie...", "Was...", "Kennst du...")
- Angebote oder Vorschläge
- Offene Formulierungen die eine Antwort erwarten
- Floskeln wie "Ich habe gesehen dass...", "Mir ist aufgefallen..."
- Sätze die mit "und" oder "da" weitergehen wollen
- Allgemeine Aussagen ohne konkrete Fakten aus dem Profil

Stil:
- Wie ein kurzer Kommentar den du einem Kumpel zurufen würdest
- Maximal 1-2 Sätze, knackig und fertig
- Konkrete Zahlen/Fakten aus dem Profil (Jahre, Branche, Stadt, Firma)
- Anerkennung/Respekt zeigen, aber kurz und bündig
- Umgangssprachlich, kein Business-Deutsch
- Der Satz muss ABGESCHLOSSEN klingen, nicht wie der Anfang von etwas

Beispiele für PERFEKTE Icebreaker:
- "35 Jahre GF in der Baubranche mitten in Stuttgart - Respekt, du hast echt was aufgebaut."
- "Seit 2018 in der Logistik selbstständig in Hamburg - läuft bei dir!"
- "IT-Beratung und GF seit über 10 Jahren in München. Starker Weg."
- "12 Jahre Erfahrung im Maschinenbau und jetzt eigene Firma - nice."
- "Handwerk und Digitalisierung in einem - das sieht man selten. Stark."

Beispiele für SCHLECHTE Icebreaker (NIEMALS so):
- "Wie gehst du mit der Digitalisierung um?" (FRAGE!)
- "Ich könnte dir bei deinen Prozessen helfen" (ANGEBOT!)
- "Mir ist aufgefallen, dass du im Bereich X tätig bist" (FLOSKEL!)
- "Das klingt spannend, da gibt es sicher viel zu erzählen" (ZU OFFEN!)
- "Dein Werdegang ist beeindruckend und zeigt dass..." (ZU LANG, ZU OFFEN!)`;

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
              description: "Extract name and generate icebreakers from a LinkedIn profile.",
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte lade Credits nach." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("Unexpected AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Unerwartete AI-Antwort" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ name: parsed.name, icebreakers: parsed.icebreakers }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
