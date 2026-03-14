import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface Props {
  template: string;
  onSave: (template: string) => Promise<void>;
}

export function TemplateEditor({ template, onSave }: Props) {
  const [value, setValue] = useState(template);
  const [saving, setSaving] = useState(false);
  const isDirty = value !== template;

  useEffect(() => setValue(template), [template]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
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
      {isDirty && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-3.5 w-3.5" />
          {saving ? "Speichern..." : "Speichern"}
        </Button>
      )}
    </div>
  );
}
