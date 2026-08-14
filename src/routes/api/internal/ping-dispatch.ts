import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ALLOWED_ROLES = new Set(["therapist", "family", "admin"]);

export const Route = createFileRoute("/api/internal/ping-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("authorization") ?? "";
        const match = /^Bearer\s+(.+)$/i.exec(header);
        if (!match) return new Response("Unauthorized", { status: 401 });
        const token = match[1].trim();

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!url || !key) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error } = await supabase.auth.getUser(token);
        if (error || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (!profile || !ALLOWED_ROLES.has(profile.role)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { pingInstantWebhook } = await import("@/lib/booking.server");
        await pingInstantWebhook();

        return Response.json({ ok: true });
      },
    },
  },
});
