import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nBearer } from "@/lib/n8n-auth.server";

const BalanceSchema = z.object({
  full: z.number().int().min(0),
  balance_pln: z.number().min(0),
});

export const Route = createFileRoute("/api/public/sms-balance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyN8nBearer(request);
        if (unauthorized) return unauthorized;

        let payload: z.infer<typeof BalanceSchema>;
        try {
          payload = BalanceSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row, error: readError } = await supabaseAdmin
          .from("app_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (readError) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }
        if (!row) {
          return Response.json({ error: "settings_missing" }, { status: 500 });
        }

        const { error } = await supabaseAdmin
          .from("app_settings")
          .update({
            sms_balance_full: payload.full,
            sms_balance_pln: payload.balance_pln,
            sms_balance_updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
