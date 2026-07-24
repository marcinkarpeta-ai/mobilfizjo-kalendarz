import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
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
  // group: 0 overdue, 1 today, 2 no date
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

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const today = todayISODate();
  const visible = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "open")
        .filter((t) => !t.due_date || t.due_date <= today)
        .sort(sortForToday),
    [tasks, today],
  );

  if (!loaded || visible.length === 0) return null;

  return (
    <section aria-labelledby="today-tasks" className="mt-6">
      <h2
        id="today-tasks"
        className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        Sprawy
      </h2>
      <ul className="space-y-2">
        {visible.map((t) => {
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
                  {t.created_by_name ? <span>{t.created_by_name}</span> : null}
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
