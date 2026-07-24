import { useState } from "react";
import { parseISO } from "date-fns";
import { CalendarX2, ChevronDown } from "lucide-react";
import type { Appointment, Patient, VisitLabel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPatientName } from "@/lib/format";
import { useNow } from "@/hooks/use-now";


export interface BusyInterval {
  starts_at: string;
  ends_at: string;
}

const TIMELINE_START = 7 * 60; // 07:00
const TIMELINE_END = 20 * 60; // 20:00
const PX_PER_MIN = 1;
const TOTAL_MIN = TIMELINE_END - TIMELINE_START;
const TOTAL_PX = TOTAL_MIN * PX_PER_MIN;
const GUTTER_PX = 48; // hour label column
const MIN_BLOCK_PX = 24;

function hhmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesOfDay(iso: string) {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

type Positioned = {
  appt: Appointment;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  col: number;
  cols: number;
};

// Group overlapping appointments and assign side-by-side columns.
// Input MUST be pre-filtered (no cancelled).
function layoutColumns(items: Appointment[]): Positioned[] {
  const active = items
    .map((a) => ({ a, s: minutesOfDay(a.starts_at), e: minutesOfDay(a.ends_at) }))
    .sort((x, y) => x.s - y.s || x.e - y.e);

  const positioned: Positioned[] = [];
  let cluster: typeof active = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const assigned: { item: typeof cluster[number]; col: number }[] = [];
    for (const it of cluster) {
      let placed = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= it.s) {
          placed = c;
          colEnds[c] = it.e;
          break;
        }
      }
      if (placed === -1) {
        placed = colEnds.length;
        colEnds.push(it.e);
      }
      assigned.push({ item: it, col: placed });
    }
    const cols = colEnds.length;
    for (const { item, col } of assigned) {
      const startClamped = Math.max(item.s, TIMELINE_START);
      const endClamped = Math.min(item.e, TIMELINE_END);
      const top = (startClamped - TIMELINE_START) * PX_PER_MIN;
      const height = Math.max(MIN_BLOCK_PX, (endClamped - startClamped) * PX_PER_MIN);
      positioned.push({
        appt: item.a,
        startMin: item.s,
        endMin: item.e,
        top,
        height,
        col,
        cols,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of active) {
    if (cluster.length === 0 || it.s < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.e);
    } else {
      flush();
      cluster.push(it);
      clusterEnd = it.e;
    }
  }
  flush();

  return positioned;
}

function computeGaps(
  items: Appointment[],
  extraBusy: BusyInterval[] = [],
): { start: number; end: number }[] {
  const intervals: { s: number; e: number }[] = [];
  for (const a of items) {
    intervals.push({ s: minutesOfDay(a.starts_at), e: minutesOfDay(a.ends_at) });
  }
  for (const b of extraBusy) {
    intervals.push({ s: minutesOfDay(b.starts_at), e: minutesOfDay(b.ends_at) });
  }
  intervals.sort((x, y) => x.s - y.s);

  const busy: { s: number; e: number }[] = [];
  for (const it of intervals) {
    const s = Math.max(it.s, TIMELINE_START);
    const e = Math.min(it.e, TIMELINE_END);
    if (e <= s) continue;
    const last = busy[busy.length - 1];
    if (last && s <= last.e) {
      last.e = Math.max(last.e, e);
    } else {
      busy.push({ s, e });
    }
  }

  const gaps: { start: number; end: number }[] = [];
  let cursor = TIMELINE_START;
  for (const b of busy) {
    if (b.s > cursor) gaps.push({ start: cursor, end: b.s });
    cursor = b.e;
  }
  if (cursor < TIMELINE_END) gaps.push({ start: cursor, end: TIMELINE_END });
  return gaps;
}

