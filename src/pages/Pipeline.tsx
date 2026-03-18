import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { DailyLeads } from "@/components/DailyLeads";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type SenderProfile = Tables<"sender_profiles">;

export default function Pipeline() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<SenderProfile[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sender_profiles")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProfileSidebar
          profiles={profiles}
          activeId={null}
          onSelect={() => {}}
          onCreate={() => {}}
        />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <span className="ml-4 font-semibold">Heutige Pipeline</span>
          </header>
          <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
            <DailyLeads />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
