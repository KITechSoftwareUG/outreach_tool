import { useState } from "react";
import { Plus, User, LogOut, ChevronDown, ChevronRight, Workflow, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { PipelineOverview } from "@/components/PipelineOverview";
import type { Tables } from "@/integrations/supabase/types";

type SenderProfile = Tables<"sender_profiles">;

interface Props {
  profiles: SenderProfile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function ProfileSidebar({ profiles, activeId, onSelect, onCreate }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pipelineOpen, setPipelineOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">Outreach</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Profile</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profiles.map((p) => (
                <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                    isActive={p.id === activeId}
                    onClick={() => onSelect(p.id)}
                  >
                    <User className="h-4 w-4" />
                    <span>{p.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onCreate}>
                  <Plus className="h-4 w-4" />
                  <span>Neues Profil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/pipeline"}
                  onClick={() => navigate("/pipeline")}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Heutige Leads</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Email Pipeline - collapsed */}
        <SidebarGroup>
          <button
            onClick={() => setPipelineOpen(!pipelineOpen)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground/70 transition-colors"
          >
            {pipelineOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Workflow className="h-3 w-3" />
            Email-Pipeline (CLI)
          </button>
          {pipelineOpen && (
            <SidebarGroupContent className="px-2 pb-2">
              <PipelineOverview />
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
