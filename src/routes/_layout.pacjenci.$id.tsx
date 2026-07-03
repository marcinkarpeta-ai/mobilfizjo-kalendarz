import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImageOff, ShieldAlert } from "lucide-react";
import { parseISO } from "date-fns";
import { AppHeader, PageContainer } from "@/components/app-header";
import { AppointmentCard } from "@/components/appointment-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
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
  const appointments = useStore((s) =>
    s.appointments.filter((a) => a.patient_id === id),
  );
  const labels = useStore((s) => s.labels);
  const notes = useStore((s) => s.notes.filter((n) => n.patient_id === id));
  const addNote = useStore((s) => s.addNote);

  const [noteBody, setNoteBody] = useState("");

  if (!patient) {
    throw notFound();
  }
  const patientData = patient;

  const labelById = new Map(labels.map((l) => [l.id, l]));

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
        title={`${patientData.first_name} ${patientData.last_name}`}
        subtitle={patientData.salutation}
        right={
          <Button asChild variant="ghost" size="icon" aria-label="Wróć do listy">
            <Link to="/pacjenci">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
      />

      <PageContainer>
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
            <DataRow label="Forma grzecznościowa" value={patientData.salutation} />
            <DataRow
              label="Data urodzenia"
              value={patientData.birth_date ? fmtDate(patientData.birth_date) : "—"}
            />
            <DataRow
              label="Zgoda obsługowa"
              value={
                patientData.service_consent_at ? (
                  <Badge variant="secondary">
                    Wyrażona {fmtDate(patientData.service_consent_at)}
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
                    Wyrażona {fmtDate(patientData.marketing_consent_at)}
                  </Badge>
                ) : (
                  <Badge variant="outline">Brak</Badge>
                )
              }
            />
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
