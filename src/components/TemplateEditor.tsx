import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Pencil, ChevronDown } from "lucide-react";

interface Props {
  template: string;
  onSave: (template: string) => Promise<void>;
}

export function TemplateEditor({ template, onSave }: Props) {
  const [value, setValue] = useState(template);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(!template);
  const isDirty = value !== template;

  useEffect(() => setValue(template), [template]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Nachrichtenvorlage bearbeiten
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Nachrichtenvorlage</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5">{"{name}"}</code>
          <code className="rounded bg-muted px-1.5 py-0.5">{"{icebreaker}"}</code>
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-[120px] font-mono text-sm"
        placeholder="Hey {name}, {icebreaker} ..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
          <Save className="mr-2 h-3.5 w-3.5" />
          {saving ? "Speichern..." : "Speichern"}
        </Button>
        {template && (
          <Button size="sm" variant="ghost" onClick={() => { setValue(template); setOpen(false); }}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  );
}
