import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { canonicalPhone } from "@/lib/csv";
import { hashSecret, pingInstantWebhook, randomCode } from "@/lib/booking.server";

const Payload = z.object({ phone: z.string().min(3).max(32) });

/** Zawsze taka sama odpowiedź — nie zdradzamy, czy numer jest w kartotece. */
const OK = () => Response.json({ ok: true });

export const Route = createFileRoute("/api/booking/request-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let phone: string;
        try {
          phone = Payload.parse(await request.json()).phone;
        } catch {
          return OK();
        }
        const canon = canonicalPhone(phone);
        if (!canon) return OK();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("booking_enabled")
          .limit(1)
          .maybeSingle();
        if (!settings?.booking_enabled) return OK();

        const { data: candidates } = await supabaseAdmin
          .from("patients")
          .select("id, phone, booking_consent_at, archived_at")
          .not("booking_consent_at", "is", null)
          .is("archived_at", null);

        const patient = (candidates ?? []).find(
          (p) => canonicalPhone(p.phone) === canon,
        );
        if (!patient) return OK();

        // Limit: 3 kody na numer na dobę.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabaseAdmin
          .from("booking_sessions")
          .select("id", { count: "exact", head: true })
          .eq("phone", canon)
          .gte("created_at", since);
        if ((count ?? 0) >= 3) return OK();

        const code = randomCode();
        const codeHash = await hashSecret(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { error: sessionError } = await supabaseAdmin
          .from("booking_sessions")
          .insert({
            phone: canon,
            code_hash: codeHash,
            patient_id: patient.id,
            expires_at: expiresAt,
          });
        if (sessionError) return OK();

        const { data: tpl } = await supabaseAdmin
          .from("message_templates")
          .select("body")
          .eq("kind", "booking_code")
          .maybeSingle();

        const body = (tpl?.body ?? "Twój kod do rezerwacji: {{code}}. Ważny 10 minut.")
          .replace("{{code}}", code);

        const { error: logError } = await supabaseAdmin.from("messages_log").insert({
          patient_id: patient.id,
          kind: "booking_code",
          status: "pending",
          body,
          scheduled_at: new Date().toISOString(),
        });

        if (!logError) {
          await pingInstantWebhook();
        }

        return OK();
      },
    },
  },
});
