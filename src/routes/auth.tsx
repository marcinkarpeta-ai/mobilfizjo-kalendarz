import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoweredByFooter } from "@/components/powered-by-footer";

export const Route = createFileRoute("/auth")({
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
        >
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full">
            Zaloguj
          </Button>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            (Wersja demonstracyjna — logowanie aktywne po włączeniu Cloud.)
          </p>
        </form>
      </div>
      <PoweredByFooter />
    </div>
  );
}
