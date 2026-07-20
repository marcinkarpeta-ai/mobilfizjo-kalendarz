import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, LogOut, Mail, MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PoweredByFooter } from "@/components/powered-by-footer";
import { FeedbackSheet } from "@/components/feedback-sheet";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { MessageKind } from "@/lib/types";

type FeedbackStatus = "new" | "seen" | "done";
interface FeedbackRow {
  id: string;
  screen: string;
  body: string;
  photo_path: string | null;
  status: FeedbackStatus;
  created_at: string;
}

const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "Nowe",
  seen: "Przejrzane",
  done: "Zrobione",
};


const KIND_LABEL: Record<MessageKind, string> = {
  reminder_24h: "Przypomnienie 24h",
  reminder_2h: "Przypomnienie 2h",
  confirmation: "Potwierdzenie",
  cancellation: "Odwołanie",
  marketing_anniversary: "Marketing · rocznica",
  marketing_birthday: "Marketing · urodziny",
};

export const Route = createFileRoute("/_layout/ustawienia")({
  head: () => ({
    meta: [
      { title: "Ustawienia — FizjoPlan" },
      { name: "description", content: "Profil, etykiety zabiegów, szablony SMS, konto rodzinne." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const role = useStore((s) => s.role);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const labels = useStore((s) => s.labels);
  const addLabel = useStore((s) => s.addLabel);
  const renameLabel = useStore((s) => s.renameLabel);
  const removeLabel = useStore((s) => s.removeLabel);
  const templates = useStore((s) => s.templates);
  const updateTemplate = useStore((s) => s.updateTemplate);

  const [newLabel, setNewLabel] = useState("");
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string } | null>(null);
  const [editingTpl, setEditingTpl] = useState<{ id: string; body: string; kind: MessageKind } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (role === "family") {
    return <FamilySettings navigate={navigate} />;
  }

  return (
    <>
      <AppHeader title="Ustawienia" feedbackScreen="Ustawienia" />
      <PageContainer className="space-y-6">
        <Section title="Profil">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <Label htmlFor="s-name">Imię i tytuł</Label>
              <Input
                id="s-name"
                value={settings.therapist_name}
                onChange={(e) => updateSettings({ therapist_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-clinic">Nazwa gabinetu</Label>
              <Input
                id="s-clinic"
                value={settings.clinic_name}
                onChange={(e) => updateSettings({ clinic_name: e.target.value })}
              />
            </div>
          </div>
        </Section>

        <Section title="Etykiety zabiegów">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nowa etykieta"
              />
              <Button
                onClick={() => {
                  if (!newLabel.trim()) return;
                  addLabel(newLabel.trim());
                  setNewLabel("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {labels.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">{l.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edytuj etykietę"
                      onClick={() => setEditingLabel({ id: l.id, name: l.name })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Usuń etykietę"
                      onClick={() => {
                        removeLabel(l.id);
                        toast("Etykieta usunięta.");
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Szablony wiadomości">
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            Dostępne placeholdery: <code>{"{{salutation}}"}</code>,{" "}
            <code>{"{{date}}"}</code>, <code>{"{{time}}"}</code>,{" "}
            <code>{"{{ics_link}}"}</code>.
          </p>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {KIND_LABEL[t.kind]}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTpl({ id: t.id, body: t.body, kind: t.kind })}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edytuj
                  </Button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {t.body}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Konto rodzinne">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">
              Utwórz konto rodzinne (login <code>family1</code>). Zobaczy tylko
              anonimowe bloki „Zajęte" i własne wpisy rodzinne w kalendarzu.
            </p>
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={async () => {
                try {
                  const { seedFamilyAccount } = await import(
                    "@/lib/admin-seed.functions"
                  );
                  const res = await seedFamilyAccount();
                  if (res.status === "created") {
                    toast.success("Konto rodzinne utworzone.");
                  } else if (res.status === "password_reset") {
                    toast.success("Hasło konta rodzinnego zresetowane.");
                  } else {
                    toast("Konto rodzinne już istnieje.");
                  }
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Nie udało się utworzyć konta.",
                  );
                }
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Utwórz konto rodzinne
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Hasło startowe otrzymasz od twórcy aplikacji do przekazania.
            </p>
          </div>
        </Section>

        <Section title="O aplikacji">
          <Link
            to="/o-aplikacji"
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4" />
              O aplikacji i twórcy
            </span>
            <span className="text-sm text-muted-foreground">→</span>
          </Link>
        </Section>

        <Section title="Konto">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              toast("Wylogowano.");
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Wyloguj się
          </Button>
        </Section>

        <PoweredByFooter />
      </PageContainer>

      <Dialog
        open={!!editingLabel}
        onOpenChange={(v) => !v && setEditingLabel(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zmień nazwę etykiety</DialogTitle>
          </DialogHeader>
          <Input
            value={editingLabel?.name ?? ""}
            onChange={(e) =>
              setEditingLabel((s) => (s ? { ...s, name: e.target.value } : s))
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLabel(null)}>
              Anuluj
            </Button>
            <Button
              onClick={() => {
                if (editingLabel && editingLabel.name.trim()) {
                  renameLabel(editingLabel.id, editingLabel.name.trim());
                  setEditingLabel(null);
                }
              }}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTpl} onOpenChange={(v) => !v && setEditingTpl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edytuj szablon: {editingTpl ? KIND_LABEL[editingTpl.kind] : ""}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={editingTpl?.body ?? ""}
            onChange={(e) =>
              setEditingTpl((s) => (s ? { ...s, body: e.target.value } : s))
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTpl(null)}>
              Anuluj
            </Button>
            <Button
              onClick={() => {
                if (editingTpl) {
                  updateTemplate(editingTpl.id, editingTpl.body);
                  toast.success("Szablon zapisany.");
                  setEditingTpl(null);
                }
              }}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FamilySettings({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>;
}) {
  const userId = useStore((s) => s.userId);
  const storedName = useStore((s) => s.displayName);
  const [displayName, setDisplayName] = useState(storedName ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!userId) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Podaj nazwę.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error("Nie udało się zapisać.");
      return;
    }
    useStore.setState({ displayName: trimmed });
    toast.success("Zapisano.");
  }

  return (
    <>
      <AppHeader title="Ustawienia" />
      <PageContainer className="space-y-6">
        <Section title="Profil">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <Label htmlFor="f-name">Wyświetlana nazwa</Label>
              <Input
                id="f-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="np. Rodzina"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              Zapisz
            </Button>
          </div>
        </Section>

        <Section title="Konto">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              toast("Wylogowano.");
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Wyloguj się
          </Button>
        </Section>

        <PoweredByFooter />
      </PageContainer>
    </>
  );
}