export function DayTimeline({
  date: _date,
  appointments,
  patientById,
  labelById,
  familyView = false,
  busyBlocks = [],
  onGapClick,
  onSelectAppointment,
}: {
  date: Date;
  appointments: Appointment[];
  patientById: Map<string, Patient>;
  labelById: Map<string, VisitLabel>;
  familyView?: boolean;
  busyBlocks?: BusyInterval[];
  onGapClick: (startHHMM: string, endHHMM: string) => void;
  onSelectAppointment?: (appt: Appointment) => void;
}) {
  void _date;
  const now = useNow();
  const nowMs = now.getTime();
  const active = appointments.filter((a) => a.status !== "cancelled");
  const cancelled = appointments
    .filter((a) => a.status === "cancelled")
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());

  const positioned = layoutColumns(active);
  const gaps = computeGaps(active, busyBlocks);
  const hours = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 60 + 1 }, (_, i) => TIMELINE_START + i * 60);

  const [cancelledOpen, setCancelledOpen] = useState(false);
  const showCancelledSection = !familyView && cancelled.length > 0;


  return (
    <>
      <div className="relative" style={{ height: TOTAL_PX + 8 }}>
      {/* Hour lines + labels */}
      {hours.map((h) => {
        const top = (h - TIMELINE_START) * PX_PER_MIN;
        return (
          <div key={h} className="absolute left-0 right-0" style={{ top }}>
            <div className="flex items-start">
              <div
                className="pr-2 text-right text-[11px] tabular-nums text-muted-foreground"
                style={{ width: GUTTER_PX, transform: "translateY(-6px)" }}
              >
                {hhmm(h)}
              </div>
              <div className="flex-1 border-t border-border/60" />
            </div>
          </div>
        );
      })}
      {/* Half-hour dashed lines */}
      {hours.slice(0, -1).map((h) => {
        const top = (h + 30 - TIMELINE_START) * PX_PER_MIN;
        return (
          <div
            key={`half-${h}`}
            className="absolute border-t border-dashed border-border/30"
            style={{ top, left: GUTTER_PX, right: 0 }}
          />
        );
      })}

      {/* Gaps (click to add) */}
      {gaps.map((g) => {
        const top = (g.start - TIMELINE_START) * PX_PER_MIN;
        const height = (g.end - g.start) * PX_PER_MIN;
        const startLabel = hhmm(g.start);
        const endLabel = hhmm(g.end);
        const long = g.end - g.start > 30;
        return (
          <button
            key={`gap-${g.start}`}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const offsetPx = e.clientY - rect.top;
              const clickedMin = g.start + Math.floor(offsetPx / PX_PER_MIN);
              let startMin = Math.floor(clickedMin / 30) * 30;
              startMin = Math.max(startMin, g.start);
              let endMin = startMin + 60;
              if (endMin > g.end) endMin = g.end;
              if (endMin - startMin < 15) {
                startMin = Math.max(g.start, endMin - 15);
              }
              onGapClick(hhmm(startMin), hhmm(endMin));
            }}
            aria-label={`Nowy wpis ${startLabel}–${endLabel}`}
            className="group absolute rounded-lg transition-colors hover:bg-accent/10 focus-visible:bg-accent/15 focus-visible:outline-none"
            style={{ top, height, left: GUTTER_PX + 4, right: 0 }}
          >
            {long ? (
              <span className="pointer-events-none block text-center text-[11px] font-medium tracking-wide text-muted-foreground/70">
                Wolne {startLabel}–{endLabel}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* Appointment blocks */}
      {positioned.map((p, idx) => {
        const { appt, top, height, col, cols } = p;
        const isPatient = appt.type === "patient_visit";
        const patient = appt.patient_id ? patientById.get(appt.patient_id) : undefined;
        const label = appt.visit_label_id ? labelById.get(appt.visit_label_id) : undefined;

        const title = familyView && isPatient
          ? "Zajęte"
          : isPatient
            ? patient
              ? formatPatientName(patient)
              : "Pacjent"
            : appt.title ?? "Wydarzenie rodzinne";
        const sublabel = familyView && isPatient
          ? null
          : isPatient
            ? label?.name ?? "Wizyta"
            : "Wydarzenie rodzinne";

        const isFamilyEvent = appt.type === "family_event";
        const accentBar = isFamilyEvent ? "bg-family-bar" : "bg-primary";

        const compact = height < 56;
        const timeText = `${hhmm(p.startMin)}–${hhmm(p.endMin)}`;

        const endsAtMs = parseISO(appt.ends_at).getTime();
        const startsAtMs = parseISO(appt.starts_at).getTime();
        const isPast = endsAtMs <= nowMs;
        const isOngoing = startsAtMs <= nowMs && nowMs < endsAtMs;

        const showFamilyBadge = isFamilyEvent && !familyView;

        const clickable =
          !!onSelectAppointment && !(familyView && isPatient);

        return (
          <article
            key={`ap-${appt.id}-${idx}`}
            className={cn(
              "absolute z-10 overflow-hidden rounded-2xl border border-border shadow-sm hover:border-accent",
              isFamilyEvent ? "bg-family" : "bg-card",
              isPast && "opacity-60",
              isOngoing && (isFamilyEvent ? "border-family-bar" : "border-primary"),
              compact ? "p-2" : "p-3",
            )}
            style={{
              top,
              height,
              left: `calc(${GUTTER_PX + 4}px + (100% - ${GUTTER_PX + 4}px) * ${col / cols})`,
              width: `calc((100% - ${GUTTER_PX + 4}px) / ${cols} - 4px)`,
            }}
          >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", accentBar, isPast && "opacity-60")} />

            {showFamilyBadge ? (
              <Badge
                variant="outline"
                className="pointer-events-none absolute right-1.5 top-1.5 z-20 h-4 px-1.5 text-[10px] font-medium"
              >
                Rodzina
              </Badge>
            ) : null}
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelectAppointment?.(appt)}
                className="absolute inset-0 pl-2 text-left"
              >
                <BlockContent
                  compact={compact}
                  time={timeText}
                  title={title}
                  sublabel={sublabel}
                />
              </button>
            ) : (
              <div className="pl-2">
                <BlockContent
                  compact={compact}
                  time={timeText}
                  title={title}
                  sublabel={sublabel}
                />
              </div>
            )}
          </article>
        );
      })}

      {/* Busy blocks (family role) — non-clickable */}
      {busyBlocks.map((b, idx) => {
        const s = minutesOfDay(b.starts_at);
        const e = minutesOfDay(b.ends_at);
        const startClamped = Math.max(s, TIMELINE_START);
        const endClamped = Math.min(e, TIMELINE_END);
        if (endClamped <= startClamped) return null;
        const top = (startClamped - TIMELINE_START) * PX_PER_MIN;
        const height = Math.max(MIN_BLOCK_PX, (endClamped - startClamped) * PX_PER_MIN);
        const compact = height < 56;
        const timeText = `${hhmm(s)}–${hhmm(e)}`;
        return (
          <article
            key={`busy-${idx}-${b.starts_at}`}
            aria-label={`Zajęte ${timeText}`}
            className={cn(
              "absolute z-10 overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-sm",
              compact ? "p-2" : "p-3",
            )}
            style={{ top, height, left: GUTTER_PX + 4, right: 0 }}
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-muted-foreground/40" />
            <div className="pl-2">
              <BlockContent
                compact={compact}
                time={timeText}
                title="Zajęte"
                sublabel={null}
              />
            </div>
          </article>
        );
      })}
      </div>

      {showCancelledSection ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setCancelledOpen((v) => !v)}
            aria-expanded={cancelledOpen}
            className="flex w-full items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", !cancelledOpen && "-rotate-90")}
              aria-hidden
            />
            <span>Odwołane ({cancelled.length})</span>
          </button>
          {cancelledOpen ? (
            <ul className="mt-2 space-y-1">
              {cancelled.map((a) => {
                const isPatient = a.type === "patient_visit";
                const patient = a.patient_id ? patientById.get(a.patient_id) : undefined;
                const name = isPatient
                  ? patient
                    ? formatPatientName(patient)
                    : "Pacjent"
                  : a.title ?? "Wydarzenie rodzinne";
                const time = `${hhmm(minutesOfDay(a.starts_at))}–${hhmm(minutesOfDay(a.ends_at))}`;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAppointment?.(a)}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs text-muted-foreground line-through hover:bg-secondary hover:text-foreground/80"
                    >
                      <CalendarX2 className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="tabular-nums">{time}</span>
                      <span className="truncate">· {name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function BlockContent({
  compact,
  time,
  title,
  sublabel,
}: {
  compact: boolean;
  time: string;
  title: string;
  sublabel: string | null;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-[11px] tabular-nums text-muted-foreground">{time}</span>
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
        <span>{time}</span>
      </div>
      <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">{title}</h3>
      {sublabel ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
