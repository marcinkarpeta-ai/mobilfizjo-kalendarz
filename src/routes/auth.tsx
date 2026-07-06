import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoweredByFooter } from "@/components/powered-by-footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Logowanie — FizjoPlan" },
      { name: "description", content: "Zaloguj się do FizjoPlan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Jeżeli już zalogowany — wskocz od razu na start.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(
          "Konto utworzone. Jeśli e-mail jest na liście dostępowej, możesz się zalogować.",
        );
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Activity className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            FizjoPlan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Zaloguj się do swojego gabinetu"
              : "Utwórz konto terapeuty"}
          </p>
        </div>

        <form
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
          onSubmit={submit}
        >
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan.kowalski@example.com"
            />
          </div>
          <div>
            <Label htmlFor="pw">Hasło</Label>
            <Input
              id="pw"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Chwileczkę…"
              : mode === "signin"
                ? "Zaloguj"
                : "Utwórz konto"}
          </Button>
          <button
            type="button"
            className="w-full pt-1 text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          >
            {mode === "signin"
              ? "Nie masz konta? Zarejestruj się"
              : "Masz konto? Zaloguj się"}
          </button>
        </form>
      </div>
      <PoweredByFooter />
    </div>
  );
}
