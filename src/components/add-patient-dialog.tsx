import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import type { Patient } from "@/lib/types";
import { canonicalPhone, formatPhoneStorage } from "@/lib/csv";

const phoneRegex = /^\+?\d[\d\s-]{7,17}$/;

const schema = z.object({
  first_name: z.string().trim().max(60).optional(),
  last_name: z.string().trim().max(60).optional(),
  salutation: z.string().trim().min(1, "Podaj formę grzecznościową").max(60),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Podaj prawidłowy numer telefonu"),
  birth_date: z.string().optional(),
  general_note: z.string().max(2000, "Notatka jest zbyt długa").optional(),
});

function normalizePhone(v: string) {
  return formatPhoneStorage(v);
}

export function AddPatientDialog({
  open,
  onOpenChange,
  patient,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: Patient;
  onCreated?: (patient: Patient) => void;
}) {
  const patients = useStore((s) => s.patients);
  const addPatient = useStore((s) => s.addPatient);
  const updatePatient = useStore((s) => s.updatePatient);

  const isEdit = Boolean(patient);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [salutation, setSalutation] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [serviceConsent, setServiceConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (patient) {
      setFirstName(patient.first_name);
      setLastName(patient.last_name);
      setSalutation(patient.salutation ?? "");
      setPhone(patient.phone);
      setBirthDate(patient.birth_date ?? "");
      setGeneralNote(patient.general_note ?? "");
      setServiceConsent(Boolean(patient.service_consent_at));
      setMarketingConsent(Boolean(patient.marketing_consent_at));
    } else {
      setFirstName("");
      setLastName("");
      setSalutation("");
      setPhone("");
      setBirthDate("");
      setGeneralNote("");
      setServiceConsent(true);
      setMarketingConsent(false);
    }
    setErrors({});
  }, [open, patient]);

  function submit() {
    const parsed = schema.safeParse({
      first_name: firstName,
      last_name: lastName,
      salutation,
      phone,
      birth_date: birthDate || undefined,
      general_note: generalNote.trim() || undefined,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }
    const normalizedPhone = normalizePhone(parsed.data.phone);
    const canon = canonicalPhone(parsed.data.phone);
    const clash = patients.find(
      (p) =>
        p.id !== patient?.id &&
        !p.archived_at &&
        canon !== null &&
        canonicalPhone(p.phone) === canon,
    );
    if (clash) {
      setErrors({
        phone: `Ten numer należy już do: ${clash.first_name} ${clash.last_name}.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const prevService = Boolean(patient?.service_consent_at);
    const prevMarketing = Boolean(patient?.marketing_consent_at);
    const serviceChanged = !isEdit ? serviceConsent : serviceConsent !== prevService;
    const marketingChanged = !isEdit
      ? marketingConsent
      : marketingConsent !== prevMarketing;

    const commonPatch = {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      salutation: parsed.data.salutation,
      phone: normalizedPhone,
      birth_date: parsed.data.birth_date,
      general_note: parsed.data.general_note,
      service_consent_at: serviceConsent
        ? patient?.service_consent_at ?? now
        : undefined,
      service_consent_changed_at: serviceChanged
        ? now
        : patient?.service_consent_changed_at,
      marketing_consent_at: marketingConsent
        ? patient?.marketing_consent_at ?? now
        : undefined,
      marketing_consent_changed_at: marketingChanged
        ? now
        : patient?.marketing_consent_changed_at,
    };

    if (isEdit && patient) {
      updatePatient(patient.id, commonPatch);
      toast.success("Dane pacjenta zapisane.");
    } else {
      const created = addPatient(commonPatch);
      toast.success("Pacjent dodany do kartoteki.");
      onCreated?.(created);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edytuj pacjenta" : "Nowy pacjent"}</DialogTitle>
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

          <div>
            <Label htmlFor="p-note">Notatka ogólna (opcjonalnie)</Label>
            <Textarea
              id="p-note"
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Uwagi, przeciwwskazania, preferencje…"
              rows={3}
            />
            {errors.general_note ? (
              <p className="mt-1 text-xs text-destructive">{errors.general_note}</p>
            ) : null}
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
