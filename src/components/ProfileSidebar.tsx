import { Plus, User, LogOut } from "lucide-react";
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
