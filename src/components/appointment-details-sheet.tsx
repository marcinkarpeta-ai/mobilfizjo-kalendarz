import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarX2, Pencil, Trash2, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { fmtTime } from "@/lib/format";
import type { Appointment } from "@/lib/types";

export function AppointmentDetailsSheet({
  appt,
  onOpenChange,
  onEdit,
}: {
  appt: Appointment | null;
  onOpenChange: (v: boolean) => void;
  onEdit: (appt: Appointment) => void;
}) {
  const patients = useStore((s) => s.patients);
  const labels = useStore((s) => s.labels);
  const role = useStore((s) => s.role);
  const cancelAppointment = useStore((s) => s.cancelAppointment);
  const deleteAppointment = useStore((s) => s.deleteAppointment);

  const isFamily = role === "family";
  const open = appt !== null;

  const patient = appt?.patient_id ? patients.find((p) => p.id === appt.patient_id) : undefined;
  const label = appt?.visit_label_id ? labels.find((l) => l.id === appt.visit_label_id) : undefined;

  const isVisit = appt?.type === "patient_visit";
  const isFamilyEvent = appt?.type === "family_event";
  const cancelled = appt?.status === "cancelled";
  const completed = appt?.status === "completed";

  const title = isVisit
    ? patient
      ? `${patient.first_name} ${patient.last_name}`
      : "Pacjent"
    : appt?.title ?? "Wydarzenie rodzinne";

  const dateLine = appt
    ? capitalize(format(parseISO(appt.starts_at), "EEEE, d MMMM yyyy", { locale: pl }))
    : "";
  const timeLine = appt ? `${fmtTime(appt.starts_at)}–${fmtTime(appt.ends_at)}` : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        {appt ? (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-xl">{title}</SheetTitle>
                {cancelled ? (
                  <Badge variant="secondary" className="gap-1">
                    <CalendarX2 className="h-3 w-3" aria-hidden /> Odwołana
                  </Badge>
                ) : completed ? (
                  <Badge variant="outline">Zakończona</Badge>
                ) : (
                  <Badge variant="outline">Zaplanowana</Badge>
                )}
              </div>
              <SheetDescription className="sr-only">Szczegóły wpisu</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-1 text-sm">
              <div className="text-foreground">{dateLine}</div>
              <div className="tabular-nums text-muted-foreground">{timeLine}</div>
              {isVisit ? (
                <div className="text-muted-foreground">
                  Etykieta: <span className="text-foreground">{label?.name ?? "—"}</span>
                </div>
              ) : null}
            </div>

            <SheetFooter className="mt-6 flex flex-col gap-2 sm:flex-col sm:space-x-0">
              {isVisit && !isFamily && patient ? (
                <Button variant="outline" asChild>
                  <Link
                    to="/pacjenci/$id"
                    params={{ id: patient.id }}
                    onClick={() => onOpenChange(false)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Karta pacjenta
                  </Link>
                </Button>
              ) : null}

              {isVisit && !cancelled && !completed && !isFamily ? (
                <>
                  <Button onClick={() => onEdit(appt)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <CalendarX2 className="mr-2 h-4 w-4" />
                        Odwołaj wizytę
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Odwołać tę wizytę?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Wizyta zostanie oznaczona jako odwołana. Wpis pozostanie w historii.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Nie</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            cancelAppointment(appt.id);
                            onOpenChange(false);
                          }}
                        >
                          Odwołaj
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : null}

              {isFamilyEvent ? (
                <>
                  <Button onClick={() => onEdit(appt)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć wydarzenie?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tej operacji nie można cofnąć.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Nie</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteAppointment(appt.id);
                            onOpenChange(false);
                          }}
                        >
                          Usuń
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : null}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
