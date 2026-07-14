import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Search, ShieldAlert, Upload } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddPatientDialog } from "@/components/add-patient-dialog";
import { ImportPatientsDialog } from "@/components/import-patients-dialog";
import { useStore } from "@/lib/store";
import { formatPatientName, isPatientNameIncomplete } from "@/lib/format";
import type { Patient } from "@/lib/types";
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
  const role = useStore((s) => s.role);
  const archivePatient = useStore((s) => s.archivePatient);
  const restorePatient = useStore((s) => s.restorePatient);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [archivingPatient, setArchivingPatient] = useState<Patient | null>(null);
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
      `${formatPatientName(p)} ${p.phone}`.toLowerCase().includes(query),
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

        <div className="mb-4 flex items-center justify-between gap-2">
          {role === "therapist" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="mr-1 h-4 w-4" /> Importuj CSV
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
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
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Brak pacjentów pasujących do wyszukiwania.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const archived = Boolean(p.archived_at);
              const missingCount =
                (isPatientNameIncomplete(p) ? 1 : 0) +
                (!p.salutation?.trim() ? 1 : 0);
              const stop = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
                e.preventDefault();
                e.stopPropagation();
              };
              return (
                <li key={p.id}>
                  <Link
                    to="/pacjenci/$id"
                    params={{ id: p.id }}
                    className={`relative block rounded-2xl border border-border bg-card p-4 pr-20 transition-colors hover:border-accent ${
                      archived ? "opacity-70" : ""
                    }`}
                  >
                    <div className="absolute right-2 top-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Edytuj pacjenta"
                        onClick={(e) => {
                          stop(e);
                          setEditingPatient(p);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {archived ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Przywróć pacjenta"
                          onClick={(e) => {
                            stop(e);
                            restorePatient(p.id);
                            toast.success("Pacjent przywrócony.");
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Archiwizuj pacjenta"
                          onClick={(e) => {
                            stop(e);
                            setArchivingPatient(p);
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-foreground break-words [overflow-wrap:anywhere] line-clamp-2">
                      {formatPatientName(p)}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]">
                      {p.salutation?.trim() ? p.salutation : "—"} · {p.phone}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {archived ? (
                        <Badge variant="outline">Zarchiwizowany</Badge>
                      ) : (
                        <>
                          {!p.service_consent_at ? (
                            <Badge variant="destructive" className="gap-1">
                              <ShieldAlert className="h-3 w-3" /> Brak zgody
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Obsługowa</Badge>
                          )}
                          {p.marketing_consent_at ? (
                            <Badge variant="outline">Marketing</Badge>
                          ) : null}
                          {missingCount > 0 ? (
                            <Badge
                              variant="outline"
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer border-amber-500/50 text-amber-600 dark:text-amber-400"
                              onClick={(e) => {
                                stop(e);
                                setEditingPatient(p);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingPatient(p);
                                }
                              }}
                            >
                              Uzupełnij braki ({missingCount})
                            </Badge>
                          ) : null}
                        </>
                      )}
                    </div>
                  </Link>
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
        onClick={() => setAddOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddPatientDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportPatientsDialog open={importOpen} onOpenChange={setImportOpen} />
      <AddPatientDialog
        open={Boolean(editingPatient)}
        onOpenChange={(v) => {
          if (!v) setEditingPatient(null);
        }}
        patient={editingPatient ?? undefined}
      />

      <AlertDialog
        open={Boolean(archivingPatient)}
        onOpenChange={(v) => {
          if (!v) setArchivingPatient(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiwizować pacjenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Pacjent zniknie z listy i wyszukiwarki w nowym wpisie, ale jego
              historia wizyt zostaje nietknięta. Zawsze możesz go przywrócić.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!archivingPatient) return;
                archivePatient(archivingPatient.id);
                toast.success("Pacjent zarchiwizowany.");
                setArchivingPatient(null);
              }}
            >
              Archiwizuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
