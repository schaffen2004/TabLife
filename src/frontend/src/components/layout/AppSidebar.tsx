import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Target,
  Microscope,
  Repeat,
  Wallet,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard },
  { title: "Quản lý Task", url: "/tasks", icon: CheckSquare },
  { title: "Quản lý Project", url: "/projects", icon: FolderKanban },
  { title: "Plan", url: "/plans", icon: Target },
  { title: "Research Topic", url: "/research", icon: Microscope },
  { title: "Daily Routine", url: "/routine", icon: Repeat },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Cài đặt", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <span className="font-display text-base font-bold">T</span>
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-display text-lg font-bold tracking-tight">TabLife</span>
            <span className="block truncate text-[11px] text-muted-foreground">Life management</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
