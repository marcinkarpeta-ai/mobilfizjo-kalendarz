import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AddPatientDialog } from "@/components/add-patient-dialog";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/pacjenci/")({
  head: () => ({
    meta: [
      { title: "Pacjenci — FizjoPlan" },
      { name: "description", content: "Kartoteka pacjentów: dane, historia wizyt i zgody." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const patients = useStore((s) => s.patients);
  const restorePatient = useStore((s) => s.restorePatient);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeCount = useMemo(
    () => patients.filter((p) => !p.archived_at).length,
    [patients],
  );
  const archivedCount = patients.length - activeCount;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const base = showArchived
      ? patients
      : patients.filter((p) => !p.archived_at);
    if (!query) return base;
    return base.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.phone}`.toLowerCase().includes(query),
    );
  }, [patients, q, showArchived]);

  return (
    <>
      <AppHeader
        title="Pacjenci"
        subtitle={
          showArchived
            ? `${activeCount} aktywnych • ${archivedCount} zarchiwizowanych`
            : `${activeCount} osób w kartotece`
        }
      />
      <PageContainer>
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po imieniu lub telefonie"
            className="pl-9"
            aria-label="Szukaj pacjenta"
          />
        </div>

        <div className="mb-4 flex items-center justify-end gap-2">
          <Label
            htmlFor="show-archived"
            className="text-xs text-muted-foreground"
          >
            Pokaż zarchiwizowanych
          </Label>
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Brak pacjentów pasujących do wyszukiwania.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const archived = Boolean(p.archived_at);
              return (
                <li key={p.id}>
                  <div
                    className={`rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent ${
                      archived ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/pacjenci/$id"
                        params={{ id: p.id }}
                        className="min-w-0 flex-1"
                      >
                        <h3 className="truncate text-base font-semibold text-foreground">
                          {p.first_name} {p.last_name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {p.salutation} · {p.phone}
                        </p>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {archived ? (
                          <Badge variant="outline">Zarchiwizowany</Badge>
                        ) : !p.service_consent_at ? (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="h-3 w-3" /> Brak zgody
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Obsługowa</Badge>
                        )}
                        {!archived && p.marketing_consent_at ? (
                          <Badge variant="outline">Marketing</Badge>
                        ) : null}
                        {archived ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              restorePatient(p.id);
                              toast.success("Pacjent przywrócony.");
                            }}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Przywróć
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageContainer>

      <Button
        size="lg"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg"
        aria-label="Dodaj pacjenta"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddPatientDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
