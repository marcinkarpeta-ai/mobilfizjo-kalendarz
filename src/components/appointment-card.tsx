import { Link } from "@tanstack/react-router";
import { CalendarX2, Clock } from "lucide-react";
import type { Appointment, Patient, VisitLabel } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function AppointmentCard({
  appt,
  patient,
  label,
  familyView = false,
}: {
  appt: Appointment;
  patient?: Patient;
  label?: VisitLabel;
  familyView?: boolean;
}) {
  const cancelled = appt.status === "cancelled";
  const completed = appt.status === "completed";

  const isPatient = appt.type === "patient_visit";
  const title = familyView && isPatient
    ? "Zajęte"
    : isPatient
      ? patient
        ? `${patient.first_name} ${patient.last_name}`
        : "Pacjent"
      : appt.title ?? "Wydarzenie rodzinne";

  const sublabel = familyView && isPatient
    ? null
    : isPatient
      ? label?.name ?? "Wizyta"
      : "Wydarzenie rodzinne";

  const accentBar = cancelled
    ? "bg-muted"
    : isPatient
      ? "bg-primary"
      : "bg-accent";

  const isFamilyEvent = appt.type === "family_event";
  const showFamilyBadge = isFamilyEvent && !familyView && !cancelled;

  const inner = (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border p-4 shadow-sm transition-colors",
        isFamilyEvent && !cancelled ? "bg-accent/10" : "bg-card",
        cancelled && "opacity-60",
        !cancelled && "hover:border-accent",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", accentBar)}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span>
              {fmtTime(appt.starts_at)}–{fmtTime(appt.ends_at)}
            </span>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-foreground">
            {title}
          </h3>
          {sublabel ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {sublabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {showFamilyBadge ? (
            <Badge variant="outline" className="text-[10px]">
              Rodzina
            </Badge>
          ) : null}
          {cancelled ? (
            <Badge variant="secondary" className="gap-1">
              <CalendarX2 className="h-3 w-3" aria-hidden /> Odwołana
            </Badge>
          ) : completed ? (
            <Badge variant="outline">Zakończona</Badge>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (familyView || !isPatient || !patient) return inner;

  return (
    <Link to="/pacjenci/$id" params={{ id: patient.id }} className="block">
      {inner}
    </Link>
  );
}
