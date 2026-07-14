import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, ArrowLeft, ImageOff, Pencil, RotateCcw, ShieldAlert } from "lucide-react";
import { parseISO } from "date-fns";
import { AppHeader, PageContainer } from "@/components/app-header";
import { AppointmentCard } from "@/components/appointment-card";
import { AddPatientDialog } from "@/components/add-patient-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useStore } from "@/lib/store";
import { fmtDate, formatPatientName, isPatientNameIncomplete } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/pacjenci/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Pacjent — FizjoPlan` },
      { name: "description", content: `Karta pacjenta ${params.id}.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PatientDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg p-6 text-center text-sm text-muted-foreground">
      Nie znaleziono pacjenta.{" "}
      <Link to="/pacjenci" className="underline">
        Wróć do listy
      </Link>
    </div>
  ),
});

function PatientDetail() {
  const { id } = Route.useParams();
  const patient = useStore((s) => s.patients.find((p) => p.id === id));
  const hydrated = useStore((s) => s._hydrated);
  const allAppointments = useStore((s) => s.appointments);
  const labels = useStore((s) => s.labels);
  const allNotes = useStore((s) => s.notes);
  const addNote = useStore((s) => s.addNote);
  const archivePatient = useStore((s) => s.archivePatient);
  const restorePatient = useStore((s) => s.restorePatient);
  const navigate = useNavigate();

  const [noteBody, setNoteBody] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (!patient) {
    if (!hydrated) {
      return <div className="min-h-[60vh]" aria-hidden />;
    }
    throw notFound();
  }
  const patientData = patient;
  const isArchived = Boolean(patientData.archived_at);

  const appointments = useMemo(
    () => allAppointments.filter((a) => a.patient_id === id),
    [allAppointments, id],
  );
  const notes = useMemo(
    () => allNotes.filter((n) => n.patient_id === id),
    [allNotes, id],
  );
  const labelById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);

  const history = [...appointments].sort(
    (a, b) => parseISO(b.starts_at).getTime() - parseISO(a.starts_at).getTime(),
  );

  const lastVisit = history.find((a) => a.status !== "cancelled");

  function saveNote() {
    if (!noteBody.trim()) {
      toast.error("Notatka nie może być pusta.");
      return;
    }
    if (!lastVisit) {
      toast.error("Brak wizyt, do których można dodać notatkę.");
      return;
    }
    addNote({
      appointment_id: lastVisit.id,
      patient_id: patientData.id,
      body: noteBody.trim(),
    });
    setNoteBody("");
    toast.success("Notatka zapisana.");
  }

  return (
    <>
      <AppHeader
        title={formatPatientName(patientData)}
        subtitle={patientData.salutation ?? undefined}
        right={
          <Button asChild variant="ghost" size="icon" aria-label="Wróć do listy">
            <Link to="/pacjenci">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
      />

      <PageContainer>
        {isArchived ? (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/60 p-3 text-sm"
          >
            <span>
              <strong>Pacjent zarchiwizowany.</strong> Nie pojawia się na liście
              ani w wyszukiwarce w nowym wpisie. Historia pozostaje.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                restorePatient(patientData.id);
                toast.success("Pacjent przywrócony.");
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Przywróć
            </Button>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-1 h-4 w-4" /> Edytuj
          </Button>
          {!isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="mr-1 h-4 w-4" /> Archiwizuj
            </Button>
          ) : null}
          {!isArchived && isPatientNameIncomplete(patientData) ? (
            <Badge
              variant="outline"
              className="ml-auto border-amber-500/50 text-amber-600 dark:text-amber-400"
            >
              Uzupełnij dane
            </Badge>
          ) : null}
          {!isArchived && !patientData.salutation?.trim() ? (
            <Badge
              variant="outline"
              className={`${isPatientNameIncomplete(patientData) ? "" : "ml-auto "}border-amber-500/50 text-amber-600 dark:text-amber-400`}
            >
              Uzupełnij formę zwrotu
            </Badge>
          ) : null}
        </div>


        {!patientData.service_consent_at ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>
              <strong>Brak zgody obsługowej.</strong> SMS-y o wizytach nie będą
              wysyłane dla tego pacjenta.
            </p>
          </div>
        ) : null}

        <Tabs defaultValue="dane">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dane">Dane</TabsTrigger>
            <TabsTrigger value="historia">Historia</TabsTrigger>
            <TabsTrigger value="notatki">Notatki</TabsTrigger>
          </TabsList>

          <TabsContent value="dane" className="mt-4 space-y-3">
            <DataRow label="Telefon" value={patientData.phone} />
            <DataRow label="Forma grzecznościowa" value={patientData.salutation?.trim() ? patientData.salutation : "—"} />
            <DataRow
              label="Data urodzenia"
              value={patientData.birth_date ? fmtDate(patientData.birth_date) : "—"}
            />
            <DataRow
              label="Zgoda obsługowa"
              value={
                patientData.service_consent_at ? (
                  <Badge variant="secondary">
                    Zgoda z dn. {fmtDate(patientData.service_consent_at)}
                  </Badge>
                ) : patientData.service_consent_changed_at ? (
                  <Badge variant="outline">
                    Wycofana dn. {fmtDate(patientData.service_consent_changed_at)}
                  </Badge>
                ) : (
                  <Badge variant="destructive">Brak</Badge>
                )
              }
            />
            <DataRow
              label="Zgoda marketingowa"
              value={
                patientData.marketing_consent_at ? (
                  <Badge variant="outline">
                    Zgoda z dn. {fmtDate(patientData.marketing_consent_at)}
                  </Badge>
                ) : patientData.marketing_consent_changed_at ? (
                  <Badge variant="outline">
                    Wycofana dn. {fmtDate(patientData.marketing_consent_changed_at)}
                  </Badge>
                ) : (
                  <Badge variant="outline">Brak</Badge>
                )
              }
            />
            {patientData.general_note ? (
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="mb-1 text-sm text-muted-foreground">Notatka ogólna</div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {patientData.general_note}
                </p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="historia" className="mt-4">
            {history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Brak wizyt.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((a) => (
                  <li key={a.id}>
                    <div className="mb-1 px-1 text-xs text-muted-foreground">
                      {fmtDate(a.starts_at, "EEEE, d MMMM yyyy")}
                    </div>
                    <AppointmentCard
                      appt={a}
                      patient={patientData}
                      label={a.visit_label_id ? labelById.get(a.visit_label_id) : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="notatki" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <label
                htmlFor="new-note"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Nowa notatka powizytowa
              </label>
              <Textarea
                id="new-note"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Opis wizyty, obserwacje, zalecenia…"
                rows={4}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title="Dostępne po włączeniu Cloud"
                >
                  <ImageOff className="h-3.5 w-3.5" /> Zdjęcia dostępne po włączeniu Cloud
                </div>
                <Button size="sm" onClick={saveNote}>
                  Zapisz notatkę
                </Button>
              </div>
            </div>

            {notes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Brak notatek.
              </p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="mb-1 text-xs text-muted-foreground">
                      {fmtDate(n.created_at, "d MMMM yyyy, HH:mm")}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {n.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>

      <AddPatientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patientData}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
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
                archivePatient(patientData.id);
                toast.success("Pacjent zarchiwizowany.");
                navigate({ to: "/pacjenci" });
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


function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
