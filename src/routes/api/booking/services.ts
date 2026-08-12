import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hashSecret } from "@/lib/booking.server";

const Payload = z.object({ token: z.string().min(16).max(128) });

export const Route = createFileRoute("/api/booking/services")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let token: string;
        try {
          token = Payload.parse(await request.json()).token;
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const tokenHash = await hashSecret(token);
        const { data: session } = await supabaseAdmin
          .from("booking_sessions")
          .select("id")
          .eq("token_hash", tokenHash)
          .eq("verified", true)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("booking_enabled, booking_days_ahead")
          .limit(1)
          .maybeSingle();
        if (!settings?.booking_enabled) {
          return Response.json({ ok: true, services: [], days_ahead: 0 });
        }

        const { data } = await supabaseAdmin
          .from("visit_labels")
          .select("id, name, duration_minutes, price_pln, description, sort_order")
          .eq("bookable", true)
          .order("sort_order", { ascending: true });

        return Response.json({
          ok: true,
          days_ahead: settings.booking_days_ahead ?? 14,
          services: (data ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            duration_minutes: s.duration_minutes ?? 60,
            price_pln: s.price_pln === null || s.price_pln === undefined ? null : Number(s.price_pln),
            description: s.description ?? null,
          })),
        });
      },
    },
  },
});
