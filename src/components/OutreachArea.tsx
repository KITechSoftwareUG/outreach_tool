import { useState, useCallback, useEffect } from "react";
import { Upload, RefreshCw, Copy, Check, Sparkles, Type, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  template: string;
  profileDescription: string;
}

interface AiResult {
  name: string;
  icebreakers: string[];
}

type InputMode = "image" | "text";

export function OutreachArea({ template, profileDescription }: Props) {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [profileText, setProfileText] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [manualIcebreaker, setManualIcebreaker] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setSelectedIdx(null);
    setManualIcebreaker("");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setProfileText("");
    setResult(null);
    setSelectedIdx(null);
    setManualIcebreaker("");
    setCustomPrompt("");
    setCopied(false);
  };

  // Paste from clipboard (Ctrl+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            setInputMode("image");
            handleFile(f);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const analyze = useCallback(async (prompt?: string) => {
    if (!user) return;
    if (inputMode === "image" && !file) return;
    if (inputMode === "text" && !profileText.trim()) return;

    setLoading(true);
    setSelectedIdx(null);
    setManualIcebreaker("");

    try {
      let imageUrl: string | undefined;
      let uploadPath: string | undefined;

      if (inputMode === "image" && file) {
        uploadPath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(uploadPath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: signedData, error: signedError } = await supabase.storage
          .from("screenshots")
          .createSignedUrl(uploadPath, 300);
        if (signedError) throw signedError;
        imageUrl = signedData.signedUrl;
      }

      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: {
          imageUrl,
          profileText: inputMode === "text" ? profileText.trim() : undefined,
          profileDescription,
          customPrompt: prompt || undefined,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult({ name: data.name, icebreakers: data.icebreakers });

      if (uploadPath) {
        await supabase.storage.from("screenshots").remove([uploadPath]);
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [file, user, profileDescription, profileText, inputMode]);

  const chosenIcebreaker =
    manualIcebreaker.trim() ||
    (result && selectedIdx !== null ? result.icebreakers[selectedIdx] : null);

  const finalMessage =
    result && chosenIcebreaker
      ? template.replace("{name}", result.name).replace("{icebreaker}", chosenIcebreaker)
      : null;

  const handleCopy = async () => {
    if (!finalMessage) return;
    await navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasInput = inputMode === "image" ? !!file : !!profileText.trim();

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={inputMode === "image" ? "default" : "outline"}
          size="sm"
          onClick={() => { setInputMode("image"); setResult(null); setSelectedIdx(null); }}
        >
          <Image className="mr-2 h-4 w-4" />
          Screenshot
        </Button>
        <Button
          variant={inputMode === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => { setInputMode("text"); setResult(null); setSelectedIdx(null); }}
        >
          <Type className="mr-2 h-4 w-4" />
          Text eingeben
        </Button>
      </div>

      {/* Image upload */}
      {inputMode === "image" && (
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }}
        >
          {preview ? (
            <img src={preview} alt="LinkedIn Screenshot" className="max-h-48 rounded object-contain" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Screenshot einfügen (Strg+V) oder hier hochladen</p>
            </>
          )}
        </div>
      )}

      {/* Text input */}
      {inputMode === "text" && (
        <Textarea
          placeholder="LinkedIn-Profilinfos hier einfügen (Name, Position, Unternehmen, About-Text, etc.)"
          value={profileText}
          onChange={(e) => { setProfileText(e.target.value); setResult(null); }}
          className="min-h-[140px] text-sm"
        />
      )}

      {/* Analyze button */}
      {hasInput && !result && (
        <Button onClick={() => analyze()} disabled={loading} className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? "Analysiere..." : "Analysieren"}
        </Button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <p className="text-sm">
            Erkannter Name: <span className="font-semibold text-foreground">{result.name}</span>
          </p>

          <div className="grid gap-2">
            {result.icebreakers.map((ib, i) => (
              <Card
                key={i}
                className={`cursor-pointer p-3 text-sm transition-all hover:shadow-md ${
                  selectedIdx === i && !manualIcebreaker.trim()
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => { setSelectedIdx(i); setManualIcebreaker(""); }}
              >
                {ib}
              </Card>
            ))}
          </div>

          {/* Manual icebreaker */}
          <Input
            placeholder="Oder eigenen Icebreaker eingeben..."
            value={manualIcebreaker}
            onChange={(e) => { setManualIcebreaker(e.target.value); setSelectedIdx(null); }}
            className="text-sm"
          />

          {/* Custom prompt + regenerate */}
          <div className="flex gap-2">
            <Input
              placeholder="Custom Prompt (optional)..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyze(customPrompt)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Final message */}
      {finalMessage && (
        <div className="space-y-3 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-muted-foreground">Fertige Nachricht:</p>
          <p className="whitespace-pre-wrap text-sm">{finalMessage}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {copied ? "Kopiert!" : "Kopieren"}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Nächstes Profil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
