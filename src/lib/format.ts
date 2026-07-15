import { format, isSameDay, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

export function fmtDate(iso: string | Date, pattern = "d MMMM yyyy") {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, pattern, { locale: pl });
}

export function fmtTime(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

export function fmtDateLong(d: Date = new Date()) {
  return format(d, "EEEE, d MMMM yyyy", { locale: pl });
}

export function fmtWeekday(d: Date) {
  return format(d, "EEEE", { locale: pl });
}

export function isSameLocalDay(iso: string, day: Date) {
  return isSameDay(parseISO(iso), day);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return parseISO(aStart) < parseISO(bEnd) && parseISO(bStart) < parseISO(aEnd);
}

export function formatPatientName(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const parts = [p.first_name, p.last_name]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  return parts.length > 0 ? parts.join(" ") : "(bez nazwiska)";
}

export function formatPatientNameLastFirst(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const parts = [p.last_name, p.first_name]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  return parts.length > 0 ? parts.join(" ") : "(bez nazwiska)";
}

export function isPatientNameIncomplete(p: {
  first_name?: string | null;
  last_name?: string | null;
}): boolean {
  return !(p.first_name ?? "").trim() || !(p.last_name ?? "").trim();
}

const patientCollator = new Intl.Collator("pl", {
  sensitivity: "base",
  numeric: true,
});

export function comparePatients(
  a: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  },
  b: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  },
): number {
  const aLast = (a.last_name ?? "").trim();
  const aFirst = (a.first_name ?? "").trim();
  const bLast = (b.last_name ?? "").trim();
  const bFirst = (b.first_name ?? "").trim();
  const aKey = aLast || aFirst;
  const bKey = bLast || bFirst;
  const primary = patientCollator.compare(aKey, bKey);
  if (primary !== 0) return primary;
  const secondary = patientCollator.compare(aFirst, bFirst);
  if (secondary !== 0) return secondary;
  return (a.phone ?? "").localeCompare(b.phone ?? "");
}
