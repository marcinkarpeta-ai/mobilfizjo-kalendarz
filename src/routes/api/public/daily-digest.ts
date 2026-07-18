import { createFileRoute } from "@tanstack/react-router";
import { verifyN8nBearer } from "@/lib/n8n-auth.server";

const TZ = "Europe/Warsaw";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bieżąca data (YYYY-MM-DD) wg strefy Europe/Warsaw. */
function todayInWarsaw(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** date + N dni (operacja na kalendarzowej dacie, niezależna od DST). */
function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Offset "+02:00" / "+01:00" w Europe/Warsaw dla północy danej daty. */
function warsawOffsetFor(dateStr: string): string {
  // Rzutujemy 12:00 UTC danej daty na Warszawę i sprawdzamy różnicę godzin.
  // Dla północy lokalnej offset jest ten sam (DST przełącza się o 02:00/03:00).
  const [y, m, d] = dateStr.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(noonUtc);
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const offsetHours = hour - 12; // 1 lub 2
  const sign = offsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(offsetHours);
  return `${sign}${String(abs).padStart(2, "0")}:00`;
}

function dayBoundsUtc(dateStr: string): { startUtc: string; endUtc: string } {
  const startOff = warsawOffsetFor(dateStr);
  const nextDay = addDaysISO(dateStr, 1);
  const endOff = warsawOffsetFor(nextDay);
  const startUtc = new Date(`${dateStr}T00:00:00${startOff}`).toISOString();
  const endUtc = new Date(`${nextDay}T00:00:00${endOff}`).toISOString();
  return { startUtc, endUtc };
}

function formatName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const parts = [first, last]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  return parts.length > 0 ? parts.join(" ") : "(bez nazwiska)";
}

export const Route = createFileRoute("/api/public/daily-digest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const unauthorized = verifyN8nBearer(request);
        if (unauthorized) return unauthorized;

        const url = new URL(request.url);
        const dateParam = url.searchParams.get("date");
        let date: string;
        if (dateParam === null || dateParam === "") {
          date = addDaysISO(todayInWarsaw(), 1);
        } else if (!DATE_RE.test(dateParam)) {
          return new Response(
            JSON.stringify({ error: "invalid_date_format" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        } else {
          date = dateParam;
        }

        const { startUtc, endUtc } = dayBoundsUtc(date);

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data, error } = await supabaseAdmin
          .from("appointments")
          .select(
            "starts_at, ends_at, type, title, patients(first_name, last_name, salutation, phone), visit_labels(name)",
          )
          .eq("status", "scheduled")
          .gte("starts_at", startUtc)
          .lt("starts_at", endUtc)
          .order("starts_at", { ascending: true });

        if (error) {
          return new Response(JSON.stringify({ error: "internal_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        type Row = {
          starts_at: string;
          ends_at: string;
          type: string;
          title: string | null;
          patients:
            | {
                first_name: string | null;
                last_name: string | null;
                salutation: string | null;
                phone: string | null;
              }
            | null;
          visit_labels: { name: string | null } | null;
        };

        const rows = (data ?? []) as unknown as Row[];

        const visits = rows
          .filter((r) => r.type === "patient_visit")
          .map((r) => ({
            starts_at: r.starts_at,
            ends_at: r.ends_at,
            patient_name: formatName(
              r.patients?.first_name,
              r.patients?.last_name,
            ),
            phone: r.patients?.phone ?? null,
            salutation: r.patients?.salutation ?? null,
            label: r.visit_labels?.name ?? null,
          }));

        const family_events = rows
          .filter((r) => r.type === "family_event")
          .map((r) => ({
            starts_at: r.starts_at,
            ends_at: r.ends_at,
            title: r.title ?? null,
          }));

        return Response.json({ date, visits, family_events });
      },
    },
  },
});
