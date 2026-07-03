import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Info, Mail, Pencil, Plus, Trash2 } from "lucide-react";
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
import { PoweredByFooter } from "@/components/powered-by-footer";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { MessageKind } from "@/lib/types";

const KIND_LABEL: Record<MessageKind, string> = {
  reminder_24h: "Przypomnienie 24h",
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

  return (
    <>
      <AppHeader title="Ustawienia" />
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
            Dostępne placeholdery: <code>{"{salutation}"}</code>,{" "}
            <code>{"{data}"}</code>, <code>{"{godzina}"}</code>.
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
              Zaproś żonę do wglądu w kalendarz. Wizyty pacjentów zobaczy tylko
              jako anonimowe bloki „Zajęte".
            </p>
            <Button className="mt-3 w-full" variant="outline" disabled>
              <Mail className="mr-2 h-4 w-4" />
              Zaproś e-mailem
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Wymaga włączenia Cloud (kolejna iteracja).
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
