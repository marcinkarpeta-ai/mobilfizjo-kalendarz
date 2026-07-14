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
                          {formatPatientName(p)}
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {p.salutation?.trim() ? p.salutation : "—"} · {p.phone}
                        </p>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {!archived && isPatientNameIncomplete(p) ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                            Uzupełnij dane
                          </Badge>
                        ) : null}
                        {!p.salutation?.trim() && !archived ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                            Uzupełnij formę zwrotu
                          </Badge>
                        ) : null}
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
                        <div className="mt-2 flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => setEditingPatient(p)}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Edytuj
                          </Button>
                          {!archived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => setArchivingPatient(p)}
                            >
                              <Archive className="mr-1 h-3 w-3" /> Archiwizuj
                            </Button>
                          ) : null}
                        </div>
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
