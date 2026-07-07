import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">Task sắp đến hạn</span>
              <span className="text-xs text-muted-foreground">"Thiết kế landing page" - 2 ngày nữa</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">Daily routine chưa hoàn thành</span>
              <span className="text-xs text-muted-foreground">Bạn còn 2 routine hôm nay</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">Chi tiêu vượt ngân sách Giải trí</span>
              <span className="text-xs text-muted-foreground">Tháng 6 đã dùng 110%</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
