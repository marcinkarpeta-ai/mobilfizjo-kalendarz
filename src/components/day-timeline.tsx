import { Link } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { CalendarX2 } from "lucide-react";
import type { Appointment, Patient, VisitLabel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

// Group overlapping active appointments and assign side-by-side columns.
function layoutColumns(items: Appointment[]): Positioned[] {
  const active = items
    .filter((a) => a.status !== "cancelled")
    .map((a) => ({ a, s: minutesOfDay(a.starts_at), e: minutesOfDay(a.ends_at) }))
    .sort((x, y) => x.s - y.s || x.e - y.e);

  const positioned: Positioned[] = [];
  let cluster: typeof active = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy column assignment.
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

  // Cancelled appointments: render but don't affect layout — always full width, back layer.
  for (const a of items) {
    if (a.status !== "cancelled") continue;
    const s = minutesOfDay(a.starts_at);
    const e = minutesOfDay(a.ends_at);
    const startClamped = Math.max(s, TIMELINE_START);
    const endClamped = Math.min(e, TIMELINE_END);
    if (endClamped <= TIMELINE_START || startClamped >= TIMELINE_END) continue;
    positioned.push({
      appt: a,
      startMin: s,
      endMin: e,
      top: (startClamped - TIMELINE_START) * PX_PER_MIN,
      height: Math.max(MIN_BLOCK_PX, (endClamped - startClamped) * PX_PER_MIN),
      col: 0,
      cols: 1,
    });
  }

  return positioned;
}

function computeGaps(
  items: Appointment[],
  extraBusy: BusyInterval[] = [],
): { start: number; end: number }[] {
  const intervals: { s: number; e: number }[] = [];
  for (const a of items) {
    if (a.status === "cancelled") continue;
    intervals.push({ s: minutesOfDay(a.starts_at), e: minutesOfDay(a.ends_at) });
  }
  for (const b of extraBusy) {
    intervals.push({ s: minutesOfDay(b.starts_at), e: minutesOfDay(b.ends_at) });
  }
  intervals.sort((x, y) => x.s - y.s);

  // Merge overlaps into busy intervals.
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
  date,
  appointments,
  patientById,
  labelById,
  familyView = false,
  busyBlocks = [],
  onGapClick,
}: {
  date: Date;
  appointments: Appointment[];
  patientById: Map<string, Patient>;
  labelById: Map<string, VisitLabel>;
  familyView?: boolean;
  busyBlocks?: BusyInterval[];
  onGapClick: (startHHMM: string, endHHMM: string) => void;
}) {
  const positioned = layoutColumns(appointments);
  const gaps = computeGaps(appointments, busyBlocks);
  const hours = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 60 + 1 }, (_, i) => TIMELINE_START + i * 60);

  return (
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
        const cancelled = appt.status === "cancelled";
        const isPatient = appt.type === "patient_visit";
        const patient = appt.patient_id ? patientById.get(appt.patient_id) : undefined;
        const label = appt.visit_label_id ? labelById.get(appt.visit_label_id) : undefined;

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

        const compact = height < 56;
        const timeText = `${hhmm(p.startMin)}–${hhmm(p.endMin)}`;



        const isFamilyEvent = appt.type === "family_event";
        const showFamilyBadge = isFamilyEvent && !familyView && !cancelled;

        return (
          <article
            key={`ap-${appt.id}-${idx}`}
            className={cn(
              "absolute overflow-hidden rounded-2xl border border-border shadow-sm",
              isFamilyEvent && !cancelled ? "bg-accent/10" : "bg-card",
              cancelled ? "opacity-40 pointer-events-none z-0" : "z-10 hover:border-accent",
              compact ? "p-2" : "p-3",
            )}
            style={{
              top,
              height,
              left: `calc(${GUTTER_PX + 4}px + (100% - ${GUTTER_PX + 4}px) * ${col / cols})`,
              width: `calc((100% - ${GUTTER_PX + 4}px) / ${cols} - 4px)`,
            }}
          >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", accentBar)} />
            {showFamilyBadge ? (
              <Badge
                variant="outline"
                className="pointer-events-none absolute right-1.5 top-1.5 z-20 h-4 px-1.5 text-[10px] font-medium"
              >
                Rodzina
              </Badge>
            ) : null}
            {isPatient && patient && !familyView && !cancelled ? (
              <Link
                to="/pacjenci/$id"
                params={{ id: patient.id }}
                className="absolute inset-0 pl-2"
              >
                <BlockContent
                  compact={compact}
                  time={timeText}
                  title={title}
                  sublabel={sublabel}
                  cancelled={cancelled}
                />
              </Link>
            ) : (
              <div className="pl-2">
                <BlockContent
                  compact={compact}
                  time={timeText}
                  title={title}
                  sublabel={sublabel}
                  cancelled={cancelled}
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
                cancelled={false}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BlockContent({
  compact,
  time,
  title,
  sublabel,
  cancelled,
}: {
  compact: boolean;
  time: string;
  title: string;
  sublabel: string | null;
  cancelled: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 pt-0.5">
        <span
          className={cn(
            "text-[11px] tabular-nums text-muted-foreground",
            cancelled && "line-through",
          )}
        >
          {time}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        {cancelled ? <CalendarX2 className="ml-auto h-3 w-3 text-muted-foreground" aria-hidden /> : null}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground",
          cancelled && "line-through",
        )}
      >
        <span>{time}</span>
        {cancelled ? (
          <span className="inline-flex items-center gap-1 text-[11px]">
            <CalendarX2 className="h-3 w-3" aria-hidden /> Odwołana
          </span>
        ) : null}
      </div>
      <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">{title}</h3>
      {sublabel ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
