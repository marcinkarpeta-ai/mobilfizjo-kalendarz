import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { canonicalPhone } from "@/lib/csv";
import { hashSecret, randomToken, safeEqual } from "@/lib/booking.server";

const Payload = z.object({
  phone: z.string().min(3).max(32),
  code: z.string().regex(/^\d{6}$/),
});

export const Route = createFileRoute("/api/booking/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: z.infer<typeof Payload>;
        try {
          payload = Payload.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }
        const canon = canonicalPhone(payload.phone);
        if (!canon) return Response.json({ error: "invalid_code" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: session } = await supabaseAdmin
          .from("booking_sessions")
          .select("id, code_hash, attempts, expires_at, verified, patient_id")
          .eq("phone", canon)
          .eq("verified", false)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!session) {
          return Response.json({ error: "invalid_code" }, { status: 401 });
        }
        if ((session.attempts ?? 0) >= 5) {
          return Response.json({ error: "too_many_attempts" }, { status: 429 });
        }

        const hash = await hashSecret(payload.code);
        if (!safeEqual(hash, session.code_hash)) {
          await supabaseAdmin
            .from("booking_sessions")
            .update({ attempts: (session.attempts ?? 0) + 1 })
            .eq("id", session.id);
          return Response.json({ error: "invalid_code" }, { status: 401 });
        }

        const token = randomToken();
        const tokenHash = await hashSecret(token);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const { error } = await supabaseAdmin
          .from("booking_sessions")
          .update({ verified: true, token_hash: tokenHash, expires_at: expiresAt })
          .eq("id", session.id);
        if (error) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }

        return Response.json({ ok: true, token, expires_at: expiresAt });
      },
    },
  },
});
