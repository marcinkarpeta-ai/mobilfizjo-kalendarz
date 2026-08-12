import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Activity, ArrowLeft, CalendarCheck, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoweredByFooter } from "@/components/powered-by-footer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rezerwacja")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rezerwacja wizyty — FizjoPlan" },
      {
        name: "description",
        content: "Zarezerwuj termin wizyty fizjoterapeutycznej online, potwierdzając numer telefonu kodem SMS.",
      },
      { property: "og:title", content: "Rezerwacja wizyty — FizjoPlan" },
      {
        property: "og:description",
        content: "Zarezerwuj termin wizyty fizjoterapeutycznej online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingPage,
});

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_pln: number | null;
  description: string | null;
}

interface Slot {
  date: string;
  time: string;
  ends_at: string;
}

function fmtPrice(v: number | null) {
  if (v === null) return null;
  return `${v.toFixed(2).replace(".", ",")} zł`;
}

function fmtDay(date: string) {
  const label = format(parseISO(date), "EEEE, d MMMM", { locale: pl });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background px-4 pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
      <div className="mx-auto w-full max-w-md flex-1">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">Rezerwacja wizyty</h1>
            <p className="text-xs text-muted-foreground">Fizjoterapia — rezerwacja online</p>
          </div>
        </div>
        {children}
      </div>
      <PoweredByFooter />
    </div>
  );
}

function BookingPage() {
  const [status, setStatus] = useState<"loading" | "on" | "off">("loading");
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [token, setToken] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [daysAhead, setDaysAhead] = useState(14);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [visibleDays, setVisibleDays] = useState(7);
  const [slot, setSlot] = useState<Slot | null>(null);

  useEffect(() => {
    void fetch("/api/booking/status")
      .then((r) => r.json())
      .then((d) => setStatus(d?.enabled ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const expire = useCallback(() => {
    setToken(null);
    setStep(1);
    setCode("");
    setErr("Sesja wygasła. Zacznij od podania numeru telefonu.");
  }, []);

  async function requestCode(again = false) {
    setErr(null);
    setBusy(true);
    try {
      await fetch("/api/booking/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setCooldown(60);
      if (!again) setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/booking/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok || !data?.token) {
        setErr(
          data?.error === "too_many_attempts"
            ? "Za dużo prób. Poproś o nowy kod."
            : "Nieprawidłowy lub nieaktualny kod.",
        );
        return;
      }
      setToken(data.token);
      const sres = await fetch("/api/booking/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      });
      const sdata = await sres.json();
      setServices(sdata?.services ?? []);
      setDaysAhead(sdata?.days_ahead ?? 14);
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  async function pickService(s: Service) {
    if (!token) return expire();
    setService(s);
    setSlot(null);
    setVisibleDays(7);
    setErr(null);
    setBusy(true);
    try {
      const today = new Date();
      const to = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const iso = (d: Date) => format(d, "yyyy-MM-dd");
      const res = await fetch("/api/booking/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          service_id: s.id,
          date_from: iso(today),
          date_to: iso(to),
        }),
      });
      if (res.status === 401) return expire();
      const data = await res.json();
      setSlots(data?.slots ?? []);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!token || !service || !slot) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          service_id: service.id,
          starts_at: new Date(`${slot.date}T${slot.time}:00`).toISOString(),
        }),
      });
      if (res.status === 401) return expire();
      const data = await res.json();
      if (!res.ok) {
        setErr(
          data?.error === "slot_taken"
            ? "Termin właśnie został zajęty. Wybierz inny."
            : "Nie udało się zarezerwować terminu. Spróbuj ponownie.",
        );
        if (data?.error === "slot_taken" && service) {
          setSlot(null);
          void pickService(service);
        }
        return;
      }
      setStep(5);
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
      </Shell>
    );
  }

  if (status === "off") {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-foreground">Rezerwacje online są chwilowo niedostępne.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {err ? (
        <p className="mb-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      ) : null}

      {step === 1 ? (
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="phone">Numer telefonu</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="np. 600 100 200"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Podany numer wykorzystujemy wyłącznie w celu potwierdzenia tożsamości i obsługi
            rezerwacji wizyty. Szczegóły znajdziesz w{" "}
            <a href="#klauzula" className="underline underline-offset-2">
              klauzuli informacyjnej
            </a>
            .
          </p>
          <Button type="submit" className="w-full" disabled={busy || phone.trim().length < 7}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Wyślij kod SMS
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Jeśli numer jest w kartotece, wysłaliśmy na niego 6-cyfrowy kod. Kod jest ważny 10 minut.
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Kod z SMS-a</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="text-center text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Dalej
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy || cooldown > 0}
            onClick={() => void requestCode(true)}
          >
            {cooldown > 0 ? `Wyślij ponownie (${cooldown} s)` : "Wyślij kod ponownie"}
          </Button>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Wybierz usługę</h2>
            {services.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Brak usług dostępnych w rezerwacji online.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => void pickService(s)}
                      className={cn(
                        "w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-accent",
                        service?.id === s.id && "border-primary",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-foreground">{s.name}</span>
                        {fmtPrice(s.price_pln) ? (
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {fmtPrice(s.price_pln)}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {s.duration_minutes} min
                      </span>
                      {s.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {service ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Wolne terminy</h2>
              {busy ? (
                <div className="flex justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              ) : grouped.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Brak wolnych terminów w najbliższych dniach.
                </p>
              ) : (
                <>
                  {grouped.slice(0, visibleDays).map(([date, items]) => (
                    <div key={date} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm font-medium text-foreground">{fmtDay(date)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {items.map((s) => (
                          <Button
                            key={`${s.date}-${s.time}`}
                            type="button"
                            size="sm"
                            variant={
                              slot?.date === s.date && slot?.time === s.time ? "default" : "outline"
                            }
                            className="tabular-nums"
                            onClick={() => {
                              setSlot(s);
                              setStep(4);
                            }}
                          >
                            {s.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {grouped.length > visibleDays ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setVisibleDays((v) => v + 7)}
                    >
                      Pokaż kolejne dni
                    </Button>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {step === 4 && service && slot ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Podsumowanie</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Usługa</dt>
              <dd className="text-right text-foreground">{service.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Termin</dt>
              <dd className="text-right tabular-nums text-foreground">
                {fmtDay(slot.date)}, {slot.time}–{slot.ends_at}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Czas trwania</dt>
              <dd className="text-right text-foreground">{service.duration_minutes} min</dd>
            </div>
            {fmtPrice(service.price_pln) ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Cena</dt>
                <dd className="text-right text-foreground">{fmtPrice(service.price_pln)}</dd>
              </div>
            ) : null}
          </dl>
          <Button className="w-full" disabled={busy} onClick={() => void confirm()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Rezerwuję
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setSlot(null);
              setStep(3);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Zmień termin
          </Button>
        </div>
      ) : null}

      {step === 5 && service && slot ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-foreground">Termin zarezerwowany</h2>
          <p className="flex items-center justify-center gap-2 text-sm text-foreground">
            <CalendarCheck className="h-4 w-4" aria-hidden />
            <span className="tabular-nums">
              {fmtDay(slot.date)}, {slot.time}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            SMS z potwierdzeniem jest już w drodze na Twój numer.
          </p>
        </div>
      ) : null}

      <p id="klauzula" className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Klauzula informacyjna zostanie uzupełniona przez gabinet.
      </p>
    </Shell>
  );
}
