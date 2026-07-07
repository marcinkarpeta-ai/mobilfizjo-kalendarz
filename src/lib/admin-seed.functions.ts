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
    const email = "family1@fizjoplan.local";
    const legacyEmail = "magda@fizjoplan.local";

    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    // Usuń stare konto magda@fizjoplan.local (jeśli istnieje) wraz z profilem.
    const legacy = list?.users.find(
      (u) => u.email?.toLowerCase() === legacyEmail,
    );
    if (legacy) {
      await supabaseAdmin.from("profiles").delete().eq("user_id", legacy.id);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(
        legacy.id,
      );
      if (delErr) throw delErr;
    }

    const existing = list?.users.find(
      (u) => u.email?.toLowerCase() === email,
    );
    let userId = existing?.id;
    let status: "created" | "exists" = "exists";
    if (!existing) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = created.user?.id;
      status = "created";
    }

    // Upewnij się, że profil ma display_name "Rodzina".
    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: userId, display_name: "Rodzina", role: "family" },
          { onConflict: "user_id" },
        );
    }

    return { status, email };
  });
