import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Home, MessageSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { isRestrictedCalendarRole } from "@/lib/roles";

const allTabs = [
  { to: "/", label: "Dzisiaj", icon: Home, restricted: true },
  { to: "/kalendarz", label: "Kalendarz", icon: CalendarDays, restricted: true },
  { to: "/pacjenci", label: "Pacjenci", icon: Users, restricted: false },
  { to: "/wiadomosci", label: "Wiadomości", icon: MessageSquare, restricted: false },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings, restricted: true },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const role = useStore((s) => s.role);
  const tabs = isRestrictedCalendarRole(role)
    ? allTabs.filter((t) => t.restricted)
    : allTabs;

  return (
    <nav
      aria-label="Nawigacja główna"
      className="sticky bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-secondary",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
