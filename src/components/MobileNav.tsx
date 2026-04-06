import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu, LayoutDashboard, Users, CalendarClock, Lightbulb,
  Calendar, FileText, CalendarHeart, X, History, FileBarChart, Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const NAV_ITEMS = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, superAdminOnly: false },
  { path: "/team-management", label: "Equipe", icon: Users, superAdminOnly: false },
  { path: "/social", label: "Social", icon: CalendarClock, superAdminOnly: false },
  { path: "/ideas", label: "Ideias", icon: Lightbulb, superAdminOnly: false },
  { path: "/calendar", label: "Calendário", icon: Calendar, superAdminOnly: false },
  { path: "/briefs", label: "Pautas", icon: FileText, superAdminOnly: false },
  { path: "/commemorative-dates", label: "Datas Comemorativas", icon: CalendarHeart, superAdminOnly: false },
  { path: "/reports", label: "Relatórios", icon: FileBarChart, superAdminOnly: true },
  { path: "/design-briefs", label: "Briefs de Design", icon: Palette, superAdminOnly: false },
];

interface MobileNavProps {
  title?: string;
  children?: React.ReactNode;
}

export function MobileNav({ title, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin } = useUserRole();

  return (
    <>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-left text-lg">{title || "Menu"}</SheetTitle>
          </SheetHeader>
          {children && <div className="border-b px-5 py-3">{children}</div>}
          <nav className="flex flex-col py-2">
            {NAV_ITEMS
              .filter((item) => !item.superAdminOnly || isSuperAdmin)
              .map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { setOpen(false); navigate(item.path); }}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
