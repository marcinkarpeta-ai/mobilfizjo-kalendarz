import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/booking/status")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("app_settings")
          .select("booking_enabled, clinic_name, therapist_name")
          .limit(1)
          .maybeSingle();
        return Response.json({
          enabled: Boolean(data?.booking_enabled),
          clinic_name: data?.clinic_name ?? "",
          therapist_name: data?.therapist_name ?? "",
        });
      },
    },
  },
});
