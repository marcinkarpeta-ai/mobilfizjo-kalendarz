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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function toEmail(raw: string) {
    const v = raw.trim().toLowerCase();
    return v.includes("@") ? v : `${v}@fizjoplan.local`;
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: toEmail(username),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate({ to: "/" });
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
            Zaloguj się do swojego gabinetu
          </p>
        </div>

        <form
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
          onSubmit={submit}
        >
          <div>
            <Label htmlFor="username">Nazwa użytkownika</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Wpisz nazwę użytkownika"
            />
          </div>
          <div>
            <Label htmlFor="pw">Hasło</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Chwileczkę…" : "Zaloguj"}
          </Button>
        </form>
      </div>
      <PoweredByFooter />
    </div>
  );
}
