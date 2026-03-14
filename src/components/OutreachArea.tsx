import { useState, useCallback, useEffect } from "react";
import { Upload, RefreshCw, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function OutreachArea({ template, profileDescription }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setSelectedIdx(null);
  };

  // Paste from clipboard (Ctrl+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) handleFile(f);
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const analyze = useCallback(async (prompt?: string) => {
    if (!file || !user) return;
    setLoading(true);
    setSelectedIdx(null);

    try {
      // Upload to storage
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("screenshots")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get signed URL for the edge function
      const { data: signedData, error: signedError } = await supabase.storage
        .from("screenshots")
        .createSignedUrl(path, 300);
      if (signedError) throw signedError;

      // Call edge function
      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: {
          imageUrl: signedData.signedUrl,
          profileDescription,
          customPrompt: prompt || undefined,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult({ name: data.name, icebreakers: data.icebreakers });

      // Clean up uploaded file
      await supabase.storage.from("screenshots").remove([path]);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [file, user, profileDescription]);

  const finalMessage = result && selectedIdx !== null
    ? template.replace("{name}", result.name).replace("{icebreaker}", result.icebreakers[selectedIdx])
    : null;

  const handleCopy = async () => {
    if (!finalMessage) return;
    await navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Outreach</h3>

      {/* Upload area */}
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
            <p className="text-sm text-muted-foreground">LinkedIn-Screenshot hochladen</p>
          </>
        )}
      </div>

      {/* Analyze button */}
      {file && !result && (
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
                  selectedIdx === i
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedIdx(i)}
              >
                {ib}
              </Card>
            ))}
          </div>

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
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-muted-foreground">Fertige Nachricht:</p>
          <p className="whitespace-pre-wrap text-sm">{finalMessage}</p>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
            {copied ? "Kopiert!" : "Kopieren"}
          </Button>
        </div>
      )}
    </div>
  );
}
