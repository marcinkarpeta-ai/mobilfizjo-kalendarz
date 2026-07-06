import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const seedFamilyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isTherapist, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "therapist" },
    );
    if (roleErr) throw roleErr;
    if (!isTherapist) throw new Error("Forbidden");

    const password = process.env.FAMILY_SEED_PASSWORD;
    if (!password) throw new Error("Missing FAMILY_SEED_PASSWORD");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const email = "magda@fizjoplan.local";

    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;
    if (list?.users.some((u) => u.email?.toLowerCase() === email)) {
      return { status: "exists" as const, email };
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return { status: "created" as const, email };
  });
