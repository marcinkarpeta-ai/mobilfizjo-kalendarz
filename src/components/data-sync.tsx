import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import type {
  Appointment,
  DayOff,
  MarketingProposal,
  MessageLog,
  MessageTemplate,
  Patient,
  VisitLabel,
  VisitNote,
  WorkingHours,
} from "@/lib/types";

function u<T>(v: T | null | undefined): T | undefined {
  return v ?? undefined;
}

/**
 * Ładuje dane z Cloud (Supabase) i wpycha je do zustand store'a,
 * żeby komponenty korzystające z `useStore` działały bez zmian.
 * Montowany raz, w layout'cie chronionej części aplikacji.
 */
export function DataSync() {
  const hydrate = useStore((s) => s._hydrate);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const [
        patientsRes,
        labelsRes,
        apptsRes,
        notesRes,
        photosRes,
        messagesRes,
        proposalsRes,
        templatesRes,
        settingsRes,
        workingHoursRes,
        daysOffRes,
      ] = await Promise.all([
        supabase.from("patients").select("*").order("created_at", { ascending: false }),
        supabase.from("visit_labels").select("*").order("created_at", { ascending: true }),
        supabase.from("appointments").select("*"),
        supabase.from("visit_notes").select("*").order("created_at", { ascending: false }),
        supabase.from("note_photos").select("*"),
        supabase.from("messages_log").select("*").order("created_at", { ascending: false }),
        supabase.from("marketing_proposals").select("*").order("created_at", { ascending: false }),
        supabase.from("message_templates").select("*"),
        supabase.from("app_settings").select("*").limit(1).maybeSingle(),
        supabase.from("working_hours").select("*").order("weekday", { ascending: true }),
        supabase.from("day_off").select("*").order("date", { ascending: true }),
      ]);


      if (cancelled) return;

      const patients: Patient[] = (patientsRes.data ?? []).map((r) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        salutation: r.salutation,
        phone: r.phone,
        birth_date: u(r.birth_date),
        service_consent_at: u(r.service_consent_at),
        service_consent_changed_at: u(r.service_consent_changed_at),
        marketing_consent_at: u(r.marketing_consent_at),
        marketing_consent_changed_at: u(r.marketing_consent_changed_at),
        general_note: u(r.general_note),
        archived_at: u(r.archived_at),
        created_at: r.created_at,
      }));

      const labels: VisitLabel[] = (labelsRes.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
      }));

      const appointments: Appointment[] = (apptsRes.data ?? []).map((r) => ({
        id: r.id,
        type: r.type,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        status: r.status,
        patient_id: u(r.patient_id),
        visit_label_id: u(r.visit_label_id),
        title: u(r.title),
        notes: u(r.notes),
        created_by: u(r.created_by),
      }));

      const photosByNote = new Map<string, { id: string; storage_path: string }[]>();
      for (const p of photosRes.data ?? []) {
        const arr = photosByNote.get(p.note_id) ?? [];
        arr.push({ id: p.id, storage_path: p.storage_path });
        photosByNote.set(p.note_id, arr);
      }

      const notes: VisitNote[] = (notesRes.data ?? []).map((r) => ({
        id: r.id,
        appointment_id: r.appointment_id,
        patient_id: r.patient_id,
        body: r.body,
        created_at: r.created_at,
        photos: photosByNote.get(r.id) ?? [],
      }));

      const messages: MessageLog[] = (messagesRes.data ?? []).map((r) => ({
        id: r.id,
        appointment_id: u(r.appointment_id),
        patient_id: r.patient_id,
        kind: r.kind,
        status: r.status as MessageLog["status"],
        body: r.body,
        created_at: r.created_at,
        scheduled_at: u(r.scheduled_at),
        sent_at: u(r.sent_at),
        error: u(r.error),
      }));

      const proposals: MarketingProposal[] = (proposalsRes.data ?? []).map((r) => ({
        id: r.id,
        patient_id: r.patient_id,
        reason: r.reason,
        body: r.body,
        created_at: r.created_at,
        approved: r.approved,
      }));

      const templates: MessageTemplate[] = (templatesRes.data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind,
        body: r.body,
      }));

      const settingsRow = settingsRes.data;
      const settings = settingsRow
        ? {
            therapist_name: settingsRow.therapist_name ?? "",
            clinic_name: settingsRow.clinic_name ?? "",
            sms_price_net_gr: settingsRow.sms_price_net_gr ?? 10,
            default_visit_minutes: settingsRow.default_visit_minutes ?? 60,
            sms_balance_full: settingsRow.sms_balance_full ?? null,
            sms_balance_pln:
              settingsRow.sms_balance_pln === null ||
              settingsRow.sms_balance_pln === undefined
                ? null
                : Number(settingsRow.sms_balance_pln),
            sms_balance_updated_at: settingsRow.sms_balance_updated_at ?? null,
          }
        : {
            therapist_name: "",
            clinic_name: "",
            sms_price_net_gr: 10,
            default_visit_minutes: 60,
            sms_balance_full: null,
            sms_balance_pln: null,
            sms_balance_updated_at: null,
          };


      hydrate({
        patients,
        labels,
        appointments,
        notes,
        messages,
        proposals,
        templates,
        settings,
        _settingsId: settingsRow?.id ?? null,
        _hydrated: true,
      });
    }

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  return null;
}
