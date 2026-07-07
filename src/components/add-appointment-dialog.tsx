import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityStrip } from "@/components/availability-strip";
import { useStore } from "@/lib/store";
import type { AppointmentType } from "@/lib/types";
import { overlaps } from "@/lib/format";
import { toast } from "sonner";

const schema = z.object({
  type: z.enum(["patient_visit", "family_event"]),
  date: z.string().min(1, "Podaj datę"),
  start: z.string().min(1, "Podaj godzinę"),
  end: z.string().min(1, "Podaj godzinę"),
  patient_id: z.string().optional(),
  visit_label_id: z.string().optional(),
  title: z.string().optional(),
});

export function AddAppointmentDialog({
  open,
  onOpenChange,
  defaultDate = new Date(),
  defaultStart,
  defaultEnd,
  mode = "full",
  extraBusy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date;
  defaultStart?: string;
  defaultEnd?: string;
  mode?: "full" | "family_only";
  extraBusy?: { starts_at: string; ends_at: string }[];
}) {
  const familyOnly = mode === "family_only";
  const allPatients = useStore((s) => s.patients);
  const patients = useMemo(() => allPatients.filter((p) => !p.archived_at), [allPatients]);
  const labels = useStore((s) => s.labels);
  const appointments = useStore((s) => s.appointments);
  const addAppointment = useStore((s) => s.addAppointment);

  const [type, setType] = useState<AppointmentType>(
    familyOnly ? "family_event" : "patient_visit",
  );
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [start, setStart] = useState(defaultStart ?? "09:00");
  const [end, setEnd] = useState(defaultEnd ?? "09:45");
  const [patientId, setPatientId] = useState<string>("");
  const [labelId, setLabelId] = useState<string>("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(format(defaultDate, "yyyy-MM-dd"));
    if (defaultStart) setStart(defaultStart);
    if (defaultEnd) setEnd(defaultEnd);
  }, [open, defaultDate, defaultStart, defaultEnd]);

  const startISO = `${date}T${start}:00`;
  const endISO = `${date}T${end}:00`;

  const overlapping = useMemo(() => {
    return appointments.some(
      (a) =>
        a.status !== "cancelled" &&
        overlaps(a.starts_at, a.ends_at, startISO, endISO),
    );
  }, [appointments, startISO, endISO]);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const noServiceConsent =
    type === "patient_visit" && selectedPatient && !selectedPatient.service_consent_at;

  function submit() {
    const parsed = schema.safeParse({
      type,
      date,
      start,
      end,
      patient_id: patientId || undefined,
      visit_label_id: labelId || undefined,
      title: title || undefined,
    });
    if (!parsed.success) {
      toast.error("Uzupełnij wymagane pola.");
      return;
    }
    if (type === "patient_visit" && !patientId) {
      toast.error("Wybierz pacjenta.");
      return;
    }
    if (parseISO(endISO) <= parseISO(startISO)) {
      toast.error("Godzina zakończenia musi być po godzinie rozpoczęcia.");
      return;
    }
    addAppointment({
      type,
      starts_at: new Date(startISO).toISOString(),
      ends_at: new Date(endISO).toISOString(),
      status: "scheduled",
      patient_id: type === "patient_visit" ? patientId : undefined,
      visit_label_id: type === "patient_visit" ? labelId || undefined : undefined,
      title: type === "family_event" ? title || "Wydarzenie rodzinne" : undefined,
    });
    toast.success("Wpis dodany.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy wpis</DialogTitle>
          <DialogDescription>
            Dodaj wizytę pacjenta lub wydarzenie rodzinne.
          </DialogDescription>
        </DialogHeader>

        {familyOnly ? null : (
          <Tabs value={type} onValueChange={(v) => setType(v as AppointmentType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="patient_visit">Wizyta pacjenta</TabsTrigger>
              <TabsTrigger value="family_event">Wydarzenie rodzinne</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3">
              <Label htmlFor="a-date">Data</Label>
              <Input
                id="a-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="a-start">Od</Label>
              <Input
                id="a-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="a-end">Do</Label>
              <Input
                id="a-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <AvailabilityStrip
            date={date}
            onDateChange={setDate}
            start={start}
            end={end}
            onRangeChange={(s, e) => {
              setStart(s);
              setEnd(e);
            }}
            appointments={appointments}
          />


          {type === "patient_visit" ? (
            <>
              <div>
                <Label>Pacjent</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz pacjenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} — {p.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etykieta zabiegu</Label>
                <Select value={labelId} onValueChange={setLabelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz etykietę" />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="a-title">Nazwa wydarzenia</Label>
              <Input
                id="a-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Obiad z rodziną"
              />
            </div>
          )}

          {overlapping ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Ten termin nachodzi na inny wpis. Możesz go zapisać mimo to.
              </p>
            </div>
          ) : null}

          {noServiceConsent ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-sm text-secondary-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Ten pacjent nie ma zgody obsługowej — SMS-y nie zostaną wysłane.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={submit}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
