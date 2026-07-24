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

interface TaskCardProps {
  task: Task;
  today: string;
  variant: "main" | "upcoming";
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
}

function TaskCard({
  task,
  today,
  variant,
  expanded,
  onToggle,
  onComplete,
}: TaskCardProps) {
  const overdue = task.due_date && task.due_date < today;
  const hasNote = !!task.note?.trim();

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3",
        hasNote && "cursor-pointer",
      )}
      onClick={hasNote ? onToggle : undefined}
      aria-expanded={hasNote ? expanded : undefined}
    >
      <Checkbox
        className="mt-0.5"
        checked={false}
        onCheckedChange={onComplete}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Oznacz jako wykonane: ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          {hasNote ? (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {variant === "main" ? (
            <>
              {overdue ? (
                <span className="text-destructive">
                  zaległe od {format(parseISO(task.due_date!), "dd.MM", { locale: pl })}
                </span>
              ) : task.due_date ? (
                <span>dziś</span>
              ) : (
                <span>bez terminu</span>
              )}
            </>
          ) : (
            <>
              {task.due_date ? (
                <span>
                  {format(parseISO(task.due_date), "dd.MM.yyyy", { locale: pl })}
                </span>
              ) : null}
            </>
          )}
        </div>
        {hasNote && expanded ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {task.note}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function TodayTasksSection() {
  const tasks = useTasksStore((s) => s.tasks);
  const loaded = useTasksStore((s) => s.loaded);
  const loadTasks = useTasksStore((s) => s.loadTasks);
  const completeTask = useTasksStore((s) => s.completeTask);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          {main.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              today={today}
              variant="main"
              expanded={expanded.has(t.id)}
              onToggle={() => toggleExpanded(t.id)}
              onComplete={() => void completeTask(t.id)}
            />
          ))}
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
                <TaskCard
                  key={t.id}
                  task={t}
                  today={today}
                  variant="upcoming"
                  expanded={expanded.has(t.id)}
                  onToggle={() => toggleExpanded(t.id)}
                  onComplete={() => void completeTask(t.id)}
                />
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
