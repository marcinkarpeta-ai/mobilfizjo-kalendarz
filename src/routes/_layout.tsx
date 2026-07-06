import { useEffect, useState } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { DataSync } from "@/components/data-sync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Druga linia obrony: nawet gdy użytkownik ma sesję, brak profilu
  // (np. konto spoza allowlist) = wylogowanie i redirect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !profile) {
        await supabase.auth.signOut();
        toast.error("To konto nie ma dostępu do aplikacji.");
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate({ to: "/auth" });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!ready) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DataSync />
      <main className="flex-1 pb-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
