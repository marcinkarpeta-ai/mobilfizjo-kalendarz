import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  DEFAULT_END,
  DEFAULT_START,
  addDaysISO,
  hashSecret,
  localToUtc,
  slotsForDay,
  timeToMin,
  todayInWarsaw,
  utcToLocal,
  weekdayOf,
  type Block,
} from "@/lib/booking.server";

const Payload = z.object({
  token: z.string().min(16).max(128),
  service_id: z.string().uuid(),
  starts_at: z.string().min(10).max(40),
});

export const Route = createFileRoute("/api/booking/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof Payload>;
        try {
          payload = Payload.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const startsAt = new Date(payload.starts_at);
        if (Number.isNaN(startsAt.getTime())) {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const tokenHash = await hashSecret(payload.token);
        const { data: session } = await supabaseAdmin
          .from("booking_sessions")
          .select("id, patient_id, expires_at")
          .eq("token_hash", tokenHash)
          .eq("verified", true)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!session?.patient_id) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { data: patient } = await supabaseAdmin
          .from("patients")
          .select("id, booking_consent_at, archived_at")
          .eq("id", session.patient_id)
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
          return Response.json({ error: "booking_disabled" }, { status: 409 });
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
        const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);

        // Okno czasowe: wyprzedzenie i horyzont.
        const earliest = new Date(
          Date.now() + (settings.booking_min_hours_ahead ?? 12) * 60 * 60 * 1000,
        );
        if (startsAt < earliest) {
          return Response.json({ error: "too_soon" }, { status: 409 });
        }
        const local = utcToLocal(startsAt.toISOString());
        const maxDate = addDaysISO(todayInWarsaw(), settings.booking_days_ahead ?? 14);
        if (local.date > maxDate) {
          return Response.json({ error: "too_far" }, { status: 409 });
        }

        // Dzień wolny / zamknięty + godziny pracy.
        const [offRes, whRes] = await Promise.all([
          supabaseAdmin.from("day_off").select("date, blocks_booking").eq("date", local.date),
          supabaseAdmin
            .from("working_hours")
            .select("weekday, is_open, start_time, end_time, break_start, break_end")
            .eq("weekday", weekdayOf(local.date)),
        ]);
        if ((offRes.data ?? []).some((d) => d.blocks_booking)) {
          return Response.json({ error: "day_closed" }, { status: 409 });
        }
        const wh = (whRes.data ?? [])[0];
        if (wh && !wh.is_open) {
          return Response.json({ error: "day_closed" }, { status: 409 });
        }
        const openMin = (wh ? timeToMin(String(wh.start_time)) : null) ?? DEFAULT_START;
        const closeMin = (wh ? timeToMin(String(wh.end_time)) : null) ?? DEFAULT_END;

        // Ta sama reguła kandydatów co w /slots.
        const dayStart = localToUtc(local.date, 0).toISOString();
        const dayEnd = localToUtc(addDaysISO(local.date, 1), 0).toISOString();
        const { data: appts } = await supabaseAdmin
          .from("appointments")
          .select("starts_at, ends_at")
          .eq("status", "scheduled")
          .gte("starts_at", dayStart)
          .lt("starts_at", dayEnd);

        const blocks: Block[] = (appts ?? []).map((a) => {
          const s = utcToLocal(a.starts_at);
          const e = utcToLocal(a.ends_at);
          return { startMin: s.minutes, endMin: e.date === s.date ? e.minutes : 24 * 60 };
        });

        const allowed = slotsForDay(blocks, openMin, closeMin, duration);
        if (!allowed.includes(local.minutes)) {
          return Response.json({ error: "slot_taken" }, { status: 409 });
        }

        const { error } = await supabaseAdmin.rpc("book_online_appointment", {
          _patient_id: patient.id,
          _visit_label_id: service.id,
          _starts_at: startsAt.toISOString(),
          _ends_at: endsAt.toISOString(),
        });
        if (error) {
          if ((error.message ?? "").includes("slot_taken")) {
            return Response.json({ error: "slot_taken" }, { status: 409 });
          }
          return Response.json({ error: "internal_error" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        });
      },
    },
  },
});
