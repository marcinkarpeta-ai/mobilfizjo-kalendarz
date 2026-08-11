import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  addDaysISO,
  hashSecret,
  localToUtc,
  minToTime,
  timeToMin,
  todayInWarsaw,
  utcToLocal,
  weekdayOf,
} from "@/lib/booking.server";

const Payload = z.object({
  token: z.string().min(16).max(128),
  service_id: z.string().uuid(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const DEFAULT_START = 7 * 60;
const DEFAULT_END = 20 * 60;
const EMPTY_DAY_WINDOW = 120; // pierwsze 2 godziny pracy
const STEPS = [40, 60];

interface Block {
  startMin: number;
  endMin: number;
}

function slotsForDay(
  dayBlocks: Block[],
  openMin: number,
  closeMin: number,
  duration: number,
): number[] {
  const sorted = [...dayBlocks].sort((a, b) => a.startMin - b.startMin);
  const candidates = new Set<number>();

  if (sorted.length === 0) {
    for (let t = openMin; t <= openMin + EMPTY_DAY_WINDOW; t += 20) {
      if (t === openMin || STEPS.some((s) => (t - openMin) % s === 0)) {
        candidates.add(t);
      }
    }
  } else {
    for (const b of sorted) {
      candidates.add(b.endMin);
      for (const s of STEPS) candidates.add(b.endMin + s);
    }
  }

  const out: number[] = [];
  for (const start of [...candidates].sort((a, b) => a - b)) {
    if (start < openMin) continue;
    const end = start + duration;
    if (end > closeMin) continue;
    const overlaps = sorted.some((b) => start < b.endMin && end > b.startMin);
    if (overlaps) continue;
    out.push(start);
  }
  return out;
}

export const Route = createFileRoute("/api/booking/slots")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof Payload>;
        try {
          payload = Payload.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const tokenHash = await hashSecret(payload.token);
        const { data: session } = await supabaseAdmin
          .from("booking_sessions")
          .select("id, patient_id, expires_at, verified")
          .eq("token_hash", tokenHash)
          .eq("verified", true)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!session) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        // Cofnięcie zgody unieważnia sesję natychmiast.
        const { data: patient } = await supabaseAdmin
          .from("patients")
          .select("id, booking_consent_at, archived_at")
          .eq("id", session.patient_id ?? "")
          .maybeSingle();
        if (!patient?.booking_consent_at || patient.archived_at) {
          await supabaseAdmin
            .from("booking_sessions")
            .update({ verified: false, token_hash: null })
            .eq("id", session.id);
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("booking_enabled, booking_days_ahead, booking_min_hours_ahead")
          .limit(1)
          .maybeSingle();
        if (!settings?.booking_enabled) {
          return Response.json({ ok: true, slots: [] });
        }

        const { data: service } = await supabaseAdmin
          .from("visit_labels")
          .select("id, duration_minutes, bookable")
          .eq("id", payload.service_id)
          .maybeSingle();
        if (!service || !service.bookable) {
          return Response.json({ error: "service_unavailable" }, { status: 400 });
        }
        const duration = service.duration_minutes ?? 60;

        const today = todayInWarsaw();
        const maxDate = addDaysISO(today, settings.booking_days_ahead ?? 14);
        const from = payload.date_from < today ? today : payload.date_from;
        const to = payload.date_to > maxDate ? maxDate : payload.date_to;
        if (from > to) return Response.json({ ok: true, slots: [] });

        const earliest = new Date(
          Date.now() + (settings.booking_min_hours_ahead ?? 12) * 60 * 60 * 1000,
        );

        const rangeStart = localToUtc(from, 0).toISOString();
        const rangeEnd = localToUtc(addDaysISO(to, 1), 0).toISOString();

        const [apptsRes, whRes, offRes] = await Promise.all([
          supabaseAdmin
            .from("appointments")
            .select("starts_at, ends_at, status")
            .eq("status", "scheduled")
            .gte("starts_at", rangeStart)
            .lt("starts_at", rangeEnd),
          supabaseAdmin.from("working_hours").select("weekday, is_open, start_time, end_time"),
          supabaseAdmin.from("day_off").select("date, blocks_booking"),
        ]);

        const blocksByDay = new Map<string, Block[]>();
        for (const a of apptsRes.data ?? []) {
          const s = utcToLocal(a.starts_at);
          const e = utcToLocal(a.ends_at);
          const endMin = e.date === s.date ? e.minutes : 24 * 60;
          const arr = blocksByDay.get(s.date) ?? [];
          arr.push({ startMin: s.minutes, endMin });
          blocksByDay.set(s.date, arr);
        }

        const whByDay = new Map(
          (whRes.data ?? []).map((w) => [w.weekday as number, w]),
        );
        const blockedDates = new Set(
          (offRes.data ?? []).filter((d) => d.blocks_booking).map((d) => d.date),
        );

        const slots: { date: string; time: string; ends_at: string }[] = [];
        for (let date = from; date <= to; date = addDaysISO(date, 1)) {
          if (blockedDates.has(date)) continue;
          const wh = whByDay.get(weekdayOf(date));
          if (wh && !wh.is_open) continue;
          const openMin = (wh ? timeToMin(String(wh.start_time)) : null) ?? DEFAULT_START;
          const closeMin = (wh ? timeToMin(String(wh.end_time)) : null) ?? DEFAULT_END;
          if (closeMin <= openMin) continue;

          for (const start of slotsForDay(
            blocksByDay.get(date) ?? [],
            openMin,
            closeMin,
            duration,
          )) {
            if (localToUtc(date, start) < earliest) continue;
            slots.push({
              date,
              time: minToTime(start),
              ends_at: minToTime(start + duration),
            });
          }
        }

        return Response.json({ ok: true, duration_minutes: duration, slots });
      },
    },
  },
});
