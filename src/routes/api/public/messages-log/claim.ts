import { createFileRoute } from "@tanstack/react-router";
import { verifyN8nBearer } from "@/lib/n8n-auth.server";

export const Route = createFileRoute("/api/public/messages-log/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = verifyN8nBearer(request);
        if (unauthorized) return unauthorized;

        let limit = 50;
        try {
          const ct = request.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) {
            const body = (await request.json()) as { limit?: number } | null;
            if (body && typeof body.limit === "number" && Number.isFinite(body.limit)) {
              limit = Math.max(1, Math.min(Math.floor(body.limit), 100));
            }
          }
        } catch {
          // brak body / niepoprawny JSON — używamy domyślnego limitu
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("claim_pending_messages", {
          _limit: limit,
        });

        if (error) {
          return new Response(JSON.stringify({ error: "internal_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return Response.json({ items: data ?? [] });
      },
    },
  },
});
