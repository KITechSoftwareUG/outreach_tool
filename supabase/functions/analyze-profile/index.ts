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
1. Extrahiere NUR den VORNAMEN der Person (NICHT den Nachnamen! Nur "Max", nicht "Max Müller")
2. Generiere genau 8 personalisierte Icebreaker mit VERSCHIEDENEN Längen und Stilen

${profileDescription ? `Kontext zum Absender: ${profileDescription}` : ""}

WICHTIG: Der Icebreaker ist ein ABGESCHLOSSENER, respektvoller Kommentar der Anerkennung zeigt. Er ist KEIN Gesprächseinstieg, KEINE Einleitung, KEIN Aufhänger. Er steht für sich allein und leitet NICHTS ein.

ABSOLUT VERBOTEN:
- Fragen jeder Art ("Wie...", "Was...", "Kennst du...")
- Angebote oder Vorschläge
- Offene Formulierungen die eine Antwort erwarten
- Floskeln wie "Ich habe gesehen dass...", "Mir ist aufgefallen..."
- Sätze die mit "und" oder "da" weitergehen wollen
- Allgemeine Aussagen ohne konkrete Fakten aus dem Profil

VARIATION IST PFLICHT – Die 8 Icebreaker MÜSSEN sich in Länge UND Stil unterscheiden:
- Icebreaker 1: KURZ (1 Satz) – knackiger Kommentar, direkt auf den Punkt
- Icebreaker 2: MITTEL (2 Sätze) – Fakt + Anerkennung
- Icebreaker 3: LÄNGER (2-3 Sätze) – ausführlicher mit mehr Kontext
- Icebreaker 4: KURZ (1 Satz) – anderer Blickwinkel (z.B. Branche, Firma, Rolle)
- Icebreaker 5: MITTEL (2 Sätze) – Fokus auf Standort oder Branche
- Icebreaker 6: LÄNGER (2-3 Sätze) – nochmal ein anderer Aspekt aus dem Profil
- Icebreaker 7: KURZ oder MITTEL – lockerer Ton, eher jung/frisch
- Icebreaker 8: MITTEL oder LÄNGER – respektvoller Ton, eher erfahren/senior

Passe den Ton auch ans geschätzte Alter/Seniorität an:
- Jüngere Personen / weniger Erfahrung → lockerer, "nice", "mega", "läuft bei dir"
- Erfahrene Personen / Senior-Rollen → respektvoller, "Respekt", "starker Weg", "beeindruckend"

Stil:
- Respektvoll-anerkennend, auf Augenhöhe
- Umgangssprachlich aber wertschätzend (Wörter wie "stark", "Respekt", "nice", "mega" nutzen)
- Konkrete Zahlen/Fakten aus dem Profil (Jahre, Branche, Stadt, Firma, Rolle)
- Der Icebreaker muss ABGESCHLOSSEN klingen, nicht wie der Anfang von etwas
- Emojis sparsam erlaubt (💪, 🙂) aber nicht in jedem Icebreaker

Beispiele für PERFEKTE Icebreaker (verschiedene Längen):

KURZ (1 Satz):
- "Die Elektrotechnik in Tirol fest im Griff, und das sogar dreifach – Respekt dafür!"
- "IT-Beratung und GF seit über 10 Jahren in München – nice!"

MITTEL (2 Sätze):
- "Seit 2018 in der Logistik selbstständig in Hamburg. Bei dir scheint es richtig zu laufen – stark!"
- "Euer Beitrag zur 3D Lasergravur war ja Input pur! Solche Beiträge schaut man sich doch gerne an. Stark! 🙂"

LÄNGER (2-3 Sätze):
- "Mega, 35 Jahre GF in der Baubranche mitten in Stuttgart. Da steckt richtig viel Erfahrung drin. Respekt! 💪"
- "Geschäftsführer bei der Apleona Group ist schon eine starke Rolle, da laufen bestimmt täglich einige komplexe Prozesse zusammen. Respekt 💪🙂"

Beispiele für SCHLECHTE Icebreaker (NIEMALS so):
- "Wie gehst du mit der Digitalisierung um?" (FRAGE!)
- "Ich könnte dir bei deinen Prozessen helfen" (ANGEBOT!)
- "Mir ist aufgefallen, dass du im Bereich X tätig bist" (FLOSKEL!)
- "Das klingt spannend, da gibt es sicher viel zu erzählen" (ZU OFFEN!)
- "Dein Werdegang ist beeindruckend und zeigt dass..." (ZU OFFEN!)`;

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
