import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  initialAppointments,
  initialLabels,
  initialMessages,
  initialNotes,
  initialPatients,
  initialProposals,
  initialSettings,
  initialTemplates,
} from "./mock-data";
import type {
  Appointment,
  AppSettings,
  MarketingProposal,
  MessageLog,
  MessageTemplate,
  Patient,
  VisitLabel,
  VisitNote,
} from "./types";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface StoreState {
  patients: Patient[];
  labels: VisitLabel[];
  appointments: Appointment[];
  notes: VisitNote[];
  messages: MessageLog[];
  proposals: MarketingProposal[];
  templates: MessageTemplate[];
  settings: AppSettings;

  addPatient: (p: Omit<Patient, "id" | "created_at">) => Patient;
  updatePatient: (id: string, patch: Partial<Patient>) => void;

  addAppointment: (a: Omit<Appointment, "id">) => Appointment;
  cancelAppointment: (id: string) => void;

  addLabel: (name: string) => void;
  renameLabel: (id: string, name: string) => void;
  removeLabel: (id: string) => void;

  addNote: (n: Omit<VisitNote, "id" | "created_at" | "photos"> & { photos?: VisitNote["photos"] }) => void;

  updateTemplate: (id: string, body: string) => void;
  approveProposal: (id: string, approved: boolean) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;

  reset: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      patients: initialPatients,
      labels: initialLabels,
      appointments: initialAppointments,
      notes: initialNotes,
      messages: initialMessages,
      proposals: initialProposals,
      templates: initialTemplates,
      settings: initialSettings,

      addPatient: (p) => {
        const patient: Patient = { ...p, id: id("p"), created_at: new Date().toISOString() };
        set((s) => ({ patients: [patient, ...s.patients] }));
        return patient;
      },
      updatePatient: (pid, patch) =>
        set((s) => ({
          patients: s.patients.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
        })),

      addAppointment: (a) => {
        const appt: Appointment = { ...a, id: id("a") };
        set((s) => ({ appointments: [...s.appointments, appt] }));
        return appt;
      },
      cancelAppointment: (aid) =>
        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === aid ? { ...a, status: "cancelled" } : a,
          ),
        })),

      addLabel: (name) =>
        set((s) => ({ labels: [...s.labels, { id: id("l"), name }] })),
      renameLabel: (lid, name) =>
        set((s) => ({
          labels: s.labels.map((l) => (l.id === lid ? { ...l, name } : l)),
        })),
      removeLabel: (lid) =>
        set((s) => ({ labels: s.labels.filter((l) => l.id !== lid) })),

      addNote: (n) =>
        set((s) => ({
          notes: [
            {
              id: id("n"),
              created_at: new Date().toISOString(),
              photos: n.photos ?? [],
              appointment_id: n.appointment_id,
              patient_id: n.patient_id,
              body: n.body,
            },
            ...s.notes,
          ],
        })),

      updateTemplate: (tid, body) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === tid ? { ...t, body } : t)),
        })),
      approveProposal: (mpid, approved) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === mpid ? { ...p, approved } : p,
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      reset: () =>
        set({
          patients: initialPatients,
          labels: initialLabels,
          appointments: initialAppointments,
          notes: initialNotes,
          messages: initialMessages,
          proposals: initialProposals,
          templates: initialTemplates,
          settings: initialSettings,
        }),
    }),
    { name: "fizjoplan-store-v1" },
  ),
);
