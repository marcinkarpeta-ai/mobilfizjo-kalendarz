import { useRef, useState } from "react";
import { addDays, format, parseISO, subDays } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

const START_MIN = 7 * 60;
const END_MIN = 20 * 60;
const RANGE = END_MIN - START_MIN;

function hhmmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
function minToHHMM(min: number) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function pctLeft(min: number) {
  return ((Math.max(START_MIN, Math.min(END_MIN, min)) - START_MIN) / RANGE) * 100;
}
function pctWidth(s: number, e: number) {
  const a = Math.max(START_MIN, Math.min(END_MIN, s));
  const b = Math.max(START_MIN, Math.min(END_MIN, e));
  return Math.max(0, (b - a) / RANGE) * 100;
}
function minutesOfDay(iso: string) {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function appointmentDay(a: Appointment) {
  return format(parseISO(a.starts_at), "yyyy-MM-dd");
}

function computeGaps(items: Appointment[]) {
  const active = items
    .filter((a) => a.status !== "cancelled")
    .map((a) => ({ s: minutesOfDay(a.starts_at), e: minutesOfDay(a.ends_at) }))
    .sort((x, y) => x.s - y.s);
  const busy: { s: number; e: number }[] = [];
  for (const it of active) {
    const s = Math.max(it.s, START_MIN);
    const e = Math.min(it.e, END_MIN);
    if (e <= s) continue;
    const last = busy[busy.length - 1];
    if (last && s <= last.e) last.e = Math.max(last.e, e);
    else busy.push({ s, e });
  }
  const gaps: { s: number; e: number }[] = [];
  let cursor = START_MIN;
  for (const b of busy) {
    if (b.s > cursor) gaps.push({ s: cursor, e: b.s });
    cursor = b.e;
  }
  if (cursor < END_MIN) gaps.push({ s: cursor, e: END_MIN });
  return gaps;
}

export function AvailabilityStrip({
  date,
  onDateChange,
  start,
  end,
  onRangeChange,
  appointments,
}: {
  date: string;
  onDateChange: (d: string) => void;
  start: string;
  end: string;
  onRangeChange: (start: string, end: string) => void;
  appointments: Appointment[];
}) {
  const dayItems = appointments.filter((a) => appointmentDay(a) === date);
  const active = dayItems.filter((a) => a.status !== "cancelled");
  const gaps = computeGaps(dayItems);

  const selStart = hhmmToMin(start);
  const selEnd = hhmmToMin(end);

  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const [, force] = useState(0);

  const changeDay = (delta: number) => {
    const d = parseISO(date);
    const next = delta > 0 ? addDays(d, 1) : subDays(d, 1);
    onDateChange(format(next, "yyyy-MM-dd"));
  };

  const hourTicks = [7, 10, 13, 16, 20];

  const dayLabel = (() => {
    try {
      return format(parseISO(date), "EEE, d MMMM", { locale: pl });
    } catch {
      return date;
    }
  })();

  return (
    <div className="mt-1">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="Poprzedni dzień"
          onClick={() => changeDay(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-foreground">{dayLabel}</span>
        <button
          type="button"
          aria-label="Następny dzień"
          onClick={() => changeDay(1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        role="group"
        aria-label={`Dostępność dnia ${dayLabel}`}
        className="relative h-16 touch-pan-y select-none overflow-hidden rounded-xl border border-border bg-secondary/40"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!swipe.current) return;
          if (Math.abs(e.clientX - swipe.current.x) > 8) swipe.current.moved = true;
          force((n) => n + 0); // no-op, keep type
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 50) {
            changeDay(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {/* Gap click targets (behind everything visual) */}
        {gaps.map((g) => (
          <button
            key={`gap-${g.s}`}
            type="button"
            aria-label={`Ustaw termin od ${minToHHMM(g.s)}`}
            onClick={(e) => {
              if (swipe.current?.moved) {
                e.preventDefault();
                return;
              }
              const s = g.s;
              const e2 = Math.min(g.e, s + 45);
              onRangeChange(minToHHMM(s), minToHHMM(Math.max(e2, s + 15)));
            }}
            className="absolute top-0 bottom-0 z-10 rounded-md hover:bg-accent/10 focus-visible:bg-accent/15 focus-visible:outline-none"
            style={{ left: `${pctLeft(g.s)}%`, width: `${pctWidth(g.s, g.e)}%` }}
          />
        ))}

        {/* Busy blocks */}
        {active.map((a) => {
          const s = minutesOfDay(a.starts_at);
          const e = minutesOfDay(a.ends_at);
          if (e <= START_MIN || s >= END_MIN) return null;
          const color = a.type === "patient_visit" ? "bg-primary" : "bg-accent";
          return (
            <div
              key={`b-${a.id}`}
              title={`${minToHHMM(s)}–${minToHHMM(e)}`}
              className={cn(
                "pointer-events-none absolute top-2 bottom-2 z-20 rounded-md",
                color,
              )}
              style={{ left: `${pctLeft(s)}%`, width: `${pctWidth(s, e)}%` }}
            />
          );
        })}

        {/* Cancelled — faded, no layout effect */}
        {dayItems
          .filter((a) => a.status === "cancelled")
          .map((a) => {
            const s = minutesOfDay(a.starts_at);
            const e = minutesOfDay(a.ends_at);
            if (e <= START_MIN || s >= END_MIN) return null;
            const color = a.type === "patient_visit" ? "bg-primary" : "bg-accent";
            return (
              <div
                key={`c-${a.id}`}
                className={cn(
                  "pointer-events-none absolute top-2 bottom-2 z-20 rounded-md opacity-25",
                  color,
                )}
                style={{ left: `${pctLeft(s)}%`, width: `${pctWidth(s, e)}%` }}
              />
            );
          })}

        {/* Collision overlays: intersect selected range with each active block */}
        {active.map((a) => {
          const s = minutesOfDay(a.starts_at);
          const e = minutesOfDay(a.ends_at);
          const os = Math.max(s, selStart);
          const oe = Math.min(e, selEnd);
          if (oe <= os) return null;
          return (
            <div
              key={`col-${a.id}`}
              className="pointer-events-none absolute top-2 bottom-2 z-30 rounded-md bg-destructive/70"
              style={{ left: `${pctLeft(os)}%`, width: `${pctWidth(os, oe)}%` }}
            />
          );
        })}

        {/* Selected range outline */}
        {selEnd > selStart ? (
          <div
            className="pointer-events-none absolute top-1 bottom-1 z-40 rounded-md border-2 border-foreground/70"
            style={{
              left: `${pctLeft(selStart)}%`,
              width: `${pctWidth(selStart, selEnd)}%`,
            }}
          />
        ) : null}
      </div>

      {/* Hour scale */}
      <div className="relative mt-1 h-4">
        {hourTicks.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
            style={{ left: `${pctLeft(h * 60)}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
    </div>
  );
}
