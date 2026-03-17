import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Database,
  Mail,
  ArrowRight,
  RefreshCw,
  Bot,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Search,
    label: "Apollo.io",
    detail: "Lead-Suche nach Filtern (Titel, Region, Firmengröße)",
    command: "reservoir",
  },
  {
    icon: Database,
    label: "Supabase",
    detail: "Apollo-IDs speichern, Duplikate ignorieren",
    command: null,
  },
  {
    icon: RefreshCw,
    label: "Enrichment",
    detail: "Kontaktdaten anreichern (Name, Email, Firma, Website)",
    command: "process",
  },
  {
    icon: Mail,
    label: "n8n + Outlook",
    detail: "Email-Draft erstellen via n8n Webhook",
    command: null,
  },
] as const;

export function PipelineOverview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold leading-none">
            Automatische Lead-Pipeline
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Separater Prozess — läuft via CLI, unabhängig von diesem Tool
          </p>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <step.icon className="h-4 w-4" />
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-4 bg-border mt-1" />
              )}
            </div>
            <div className="pt-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{step.label}</span>
                {step.command && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                    {step.command}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CLI Info */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Terminal className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <code className="bg-muted px-1 rounded text-[11px]">python3 main.py reservoir</code>
                {" "}— Apollo-IDs sammeln
              </p>
              <p>
                <code className="bg-muted px-1 rounded text-[11px]">python3 main.py process</code>
                {" "}— Anreichern + Outlook-Drafts
              </p>
              <p>
                <code className="bg-muted px-1 rounded text-[11px]">python3 main.py status</code>
                {" "}— Pipeline-Stats anzeigen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
