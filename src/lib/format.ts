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
