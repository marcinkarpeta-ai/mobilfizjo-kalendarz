import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPhoneStorage } from "./csv";
import type {
  Appointment,
  AppSettings,
  DayOff,
  MarketingProposal,
  MessageLog,
  MessageTemplate,
  Patient,
  UserRole,
  VisitLabel,
  VisitNote,
  WorkingHours,
} from "./types";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Wewnętrzne pola pomocnicze (nie eksportowane z API store'a)
interface InternalState {
  _settingsId: string | null;
  _hydrated: boolean;
}

interface StoreState extends InternalState {
  userId: string | null;
  role: UserRole | null;
  displayName: string | null;
  patients: Patient[];
  labels: VisitLabel[];
  appointments: Appointment[];
  notes: VisitNote[];
  messages: MessageLog[];
  proposals: MarketingProposal[];
  templates: MessageTemplate[];
  settings: AppSettings;
  workingHours: WorkingHours[];
  daysOff: DayOff[];

  _setAuth: (patch: { userId: string; role: UserRole; displayName: string | null }) => void;

  // Hydratacja z DataSync — nie używane bezpośrednio przez UI
  _hydrate: (patch: Partial<Omit<StoreState, "_hydrate">>) => void;

  // API zachowane 1:1 z poprzednim store'em
  addPatient: (p: Omit<Patient, "id" | "created_at">) => Patient;
  bulkAddPatients: (
    patients: Omit<Patient, "id" | "created_at">[],
  ) => Promise<{ inserted: number; failed: number }>;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  archivePatient: (id: string) => void;
  restorePatient: (id: string) => void;

  addAppointment: (a: Omit<Appointment, "id">) => Appointment;
  updateAppointment: (
    id: string,
    patch: Partial<Pick<Appointment, "starts_at" | "ends_at" | "visit_label_id" | "title">>,
  ) => void;
  cancelAppointment: (id: string) => void;
  deleteAppointment: (id: string) => void;

  addLabel: (data: Partial<Omit<VisitLabel, "id">> & { name: string }) => void;
  updateLabel: (id: string, patch: Partial<Omit<VisitLabel, "id">>) => void;
  reorderLabels: (ids: string[]) => void;
  removeLabel: (id: string) => void;

  addNote: (
    n: Omit<VisitNote, "id" | "created_at" | "photos"> & { photos?: VisitNote["photos"] },
  ) => void;

  updateTemplate: (id: string, body: string) => void;
  approveProposal: (id: string, approved: boolean) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;

  updateWorkingHours: (weekday: number, patch: Partial<Omit<WorkingHours, "weekday">>) => void;
  addDayOff: (date: string, reason?: string | null) => void;
  removeDayOff: (id: string) => void;

  reset: () => void;
}

function toUndef<T>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}

function emptyToNull(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    salutation: (row.salutation as string | null) ?? null,
    phone: row.phone as string,
    birth_date: toUndef(row.birth_date as string | null),
    service_consent_at: toUndef(row.service_consent_at as string | null),
    service_consent_changed_at: toUndef(row.service_consent_changed_at as string | null),
    marketing_consent_at: toUndef(row.marketing_consent_at as string | null),
    marketing_consent_changed_at: toUndef(row.marketing_consent_changed_at as string | null),
    booking_consent_at: toUndef(row.booking_consent_at as string | null),
    booking_consent_changed_at: toUndef(row.booking_consent_changed_at as string | null),
    general_note: toUndef(row.general_note as string | null),
    archived_at: toUndef(row.archived_at as string | null),
    created_at: row.created_at as string,
  };
}

function patientToDb(p: Partial<Patient>) {
  return {
    first_name: emptyToNull(p.first_name),
    last_name: emptyToNull(p.last_name),
    salutation: emptyToNull(p.salutation),
    phone: p.phone ? formatPhoneStorage(p.phone) : p.phone,
    birth_date: p.birth_date ?? null,
    service_consent_at: p.service_consent_at ?? null,
    service_consent_changed_at: p.service_consent_changed_at ?? null,
    marketing_consent_at: p.marketing_consent_at ?? null,
    marketing_consent_changed_at: p.marketing_consent_changed_at ?? null,
    booking_consent_at: p.booking_consent_at ?? null,
    booking_consent_changed_at: p.booking_consent_changed_at ?? null,
    general_note: p.general_note ?? null,
    archived_at: p.archived_at ?? null,
  };
}

