import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nBearer } from "@/lib/n8n-auth.server";

const ResultSchema = z.object({
  status: z.enum(["sent", "failed"]),
  provider_ref: z.string().min(1).max(200).optional(),
  error: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/messages-log/$id/result")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const unauthorized = verifyN8nBearer(request);
        if (unauthorized) return unauthorized;

        const id = params.id;
        if (!id) {
          return Response.json({ error: "missing_id" }, { status: 400 });
        }

        let payload: z.infer<typeof ResultSchema>;
        try {
          const raw = await request.json();
          payload = ResultSchema.parse(raw);
        } catch {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const update: {
          status: string;
          processing_started_at: null;
          error: string | null;
          sent_at?: string;
          provider_ref?: string;
        } = {
          status: payload.status,
          processing_started_at: null,
          error: payload.error ?? null,
        };
        if (payload.status === "sent") {
          update.sent_at = new Date().toISOString();
        }
        if (payload.provider_ref) {
          update.provider_ref = payload.provider_ref;
        }

        const { data, error } = await supabaseAdmin
          .from("messages_log")
          .update(update)
          .eq("id", id)
          .eq("status", "processing")
          .select("id");

        if (error) {
          return Response.json({ error: "internal_error" }, { status: 500 });
        }
        if (!data || data.length === 0) {
          return Response.json({ error: "not_in_processing" }, { status: 409 });
        }
        return Response.json({ ok: true, id: data[0].id });
      },
    },
  },
});
