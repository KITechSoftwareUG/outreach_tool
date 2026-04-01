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

    const systemPrompt = `Du bist ein Outreach-Assistent. Du kriegst ein Bild oder einen Ausschnitt aus dem LinkedIn Profil der Person. Du generierst Icebreaker für LinkedIn-Outreach-Nachrichten.

Deine Aufgaben:
1. Extrahiere NUR den VORNAMEN der Person (NICHT den Nachnamen! Nur "Max", nicht "Max Müller")
2. Generiere genau 8 personalisierte Icebreaker mit VERSCHIEDENEN Längen und Stilen

${profileDescription ? `Kontext zum Absender: ${profileDescription}` : ""}



━━━ KONTEXT ━━━
Die fertige Nachricht sieht so aus:
"Hey {Vorname}, [ICEBREAKER]"

Der Icebreaker wird direkt hinter "Hey {Vorname}, " eingefügt.
Er beginnt deshalb mit KLEINEM Buchstaben und endet mit Punkt + 💪

━━━ DEINE AUFGABE ━━━
1. Extrahiere den VORNAMEN der Person (nur Vorname, kein Nachname)
2. Generiere 8 Icebreaker

━━━ WAS EIN ICEBREAKER IST ━━━
Ein Icebreaker ist eine kurze, echte Anerkennung – wie wenn ein Bekannter kurz auf dein Profil schaut und spontan schreibt was ihm aufgefallen ist.
KEIN Einstieg. KEIN Aufhänger. KEIN Gesprächsstart. Nur ein abgeschlossener Kommentar.

━━━ FORMAT ━━━
- Beginnt mit kleinem Buchstaben (weil "Hey {Name}, " davor steht)
- Endet mit Punkt + 💪
- 1-2 Sätze, selten 3
- Kein "ich habe gesehen", kein "mir ist aufgefallen", kein "du bist" am Anfang

━━━ TON ━━━
Locker, direkt, auf Augenhöhe. Nicht KI, nicht LinkedIn-Post, nicht Bewerbungsschreiben.
Klingt wie eine WhatsApp-Nachricht von jemandem der wirklich kurz draufgeschaut hat.

Erlaubte Wörter: "Respekt", "mega", "stark", "nice", "kein einfacher Weg", "läuft bei dir", "Hut ab", "schon einiges gesehen"
Verbotene Wörter: "beeindruckend", "Kontinuität", "Engagement", "Expertise", "Führungsqualitäten", "bemerkenswert", "zeugt von"

━━━ WORAUF ACHTEN ━━━
Jeder der 8 Icebreaker nimmt EINEN anderen Aspekt:
- Nur die Jahre in der Branche
- Nur den Standort/Region
- Nur die aktuelle Tätigkeit (kurz beschrieben, nicht kopiert)
- Nur die Branche selbst
- Nur ein Post/Beitrag wenn sichtbar (GOLD!)
- Nur die Dauer an einem Ort / in einer Firma
- Nur eine Teamgröße, Unternehmensgröße oder Zahl
- Freestyle – was auch immer am echtesten klingt

NIEMALS: Position + Firma + Stadt + Jahre alles zusammen in einem Satz.
NIEMALS: Ausbildung, Studium, Zertifikate erwähnen – irrelevant.
NIEMALS: Firmennamen in mehr als 2 von 8 Icebreakern.

━━━ WENN DAS PROFIL WENIG HERGIBT ━━━
Dann nimm einfach: Jahre + Branche und erkenne die Leistung an.
Nicht "wow das ist toll" sondern "das war bestimmt kein einfacher Weg" – echte Anerkennung statt leeres Lob.

━━━ BEISPIELE (GENAU SO SOLL ES KLINGEN) ━━━
✅ "35 Jahre als Geschäftsführer, mitten in Stuttgart – das war bestimmt kein einfacher Weg. 💪"
✅ "schon über 14 Jahre in der Versicherungsbranche unterwegs – Respekt für den Weg. 💪"
✅ "Hamm und die Versicherungsbranche – klingt nach einer Kombination die sitzt. 💪"
✅ "über ein Jahrzehnt an einem Ort und in einer Rolle – das hat was. 💪"
✅ "dein Beitrag letzte Woche zum Thema Fachkräftemangel war echt on point. 💪"
✅ "Logistik in Hamburg, seit 2018 selbstständig – läuft bei dir. 💪"
✅ "IT-Beratung seit über 10 Jahren in München – starker Weg. 💪"

━━━ SCHLECHTE BEISPIELE (NIEMALS SO) ━━━
❌ "seit 14 Jahren als Geschäftsstellenleiterin bei Debeka in Hamm tätig – beeindruckende Kontinuität." (alles zusammen + KI-Wort)
❌ "als Leiterin bei Debeka zeugt das von Engagement." (KI-Wörter)
❌ "wie gehst du mit den Herausforderungen um?" (FRAGE!)
❌ "ich könnte dir dabei helfen." (ANGEBOT!)`;

    const userPrompt = customPrompt
      ? `Analysiere dieses LinkedIn-Profil und generiere Icebreaker mit folgendem Fokus: ${customPrompt}`
      : "Analysiere dieses LinkedIn-Profil und generiere 8 personalisierte Icebreaker.";

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
                    description: "ONLY the first name (Vorname) of the person, NOT the full name",
                  },
                  icebreakers: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 8 personalized icebreaker sentences with varying lengths",
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
