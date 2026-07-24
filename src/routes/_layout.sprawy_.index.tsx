import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { RotateCcw } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTasksStore, type Task } from "@/lib/tasks-store";
import { TaskEditSheet } from "@/components/task-edit-sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/sprawy_/")({
  head: () => ({
    meta: [
      { title: "Sprawy — FizjoPlan" },
      { name: "description", content: "Wspólna lista spraw do zrobienia." },
    ],
  }),
  component: SprawyPage,
});

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function SprawyPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const loadTasks = useTasksStore((s) => s.loadTasks);
  const addTask = useTasksStore((s) => s.addTask);
  const completeTask = useTasksStore((s) => s.completeTask);
  const reopenTask = useTasksStore((s) => s.reopenTask);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const today = todayISODate();

  const { overdue, todayList, noDate, upcoming, done30 } = useMemo(() => {
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    const noDate: Task[] = [];
    const upcoming: Task[] = [];
    const done30: Task[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    for (const t of tasks) {
      if (t.status === "done") {
        if (t.done_at && parseISO(t.done_at) >= cutoff) done30.push(t);
        continue;
      }
      if (!t.due_date) noDate.push(t);
      else if (t.due_date < today) overdue.push(t);
      else if (t.due_date === today) todayList.push(t);
      else upcoming.push(t);
    }
    overdue.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    todayList.sort((a, b) => a.created_at.localeCompare(b.created_at));
    noDate.sort((a, b) => a.created_at.localeCompare(b.created_at));
    upcoming.sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    done30.sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
    return { overdue, todayList, noDate, upcoming, done30 };
  }, [tasks, today]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await addTask({ title, note, due_date: dueDate || null });
    setSubmitting(false);
    setTitle("");
    setNote("");
    setDueDate("");
  };

  return (
    <>
      <AppHeader title="Sprawy" feedbackScreen="Sprawy" />
      <PageContainer>
        <section
          aria-labelledby="add-task"
          className="mb-6 rounded-2xl border border-border/60 bg-card p-4"
        >
          <h2 id="add-task" className="sr-only">
            Dodaj nową sprawę
          </h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-title">Tytuł</Label>
              <Input
                id="new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Co trzeba zrobić?"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-note">Notatka (opcjonalna)</Label>
              <Textarea
                id="new-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-due">Termin (opcjonalny)</Label>
              <Input
                id="new-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={submitting || !title.trim()}
            >
              Dodaj
            </Button>
          </div>
        </section>

        <TaskGroup
          label="Zaległe"
          tasks={overdue}
          onComplete={completeTask}
          onEdit={setEditing}
          overdueMarker
        />
        <TaskGroup
          label="Dziś"
          tasks={todayList}
          onComplete={completeTask}
          onEdit={setEditing}
        />
        <TaskGroup
          label="Bez terminu"
          tasks={noDate}
          onComplete={completeTask}
          onEdit={setEditing}
        />
        <TaskGroup
          label="Nadchodzące"
          tasks={upcoming}
          onComplete={completeTask}
          onEdit={setEditing}
          showDate
        />

        {overdue.length + todayList.length + noDate.length + upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">Brak otwartych spraw.</p>
          </div>
        ) : null}

        <Collapsible className="mt-8">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-card">
            <span>Wykonane ({done30.length})</span>
            <span className="text-xs">ostatnie 30 dni</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {done30.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">Brak wpisów.</p>
            ) : (
              done30.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground line-through">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.done_at
                        ? format(parseISO(t.done_at), "dd.MM.yyyy HH:mm", { locale: pl })
                        : ""}
                      {t.done_by_name ? ` • ${t.done_by_name}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void reopenTask(t.id)}
                    aria-label="Przywróć sprawę"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Przywróć
                  </Button>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </PageContainer>

      <TaskEditSheet task={editing} onOpenChange={(v) => !v && setEditing(null)} />
    </>
  );
}

function TaskGroup({
  label,
  tasks,
  onComplete,
  onEdit,
  overdueMarker,
  showDate,
}: {
  label: string;
  tasks: Task[];
  onComplete: (id: string) => void | Promise<void>;
  onEdit: (t: Task) => void;
  overdueMarker?: boolean;
  showDate?: boolean;
}) {
  if (tasks.length === 0) return null;
  const today = todayISODate();
  return (
    <section className="mb-5">
      <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3"
          >
            <Checkbox
              className="mt-0.5"
              checked={false}
              onCheckedChange={() => void onComplete(t.id)}
              aria-label={`Oznacz jako wykonane: ${t.title}`}
            />
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onEdit(t)}
            >
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              {t.note ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {t.note}
                </p>
              ) : null}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {t.created_by_name ? <span>{t.created_by_name}</span> : null}
                {overdueMarker && t.due_date ? (
                  <span className={cn("text-destructive")}>
                    zaległe od {format(parseISO(t.due_date), "dd.MM", { locale: pl })}
                  </span>
                ) : showDate && t.due_date ? (
                  <span>
                    {format(parseISO(t.due_date), "dd.MM.yyyy", { locale: pl })}
                  </span>
                ) : t.due_date && t.due_date === today ? (
                  <span>dziś</span>
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
