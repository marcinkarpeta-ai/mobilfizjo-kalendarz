import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";

const phoneRegex = /^\+?\d[\d\s-]{7,17}$/;

const schema = z.object({
  first_name: z.string().trim().min(1, "Imię jest wymagane").max(60),
  last_name: z.string().trim().min(1, "Nazwisko jest wymagane").max(60),
  salutation: z.string().trim().min(1, "Podaj formę grzecznościową").max(60),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Podaj prawidłowy numer telefonu"),
  birth_date: z.string().optional(),
});

export function AddPatientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const patients = useStore((s) => s.patients);
  const addPatient = useStore((s) => s.addPatient);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [salutation, setSalutation] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [serviceConsent, setServiceConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setFirstName("");
    setLastName("");
    setSalutation("");
    setPhone("");
    setBirthDate("");
    setServiceConsent(true);
    setMarketingConsent(false);
    setErrors({});
  }

  function submit() {
    const parsed = schema.safeParse({
      first_name: firstName,
      last_name: lastName,
      salutation,
      phone,
      birth_date: birthDate || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }
    const normalizedPhone = parsed.data.phone.replace(/\s+/g, " ").trim();
    if (patients.some((p) => p.phone.replace(/\s+/g, " ").trim() === normalizedPhone)) {
      setErrors({ phone: "Pacjent z tym numerem już istnieje." });
      return;
    }

    const now = new Date().toISOString();
    addPatient({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      salutation: parsed.data.salutation,
      phone: normalizedPhone,
      birth_date: parsed.data.birth_date,
      service_consent_at: serviceConsent ? now : undefined,
      marketing_consent_at: marketingConsent ? now : undefined,
    });
    toast.success("Pacjent dodany do kartoteki.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy pacjent</DialogTitle>
          <DialogDescription>
            Telefon jest wymagany i musi być unikalny.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="p-first">Imię</Label>
              <Input
                id="p-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              {errors.first_name ? (
                <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="p-last">Nazwisko</Label>
              <Input
                id="p-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
              {errors.last_name ? (
                <p className="mt-1 text-xs text-destructive">{errors.last_name}</p>
              ) : null}
            </div>
          </div>

          <div>
            <Label htmlFor="p-salut">Forma grzecznościowa (do SMS-ów)</Label>
            <Input
              id="p-salut"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="np. Panie Januszu"
            />
            {errors.salutation ? (
              <p className="mt-1 text-xs text-destructive">{errors.salutation}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="p-phone">Telefon</Label>
            <Input
              id="p-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 600 000 000"
              autoComplete="tel"
            />
            {errors.phone ? (
              <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="p-birth">Data urodzenia (opcjonalnie)</Label>
            <Input
              id="p-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-secondary/50 p-3">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={serviceConsent}
                onCheckedChange={(v) => setServiceConsent(v === true)}
                aria-label="Zgoda obsługowa"
              />
              <span>
                <strong className="block">Zgoda obsługowa</strong>
                <span className="text-muted-foreground">
                  Wymagana do wysyłki SMS-ów o wizytach.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={marketingConsent}
                onCheckedChange={(v) => setMarketingConsent(v === true)}
                aria-label="Zgoda marketingowa"
              />
              <span>
                <strong className="block">Zgoda marketingowa</strong>
                <span className="text-muted-foreground">
                  Potrzebna do propozycji rocznicowych i urodzinowych.
                </span>
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={submit}>Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
