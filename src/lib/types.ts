// Typy zgodne z docelowym modelem danych (dokument 03).
// W tej iteracji używane tylko przez mock store — łatwe przejście na Supabase.

export type UserRole = "therapist" | "family";

export type AppointmentType = "patient_visit" | "family_event";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  salutation: string; // np. "Panie Januszu"
  phone: string; // wymagany, unikalny
  birth_date?: string; // ISO date
  service_consent_at?: string; // ISO datetime; brak = brak SMS-ów
  service_consent_changed_at?: string; // ostatnia zmiana stanu zgody
  marketing_consent_at?: string;
  marketing_consent_changed_at?: string;
  general_note?: string;
  archived_at?: string; // ustawione = zarchiwizowany
  created_at: string;
}

export interface VisitLabel {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  starts_at: string; // ISO datetime
  ends_at: string;
  status: AppointmentStatus;
  patient_id?: string; // wymagane gdy patient_visit
  visit_label_id?: string;
  title?: string; // dla family_event
  notes?: string;
}

export interface VisitNote {
  id: string;
  appointment_id: string;
  patient_id: string;
  body: string;
  created_at: string;
  photos: NotePhoto[];
}

export interface NotePhoto {
  id: string;
  storage_path: string; // w mocku: nazwa pliku placeholder
}

export type MessageKind =
  | "reminder_24h"
  | "confirmation"
  | "cancellation"
  | "marketing_anniversary"
  | "marketing_birthday";

export type MessageStatus = "pending" | "sent" | "failed";

export interface MessageLog {
  id: string;
  appointment_id?: string;
  patient_id: string;
  kind: MessageKind;
  status: MessageStatus;
  body: string;
  created_at: string;
  sent_at?: string;
  error?: string;
}

export type MarketingReason = "anniversary" | "birthday";

export interface MarketingProposal {
  id: string;
  patient_id: string;
  reason: MarketingReason;
  body: string;
  created_at: string;
  approved: boolean | null; // null = oczekuje, true = zatwierdzone, false = odrzucone
}

export interface MessageTemplate {
  id: string;
  kind: MessageKind;
  body: string; // z placeholderami {salutation}, {data}, {godzina}
}

export interface AppSettings {
  therapist_name: string;
  clinic_name: string;
}
