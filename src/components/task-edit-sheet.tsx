import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTasksStore, type Task } from "@/lib/tasks-store";

export function TaskEditSheet({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateTask = useTasksStore((s) => s.updateTask);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNote(task.note ?? "");
      setDueDate(task.due_date ?? "");
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    await updateTask(task.id, {
      title,
      note: note,
      due_date: dueDate || null,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={!!task} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edytuj sprawę</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Tytuł</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-note">Notatka</Label>
            <Textarea
              id="task-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Termin</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Anuluj
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !title.trim()}
            >
              Zapisz
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
