import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu, LayoutDashboard, Users, CalendarClock, Lightbulb,
  Calendar, FileText, CalendarHeart, FileBarChart, Palette,
  DollarSign, FileSignature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requires?: "any" | "admin" | "superAdmin";
};

const NAV_ITEMS: NavItem[] = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, requires: "any" },
  { path: "/team-management", label: "Equipe", icon: Users, requires: "admin" },
  { path: "/social", label: "Social", icon: CalendarClock, requires: "admin" },
  { path: "/ideas", label: "Ideias de Pauta", icon: Lightbulb, requires: "any" },
  { path: "/calendar", label: "Calendário", icon: Calendar, requires: "any" },
  { path: "/briefs", label: "Pautas", icon: FileText, requires: "any" },
  { path: "/reports", label: "Relatórios", icon: FileBarChart, requires: "superAdmin" },
  { path: "/billing", label: "Faturamento", icon: DollarSign, requires: "superAdmin" },
  { path: "/proposals", label: "Propostas", icon: FileSignature, requires: "superAdmin" },
  { path: "/contracts", label: "Contratos", icon: FileText, requires: "superAdmin" },
  { path: "/commemorative-dates", label: "Datas Comemorativas", icon: CalendarHeart, requires: "any" },
  { path: "/design-briefs", label: "Briefs de Design", icon: Palette, requires: "any" },
];

interface MobileNavProps {
  title?: string;
  children?: React.ReactNode;
}

export function MobileNav({ title, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, isAdmin } = useUserRole();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.requires === "superAdmin") return isSuperAdmin;
    if (item.requires === "admin") return isAdmin;
    return true;
  });

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
            {visibleItems.map((item) => {
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
