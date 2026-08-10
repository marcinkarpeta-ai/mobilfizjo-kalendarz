import { format, parseISO } from "date-fns";
import type { Appointment, DayOff, WorkingHours } from "./types";

export const DEFAULT_START_MIN = 7 * 60;
export const DEFAULT_END_MIN = 20 * 60;

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
  6: "Sobota",
  0: "Niedziela",
};

/** Kolejność wyświetlania: pon → nd */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function timeToMin(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minToTime(min: number) {
  const clamped = Math.max(0, Math.min(24 * 60, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface DayRange {
  startMin: number;
  endMin: number;
  /** dzień zamknięty wg godzin pracy */
  closed: boolean;
  /** dzień oznaczony jako wolny */
  dayOff: boolean;
  dayOffReason: string | null;
  /** etykieta „Nieczynne” / „Dzień wolny” lub null */
  label: string | null;
}

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function minutesOfDay(iso: string) {
  const d = parseISO(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Zakres godzin osi dla danego dnia: z godzin pracy, rozszerzony tak,
 * żeby mieściły się istniejące wpisy.
 */
export function getDayRange(
  date: Date,
  workingHours: WorkingHours[],
  daysOff: DayOff[],
  appointments: Appointment[] = [],
): DayRange {
  const wd = date.getDay();
  const wh = workingHours.find((w) => w.weekday === wd);
  const off = daysOff.find((d) => d.date === dayKey(date));

  const closed = wh ? !wh.is_open : false;

  let startMin = DEFAULT_START_MIN;
  let endMin = DEFAULT_END_MIN;
  if (wh && wh.is_open) {
    startMin = timeToMin(wh.start_time) ?? DEFAULT_START_MIN;
    endMin = timeToMin(wh.end_time) ?? DEFAULT_END_MIN;
  }
  if (endMin <= startMin) {
    startMin = DEFAULT_START_MIN;
    endMin = DEFAULT_END_MIN;
  }

  const key = dayKey(date);
  for (const a of appointments) {
    if (format(parseISO(a.starts_at), "yyyy-MM-dd") !== key) continue;
    const s = minutesOfDay(a.starts_at);
    const e = minutesOfDay(a.ends_at);
    if (s < startMin) startMin = Math.floor(s / 60) * 60;
    if (e > endMin) endMin = Math.min(24 * 60, Math.ceil(e / 60) * 60);
  }

  const label = off ? "Dzień wolny" : closed ? "Nieczynne" : null;

  return {
    startMin,
    endMin,
    closed,
    dayOff: !!off,
    dayOffReason: off?.reason ?? null,
    label,
  };
}
