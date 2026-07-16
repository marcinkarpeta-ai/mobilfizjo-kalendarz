import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nBearer } from "@/lib/n8n-auth.server";

const DeliverySchema = z.object({
  status: z.enum(["delivered", "undelivered"]),
  reason: z.string().max(500).optional(),
  delivered_at: z.string().datetime().optional(),
});

// $id = provider_ref (SerwerSMS unique_id)
export const Route = createFileRoute("/api/public/messages-log/$id/delivery")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const unauthorized = verifyN8nBearer(request);
        if (unauthorized) return unauthorized;

        const providerRef = params.id;
        if (!providerRef) {
          return Response.json({ error: "missing_id" }, { status: 400 });
        }

        let payload: z.infer<typeof DeliverySchema>;
        try {
          const raw = await request.json();
          payload = DeliverySchema.parse(raw);
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const update: Record<string, unknown> = {
          status: payload.status,
          delivered_at: payload.delivered_at ?? new Date().toISOString(),
        };
        if (payload.status === "undelivered" && payload.reason) {
          update.error = payload.reason;
        }

        const { data, error } = await supabaseAdmin
          .from("messages_log")
          .update(update)
          .eq("provider_ref", providerRef)
          .eq("status", "sent")
          .select("id");

        if (error) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }
        if (!data || data.length === 0) {
          return Response.json({ error: "not_in_sent" }, { status: 409 });
        }
        return Response.json({ ok: true, id: data[0].id });
      },
    },
  },
});