function patientInsert(id: string, p: Omit<Patient, "id" | "created_at">) {
  return {
    id,
    first_name: emptyToNull(p.first_name),
    last_name: emptyToNull(p.last_name),
    salutation: emptyToNull(p.salutation),
    phone: formatPhoneStorage(p.phone),
    birth_date: p.birth_date ?? null,
    service_consent_at: p.service_consent_at ?? null,
    service_consent_changed_at: p.service_consent_changed_at ?? null,
    marketing_consent_at: p.marketing_consent_at ?? null,
    marketing_consent_changed_at: p.marketing_consent_changed_at ?? null,
    booking_consent_at: p.booking_consent_at ?? null,
    booking_consent_changed_at: p.booking_consent_changed_at ?? null,
    general_note: p.general_note ?? null,
    archived_at: p.archived_at ?? null,
  };
}

function handleError(context: string, error: unknown) {
  console.error(`[store] ${context}`, error);
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message)
      : "Nieznany błąd.";
  toast.error(`${context}: ${msg}`);
}

export const useStore = create<StoreState>()((set, get) => ({
  _settingsId: null,
  _hydrated: false,
  userId: null,
  role: null,
  displayName: null,
  patients: [],
  labels: [],
  appointments: [],
  notes: [],
  messages: [],
  proposals: [],
  templates: [],
  settings: {
    therapist_name: "",
    clinic_name: "",
    sms_price_net_gr: 10,
    default_visit_minutes: 60,
    sms_balance_full: null,
    sms_balance_pln: null,
    sms_balance_updated_at: null,
    booking_enabled: false,
    booking_days_ahead: 14,
    booking_min_hours_ahead: 12,
  },
  workingHours: [],
  daysOff: [],



  _setAuth: (patch) =>
    set({ userId: patch.userId, role: patch.role, displayName: patch.displayName }),

  _hydrate: (patch) => set(patch as Partial<StoreState>),

  addPatient: (p) => {
    const id = newId();
    const created_at = new Date().toISOString();
    const patient: Patient = { ...p, id, created_at };
    // optymistyczna aktualizacja
    set((s) => ({ patients: [patient, ...s.patients] }));
    void (async () => {
      const { data, error } = await supabase
        .from("patients")
        .insert(patientInsert(id, p))
        .select("*")
        .single();
      if (error) {
        set((s) => ({ patients: s.patients.filter((x) => x.id !== id) }));
        handleError("Zapis pacjenta nie powiódł się", error);
        return;
      }
      const mapped = mapPatient(data);
      set((s) => ({
        patients: s.patients.map((x) => (x.id === id ? mapped : x)),
      }));
    })();
    return patient;
  },

  bulkAddPatients: async (list) => {
    if (list.length === 0) return { inserted: 0, failed: 0 };
    const rows = list.map((p) => patientInsert(newId(), p));
    const { data, error } = await supabase
      .from("patients")
      .insert(rows)
      .select("*");
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (error as any).code as string | undefined;
      if (code === "23505") {
        toast.error(
          "Import przerwany: numer telefonu już istnieje w bazie (unikat).",
        );
      } else {
        handleError("Import pacjentów nie powiódł się", error);
      }
      return { inserted: 0, failed: list.length };
    }
    const mapped = (data ?? []).map((r) => mapPatient(r));
    set((s) => ({ patients: [...mapped, ...s.patients] }));
    return { inserted: mapped.length, failed: list.length - mapped.length };
  },

  updatePatient: (pid, patch) => {
    const prev = get().patients.find((p) => p.id === pid);
    set((s) => ({
      patients: s.patients.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    }));
    void (async () => {
      const { error } = await supabase
        .from("patients")
        .update(patientToDb({ ...prev, ...patch }))
        .eq("id", pid);
      if (error) {
        if (prev) {
          set((s) => ({
            patients: s.patients.map((p) => (p.id === pid ? prev : p)),
          }));
        }
        handleError("Aktualizacja pacjenta nie powiodła się", error);
      }
    })();
  },

  archivePatient: (pid) => {
    const now = new Date().toISOString();
    set((s) => ({
      patients: s.patients.map((p) =>
        p.id === pid ? { ...p, archived_at: now } : p,
      ),
    }));
    void (async () => {
      const { error } = await supabase
        .from("patients")
        .update({ archived_at: now })
        .eq("id", pid);
      if (error) handleError("Archiwizacja nie powiodła się", error);
    })();
  },

  restorePatient: (pid) => {
    set((s) => ({
      patients: s.patients.map((p) => {
        if (p.id !== pid) return p;
        const { archived_at: _a, ...rest } = p;
        return rest;
      }),
    }));
    void (async () => {
      const { error } = await supabase
        .from("patients")
        .update({ archived_at: null })
        .eq("id", pid);
      if (error) handleError("Przywrócenie nie powiodło się", error);
    })();
  },

  addAppointment: (a) => {
    const id = newId();
    const appt: Appointment = { ...a, id };
    set((s) => ({ appointments: [...s.appointments, appt] }));
    void (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          id,
          type: a.type,
          starts_at: a.starts_at,
          ends_at: a.ends_at,
          status: a.status,
          patient_id: a.patient_id ?? null,
          visit_label_id: a.visit_label_id ?? null,
          title: a.title ?? null,
          notes: a.notes ?? null,
          // created_by ustawi trigger set_appointment_created_by
        })
        .select("*")
        .single();
      if (error) {
        set((s) => ({ appointments: s.appointments.filter((x) => x.id !== id) }));
        handleError("Zapis wizyty nie powiódł się", error);
        return;
      }
      const mapped: Appointment = {
        id: data.id,
        type: data.type,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        status: data.status,
        patient_id: toUndef(data.patient_id),
        visit_label_id: toUndef(data.visit_label_id),
        title: toUndef(data.title),
        notes: toUndef(data.notes),
        created_by: toUndef(data.created_by),
        booked_online: data.booked_online ?? false,
      };
      set((s) => ({
        appointments: s.appointments.map((x) => (x.id === id ? mapped : x)),
      }));
    })();
    return appt;
  },

  cancelAppointment: (aid) => {
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === aid ? { ...a, status: "cancelled" } : a,
      ),
    }));
    void (async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", aid);
      if (error) handleError("Anulowanie wizyty nie powiodło się", error);
    })();
  },

  updateAppointment: (aid, patch) => {
    const prev = get().appointments.find((a) => a.id === aid);
    if (!prev) return;
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === aid ? { ...a, ...patch } : a,
      ),
    }));
    void (async () => {
      const dbPatch: {
        starts_at?: string;
        ends_at?: string;
        visit_label_id?: string | null;
        title?: string | null;
      } = {};
      if ("starts_at" in patch) dbPatch.starts_at = patch.starts_at;
      if ("ends_at" in patch) dbPatch.ends_at = patch.ends_at;
      if ("visit_label_id" in patch) dbPatch.visit_label_id = patch.visit_label_id ?? null;
      if ("title" in patch) dbPatch.title = patch.title ?? null;
      const { error } = await supabase
        .from("appointments")
        .update(dbPatch)
        .eq("id", aid);
      if (error) {
        set((s) => ({
          appointments: s.appointments.map((a) => (a.id === aid ? prev : a)),
        }));
        handleError("Zapis wpisu nie powiódł się", error);
      }
    })();
  },

  deleteAppointment: (aid) => {
    const prev = get().appointments.find((a) => a.id === aid);
    if (!prev) return;
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== aid) }));
    void (async () => {
      const { error } = await supabase.from("appointments").delete().eq("id", aid);
      if (error) {
        set((s) => ({ appointments: [...s.appointments, prev] }));
        handleError("Usunięcie wpisu nie powiodło się", error);
      }
    })();
  },


  addLabel: (data) => {
    const id = newId();
    const label: VisitLabel = {
      id,
      name: data.name,
      duration_minutes: data.duration_minutes ?? 60,
      price_pln: data.price_pln ?? null,
      description: data.description ?? null,
      bookable: data.bookable ?? false,
      sort_order:
        data.sort_order ??
        (get().labels.reduce((m, l) => Math.max(m, l.sort_order), 0) + 1),
    };
    set((s) => ({ labels: [...s.labels, label] }));
    void (async () => {
      const { error } = await supabase.from("visit_labels").insert({
        id,
        name: label.name,
        duration_minutes: label.duration_minutes,
        price_pln: label.price_pln,
        description: label.description,
        bookable: label.bookable,
        sort_order: label.sort_order,
      });
      if (error) {
        set((s) => ({ labels: s.labels.filter((l) => l.id !== id) }));
        handleError("Dodanie usługi nie powiodło się", error);
      }
    })();
  },

  updateLabel: (lid, patch) => {
    const prev = get().labels.find((l) => l.id === lid);
    set((s) => ({
      labels: s.labels.map((l) => (l.id === lid ? { ...l, ...patch } : l)),
    }));
    void (async () => {
      const { error } = await supabase
        .from("visit_labels")
        .update(patch)
        .eq("id", lid);
      if (error && prev) {
        set((s) => ({
          labels: s.labels.map((l) => (l.id === lid ? prev : l)),
        }));
        handleError("Zapis usługi nie powiódł się", error);
      }
    })();
  },

  reorderLabels: (ids) => {
    const prev = get().labels;
    const orderById = new Map(ids.map((id, i) => [id, i]));
    set((s) => ({
      labels: s.labels
        .map((l) => ({ ...l, sort_order: orderById.get(l.id) ?? l.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
    void (async () => {
      const results = await Promise.all(
        ids.map((id, i) =>
          supabase.from("visit_labels").update({ sort_order: i }).eq("id", id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        set({ labels: prev });
        handleError("Zmiana kolejności nie powiodła się", failed.error);
      }
    })();
  },

  removeLabel: (lid) => {
    const prev = get().labels.find((l) => l.id === lid);
    set((s) => ({ labels: s.labels.filter((l) => l.id !== lid) }));
    void (async () => {
      const { error } = await supabase.from("visit_labels").delete().eq("id", lid);
      if (error && prev) {
        set((s) => ({ labels: [...s.labels, prev] }));
        handleError("Usunięcie usługi nie powiodło się", error);
      }
    })();
  },

  addNote: (n) => {
    const id = newId();
    const created_at = new Date().toISOString();
    const note: VisitNote = {
      id,
      appointment_id: n.appointment_id,
      patient_id: n.patient_id,
      body: n.body,
      created_at,
      photos: n.photos ?? [],
    };
    set((s) => ({ notes: [note, ...s.notes] }));
    void (async () => {
      const { error } = await supabase.from("visit_notes").insert({
        id,
        appointment_id: n.appointment_id,
        patient_id: n.patient_id,
        body: n.body,
      });
      if (error) {
        set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
        handleError("Zapis notatki nie powiódł się", error);
      }
    })();
  },

  updateTemplate: (tid, body) => {
    const prev = get().templates.find((t) => t.id === tid);
    set((s) => ({
      templates: s.templates.map((t) => (t.id === tid ? { ...t, body } : t)),
    }));
    void (async () => {
      const { error } = await supabase
        .from("message_templates")
        .update({ body })
        .eq("id", tid);
      if (error && prev) {
        set((s) => ({
          templates: s.templates.map((t) => (t.id === tid ? prev : t)),
        }));
        handleError("Zapis szablonu nie powiódł się", error);
      }
    })();
  },

  approveProposal: (mpid, approved) => {
    set((s) => ({
      proposals: s.proposals.map((p) =>
        p.id === mpid ? { ...p, approved } : p,
      ),
    }));
    void (async () => {
      const { error } = await supabase
        .from("marketing_proposals")
        .update({ approved })
        .eq("id", mpid);
      if (error) handleError("Zapis propozycji nie powiódł się", error);
    })();
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    const settingsId = get()._settingsId;
    if (!settingsId) return;
    void (async () => {
      const { error } = await supabase
        .from("app_settings")
        .update(patch)
        .eq("id", settingsId);
      if (error) handleError("Zapis ustawień nie powiódł się", error);
    })();
  },

  updateWorkingHours: (weekday, patch) => {
    const prev = get().workingHours.find((w) => w.weekday === weekday);
    if (!prev) return;
    const next = { ...prev, ...patch };
    set((s) => ({
      workingHours: s.workingHours.map((w) => (w.weekday === weekday ? next : w)),
    }));
    void (async () => {
      const { error } = await supabase
        .from("working_hours")
        .update({
          is_open: next.is_open,
          start_time: next.start_time,
          end_time: next.end_time,
        })
        .eq("weekday", weekday);
      if (error) {
        set((s) => ({
          workingHours: s.workingHours.map((w) => (w.weekday === weekday ? prev : w)),
        }));
        handleError("Zapis godzin pracy nie powiódł się", error);
      }
    })();
  },

  addDayOff: (date, reason) => {
    const id = newId();
    const entry: DayOff = {
      id,
      date,
      reason: emptyToNull(reason ?? null),
      blocks_booking: true,
    };
    set((s) => ({
      daysOff: [...s.daysOff.filter((d) => d.date !== date), entry].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }));
    void (async () => {
      const { error } = await supabase.from("day_off").insert({
        id,
        date,
        reason: entry.reason,
        blocks_booking: true,
      });
      if (error) {
        set((s) => ({ daysOff: s.daysOff.filter((d) => d.id !== id) }));
        handleError("Dodanie dnia wolnego nie powiodło się", error);
      }
    })();
  },

  removeDayOff: (id) => {
    const prev = get().daysOff.find((d) => d.id === id);
    if (!prev) return;
    set((s) => ({ daysOff: s.daysOff.filter((d) => d.id !== id) }));
    void (async () => {
      const { error } = await supabase.from("day_off").delete().eq("id", id);
      if (error) {
        set((s) => ({
          daysOff: [...s.daysOff, prev].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        handleError("Usunięcie dnia wolnego nie powiodło się", error);
      }
    })();
  },


  reset: () => {
    // Zachowane w API dla kompatybilności — w wersji z Cloud nic nie robimy.
  },
}));
