import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTasksStore, type Task } from "@/lib/tasks-store";
import { cn } from "@/lib/utils";

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function sortForToday(a: Task, b: Task) {
  const today = todayISODate();
  const grp = (t: Task) => {
    if (!t.due_date) return 2;
    if (t.due_date < today) return 0;
    return 1;
  };
  const ga = grp(a);
  const gb = grp(b);
  if (ga !== gb) return ga - gb;
  if (a.due_date && b.due_date && a.due_date !== b.due_date) {
    return a.due_date.localeCompare(b.due_date);
  }
  return a.created_at.localeCompare(b.created_at);
}

export function TodayTasksSection() {
  const tasks = useTasksStore((s) => s.tasks);
  const loaded = useTasksStore((s) => s.loaded);
  const loadTasks = useTasksStore((s) => s.loadTasks);
  const completeTask = useTasksStore((s) => s.completeTask);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const today = todayISODate();
  const { main, upcoming } = useMemo(() => {
    const main: Task[] = [];
    const upcoming: Task[] = [];
    for (const t of tasks) {
      if (t.status !== "open") continue;
      if (!t.due_date || t.due_date <= today) main.push(t);
      else upcoming.push(t);
    }
    main.sort(sortForToday);
    upcoming.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    return { main, upcoming };
  }, [tasks, today]);

  if (!loaded) return null;
  if (main.length === 0 && upcoming.length === 0) return null;

  return (
    <section aria-labelledby="today-tasks" className="mt-6">
      <h2
        id="today-tasks"
        className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Sprawy
      </h2>
      {main.length > 0 ? (
        <ul className="space-y-2">
          {main.map((t) => {
            const overdue = t.due_date && t.due_date < today;
            return (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={false}
                  onCheckedChange={() => void completeTask(t.id)}
                  aria-label={`Oznacz jako wykonane: ${t.title}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {overdue ? (
                      <span className={cn("text-destructive")}>
                        zaległe od {format(parseISO(t.due_date!), "dd.MM", { locale: pl })}
                      </span>
                    ) : t.due_date ? (
                      <span>dziś</span>
                    ) : (
                      <span>bez terminu</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {upcoming.length > 0 ? (
        <Collapsible
          open={upcomingOpen}
          onOpenChange={setUpcomingOpen}
          className={main.length > 0 ? "mt-2" : ""}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card">
            <span>Nadchodzące ({upcoming.length})</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                upcomingOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ul className="space-y-2">
              {upcoming.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={false}
                    onCheckedChange={() => void completeTask(t.id)}
                    aria-label={`Oznacz jako wykonane: ${t.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {t.due_date ? (
                        <span>
                          {format(parseISO(t.due_date), "dd.MM.yyyy", { locale: pl })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <div className="mt-2 px-1">
        <Link
          to="/sprawy"
          className="text-xs font-medium text-primary hover:underline"
        >
          Wszystkie sprawy →
        </Link>
      </div>
    </section>
  );
}
