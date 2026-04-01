import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { TemplateEditor } from "@/components/TemplateEditor";
import { OutreachArea } from "@/components/OutreachArea";
import { CreateProfileDialog } from "@/components/CreateProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SenderProfile = Tables<"sender_profiles">;

export default function Index() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<SenderProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("sender_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
        return;
      }
      setProfiles(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    };
    load();
  }, [user]);

  const createProfile = async (name: string, description: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("sender_profiles")
      .insert({ user_id: user.id, name, description })
      .select()
      .single();
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles((prev) => [...prev, data]);
    setActiveId(data.id);
  };

  const renameProfile = async (id: string, newName: string) => {
    const { error } = await supabase
      .from("sender_profiles")
      .update({ name: newName })
      .eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    toast({ title: "Umbenannt" });
  };

  const saveTemplate = async (template: string) => {
    if (!activeProfile) return;
    const { error } = await supabase
      .from("sender_profiles")
      .update({ template_message: template })
      .eq("id", activeProfile.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === activeProfile.id ? { ...p, template_message: template } : p))
    );
    toast({ title: "Gespeichert" });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProfileSidebar
          profiles={profiles}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={() => setDialogOpen(true)}
          onRename={renameProfile}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            {activeProfile && (
              <span className="ml-4 font-semibold">{activeProfile.name}</span>
            )}
          </header>
          <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
            {activeProfile ? (
              <>
                <TemplateEditor
                  template={activeProfile.template_message}
                  onSave={saveTemplate}
                />
                <Separator />
                <OutreachArea
                  template={activeProfile.template_message}
                  profileDescription={activeProfile.description ?? ""}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Erstelle ein Profil um loszulegen →</p>
              </div>
            )}
          </main>
        </div>
      </div>
      <CreateProfileDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createProfile}
      />
    </SidebarProvider>
  );
}
