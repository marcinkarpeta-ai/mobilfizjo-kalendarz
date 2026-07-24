// Typy zgodne z modelem danych FizjoPlan (krok A — Lovable Cloud / Supabase).

export type UserRole = "therapist" | "family" | "admin";

export type AppointmentType = "patient_visit" | "family_event";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface Patient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  salutation: string | null;
  phone: string;
  birth_date?: string;
  service_consent_at?: string;
  service_consent_changed_at?: string;
  marketing_consent_at?: string;
  marketing_consent_changed_at?: string;
  general_note?: string;
  archived_at?: string;
  created_at: string;
}

export interface VisitLabel {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  patient_id?: string;
  visit_label_id?: string;
  title?: string;
  notes?: string;
  created_by?: string;
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
  storage_path: string;
}

// Placeholdery szablonów: {{salutation}}, {{date}}, {{time}}, {{ics_link}}
export type MessageKind =
  | "reminder_24h"
  | "reminder_2h"
  | "confirmation"
  | "cancellation"
  | "marketing_anniversary"
  | "marketing_birthday";

export type MessageStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled"
  | "delivered"
  | "undelivered";

export interface MessageLog {
  id: string;
  appointment_id?: string;
  patient_id: string;
  kind: MessageKind;
  status: MessageStatus;
  body: string;
  created_at: string;
  scheduled_at?: string;
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
  approved: boolean | null;
}

export interface MessageTemplate {
  id: string;
  kind: MessageKind;
  body: string;
}

export interface AppSettings {
  therapist_name: string;
  clinic_name: string;
  sms_price_net_gr: number;
}
