import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Info,
  LogOut,
  Mail,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { ServiceEditSheet } from "@/components/service-edit-sheet";
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
import { PoweredByFooter } from "@/components/powered-by-footer";
import { FeedbackSheet } from "@/components/feedback-sheet";
import {
  FeedbackThreadsList,
  useFeedbackUnreadCount,
} from "@/components/feedback-threads-list";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/working-hours";
import type { VisitLabel, WorkingHours } from "@/lib/types";
import { toast } from "sonner";
import type { MessageKind } from "@/lib/types";
import {
  pickLongestSalutation,
  renderTemplatePreview,
  smsSegments,
} from "@/lib/sms";
import { useMemo } from "react";
import { cn } from "@/lib/utils";




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
  const reorderLabels = useStore((s) => s.reorderLabels);
  const templates = useStore((s) => s.templates);
  const updateTemplate = useStore((s) => s.updateTemplate);

  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<VisitLabel | null>(null);
  const sortedLabels = useMemo(
    () =>
      [...labels].sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
      ),
    [labels],
  );
  const moveService = (index: number, dir: -1 | 1) => {
    const next = [...sortedLabels];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderLabels(next.map((l) => l.id));
  };

  const [editingTpl, setEditingTpl] = useState<{ id: string; body: string; kind: MessageKind } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (role === "family" || role === "admin") {
    return <RestrictedSettings navigate={navigate} />;
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

        <Section title="Usługi">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Button
              className="w-full"
              onClick={() => {
                setEditingService(null);
                setServiceSheetOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Dodaj usługę
            </Button>

            {sortedLabels.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Brak usług. Dodaj pierwszą pozycję katalogu.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {sortedLabels.map((l, i) => (
                  <li key={l.id} className="flex items-start gap-2 py-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setEditingService(l);
                        setServiceSheetOpen(true);
                      }}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {l.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {l.duration_minutes} min
                          {l.price_pln !== null && l.price_pln !== undefined
                            ? ` · ${l.price_pln} zł`
                            : ""}
                        </span>
                      </div>
                      {l.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {l.description}
                        </p>
                      ) : null}
                      {l.bookable ? (
                        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          Rezerwacje online
                        </span>
                      ) : null}
                    </button>
                    <div className="flex shrink-0 items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Przenieś wyżej"
                        disabled={i === 0}
                        onClick={() => moveService(i, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Przenieś niżej"
                        disabled={i === sortedLabels.length - 1}
                        onClick={() => moveService(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>


        <Section title="Wizyty">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Label htmlFor="s-visit-min">Domyślny czas wizyty (min)</Label>
            <Input
              id="s-visit-min"
              type="number"
              min={5}
              step={5}
              value={settings.default_visit_minutes}
              onChange={(e) =>
                updateSettings({
                  default_visit_minutes: Math.max(
                    5,
                    Math.floor(Number(e.target.value) || 0),
                  ),
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Proponowany czas trwania przy dodawaniu nowej wizyty.
            </p>
          </div>
        </Section>

        <WorkingHoursSection />



        <Section title="Szablony wiadomości">
          <div className="mb-3 rounded-2xl border border-border bg-card p-4">
            <Label htmlFor="s-sms-price">Cena netto za 1 SMS (gr)</Label>
            <Input
              id="s-sms-price"
              type="number"
              min={0}
              step={1}
              value={settings.sms_price_net_gr}
              onChange={(e) =>
                updateSettings({
                  sms_price_net_gr: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Używane do wyliczania szacunkowego kosztu w karcie „Zużycie SMS".
            </p>
          </div>
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

        <Section title="Konto opiekuna aplikacji">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">
              Utwórz konto opiekuna aplikacji (login <code>marcin</code>).
              Widzi anonimowe bloki „Zajęte", zarządza modułem sugestii, bez
              dostępu do danych pacjentów.
            </p>
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={async () => {
                try {
                  const { seedAdminAccount } = await import(
                    "@/lib/admin-seed.functions"
                  );
                  const res = await seedAdminAccount();
                  if (res.status === "created") {
                    toast.success("Konto opiekuna utworzone.");
                  } else if (res.status === "password_reset") {
                    toast.success("Hasło konta opiekuna zresetowane.");
                  } else {
                    toast("Konto opiekuna już istnieje.");
                  }
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Nie udało się utworzyć konta.",
                  );
                }
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Utwórz konto opiekuna
            </Button>
          </div>
        </Section>

        <SuggestionsSection onOpen={() => setFeedbackOpen(true)} />


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

      <ServiceEditSheet
        open={serviceSheetOpen}
        service={editingService}
        onOpenChange={(v) => {
          setServiceSheetOpen(v);
          if (!v) setEditingService(null);
        }}
      />

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
          {editingTpl ? (
            <TemplateSmsMeter
              body={editingTpl.body}
              priceGr={settings.sms_price_net_gr}
            />
          ) : null}
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

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        screen="Ustawienia"
      />
    </>
  );
}

function WorkingHoursSection() {
  const workingHours = useStore((s) => s.workingHours);
  const daysOff = useStore((s) => s.daysOff);
  const updateWorkingHours = useStore((s) => s.updateWorkingHours);
  const addDayOff = useStore((s) => s.addDayOff);
  const removeDayOff = useStore((s) => s.removeDayOff);

  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  const rows: WorkingHours[] = WEEKDAY_ORDER.map((wd) =>
    workingHours.find((w) => w.weekday === wd) ?? {
      weekday: wd,
      is_open: false,
      start_time: "07:00",
      end_time: "20:00",
    },
  );

  return (
    <Section title="Godziny pracy">
      <div className="rounded-2xl border border-border bg-card p-4">
        <ul className="space-y-2">
          {rows.map((w) => (
            <li key={w.weekday} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-sm">{WEEKDAY_LABELS[w.weekday]}</span>
              <Switch
                checked={w.is_open}
                aria-label={`${WEEKDAY_LABELS[w.weekday]} otwarte`}
                onCheckedChange={(v) => updateWorkingHours(w.weekday, { is_open: v })}
              />
              <Input
                type="time"
                className="h-9 w-[104px]"
                disabled={!w.is_open}
                value={w.start_time}
                onChange={(e) => updateWorkingHours(w.weekday, { start_time: e.target.value })}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                className="h-9 w-[104px]"
                disabled={!w.is_open}
                value={w.end_time}
                onChange={(e) => updateWorkingHours(w.weekday, { end_time: e.target.value })}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-medium">Dni wolne</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <Input
            placeholder="Opis (opcjonalnie)"
            className="h-9 flex-1 min-w-[140px]"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!newDate}
            onClick={() => {
              addDayOff(newDate, newReason.trim() || null);
              setNewDate("");
              setNewReason("");
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Dodaj
          </Button>
        </div>
        {daysOff.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Brak dni wolnych.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {daysOff.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
              >
                <span>
                  {d.date}
                  {d.reason ? (
                    <span className="text-muted-foreground"> · {d.reason}</span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Usuń dzień wolny"
                  onClick={() => removeDayOff(d.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
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

function RestrictedSettings({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>;
}) {
  const userId = useStore((s) => s.userId);
  const storedName = useStore((s) => s.displayName);
  const [displayName, setDisplayName] = useState(storedName ?? "");
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
      <AppHeader title="Ustawienia" feedbackScreen="Ustawienia" />
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

        <SuggestionsSection onOpen={() => setFeedbackOpen(true)} />


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

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        screen="Ustawienia"
      />
    </>
  );
}

function SuggestionsSection({ onOpen }: { onOpen: () => void }) {
  const unread = useFeedbackUnreadCount();
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Sugestie
        {unread > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {unread}
          </span>
        ) : null}
      </h2>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-accent"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquarePlus className="h-4 w-4" />
          Zgłoś sugestię
        </span>
        <span className="text-sm text-muted-foreground">→</span>
      </button>
      <div className="mt-3">
        <FeedbackThreadsList />
      </div>
    </section>
  );
}

const costFmt = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function TemplateSmsMeter({ body, priceGr }: { body: string; priceGr: number }) {
  const patients = useStore((s) => s.patients);
  const longestSalutation = useMemo(
    () => pickLongestSalutation(patients),
    [patients],
  );
  const info = useMemo(
    () => smsSegments(renderTemplatePreview(body, longestSalutation)),
    [body, longestSalutation],
  );
  const cost = (info.segments * priceGr) / 100;
  const warn = info.segments > 1;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-sm",
          warn
            ? "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-200"
            : "border-border bg-secondary/40 text-foreground",
        )}
      >
        <div>
          Podgląd: <span className="font-medium">{info.length}</span> znaków ·{" "}
          <span className="font-medium">{info.segments}</span>{" "}
          {info.segments === 1 ? "SMS" : "SMS-ów"} · ~{costFmt.format(cost)} zł netto
        </div>
        {warn ? (
          <div className="mt-1 text-xs">
            Ta treść wyśle się jako {info.segments} SMS-y — podwójny koszt.
            Skróć do {info.singleLimit} znaków, aby zmieścić w jednym.
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Polskie znaki skracają limit ze 160 do 70 znaków.
      </p>
    </div>
  );
}


