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

// Zakotwiczamy dane na "dziś" (dynamicznie), żeby ekran Dzisiaj miał zawsze coś do pokazania.
const today = new Date();
today.setSeconds(0, 0);

function at(hour: number, minute = 0, dayOffset = 0): string {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const initialPatients: Patient[] = [
  {
    id: "p1",
    first_name: "Janusz",
    last_name: "Kowalski",
    salutation: "Panie Januszu",
    phone: "+48 601 234 567",
    birth_date: "1962-05-14",
    service_consent_at: "2024-03-10T10:00:00.000Z",
    marketing_consent_at: "2024-03-10T10:00:00.000Z",
    created_at: "2024-03-10T10:00:00.000Z",
  },
  {
    id: "p2",
    first_name: "Anna",
    last_name: "Nowak",
    salutation: "Pani Anno",
    phone: "+48 502 987 654",
    birth_date: "1988-11-02",
    service_consent_at: "2024-06-01T09:00:00.000Z",
    created_at: "2024-06-01T09:00:00.000Z",
  },
  {
    id: "p3",
    first_name: "Tomasz",
    last_name: "Wiśniewski",
    salutation: "Panie Tomaszu",
    phone: "+48 604 111 222",
    birth_date: "1975-01-20",
    // brak zgody obsługowej — sygnalizujemy w UI
    created_at: "2025-01-15T12:00:00.000Z",
  },
  {
    id: "p4",
    first_name: "Barbara",
    last_name: "Zielińska",
    salutation: "Pani Basiu",
    phone: "+48 500 333 444",
    birth_date: "1955-07-30",
    service_consent_at: "2023-09-01T08:00:00.000Z",
    marketing_consent_at: "2023-09-01T08:00:00.000Z",
    created_at: "2023-09-01T08:00:00.000Z",
  },
];

export const initialLabels: VisitLabel[] = [
  { id: "l1", name: "Masaż leczniczy" },
  { id: "l2", name: "Terapia manualna" },
  { id: "l3", name: "Kinesiotaping" },
  { id: "l4", name: "Rehabilitacja pourazowa" },
  { id: "l5", name: "Konsultacja" },
];

export const initialAppointments: Appointment[] = [
  {
    id: "a1",
    type: "patient_visit",
    starts_at: at(9, 0),
    ends_at: at(9, 45),
    status: "scheduled",
    patient_id: "p1",
    visit_label_id: "l2",
  },
  {
    id: "a2",
    type: "patient_visit",
    starts_at: at(10, 0),
    ends_at: at(10, 45),
    status: "scheduled",
    patient_id: "p2",
    visit_label_id: "l1",
  },
  {
    id: "a3",
    type: "family_event",
    starts_at: at(13, 0),
    ends_at: at(14, 0),
    status: "scheduled",
    title: "Obiad z rodziną",
  },
  {
    id: "a4",
    type: "patient_visit",
    starts_at: at(15, 30),
    ends_at: at(16, 15),
    status: "cancelled",
    patient_id: "p3",
    visit_label_id: "l4",
  },
  {
    id: "a5",
    type: "patient_visit",
    starts_at: at(17, 0),
    ends_at: at(17, 45),
    status: "scheduled",
    patient_id: "p4",
    visit_label_id: "l3",
  },
  {
    id: "a6",
    type: "patient_visit",
    starts_at: at(9, 0, 1),
    ends_at: at(9, 45, 1),
    status: "scheduled",
    patient_id: "p2",
    visit_label_id: "l5",
  },
  {
    id: "a7",
    type: "family_event",
    starts_at: at(18, 0, 2),
    ends_at: at(20, 0, 2),
    status: "scheduled",
    title: "Zebranie w szkole",
  },
  {
    id: "a8",
    type: "patient_visit",
    starts_at: at(11, 0, -1),
    ends_at: at(11, 45, -1),
    status: "completed",
    patient_id: "p1",
    visit_label_id: "l2",
  },
];

export const initialNotes: VisitNote[] = [
  {
    id: "n1",
    appointment_id: "a8",
    patient_id: "p1",
    body: "Pacjent zgłasza poprawę w zakresie ruchomości szyjnego odcinka kręgosłupa. Zalecono kontynuację ćwiczeń w domu 2x dziennie.",
    created_at: at(12, 0, -1),
    photos: [],
  },
];

export const initialMessages: MessageLog[] = [
  {
    id: "m1",
    appointment_id: "a1",
    patient_id: "p1",
    kind: "reminder_24h",
    status: "sent",
    body: "Panie Januszu, przypominam o wizycie jutro o 09:00.",
    created_at: at(9, 0, -1),
    sent_at: at(9, 1, -1),
  },
  {
    id: "m2",
    appointment_id: "a2",
    patient_id: "p2",
    kind: "reminder_24h",
    status: "sent",
    body: "Pani Anno, przypominam o wizycie jutro o 10:00.",
    created_at: at(10, 0, -1),
    sent_at: at(10, 1, -1),
  },
  {
    id: "m3",
    appointment_id: "a5",
    patient_id: "p4",
    kind: "reminder_24h",
    status: "pending",
    body: "Pani Basiu, przypominam o wizycie jutro o 17:00.",
    created_at: at(8, 0),
  },
];

export const initialProposals: MarketingProposal[] = [
  {
    id: "mp1",
    patient_id: "p1",
    reason: "anniversary",
    body: "Panie Januszu, mija rok od naszej pierwszej wizyty. Serdecznie dziękuję za zaufanie!",
    created_at: at(8, 0),
    approved: null,
  },
  {
    id: "mp2",
    patient_id: "p4",
    reason: "birthday",
    body: "Pani Basiu, wszystkiego najlepszego z okazji urodzin! Życzę zdrowia i dużo energii.",
    created_at: at(8, 0),
    approved: null,
  },
];

export const initialTemplates: MessageTemplate[] = [
  {
    id: "t1",
    kind: "reminder_24h",
    body: "{salutation}, przypominam o wizycie {data} o {godzina}.",
  },
  {
    id: "t2",
    kind: "confirmation",
    body: "{salutation}, potwierdzam wizytę {data} o {godzina}.",
  },
  {
    id: "t3",
    kind: "cancellation",
    body: "{salutation}, wizyta {data} o {godzina} została odwołana.",
  },
  {
    id: "t4",
    kind: "marketing_anniversary",
    body: "{salutation}, mija rok od naszej pierwszej wizyty. Dziękuję za zaufanie!",
  },
  {
    id: "t5",
    kind: "marketing_birthday",
    body: "{salutation}, wszystkiego najlepszego z okazji urodzin!",
  },
];

export const initialSettings: AppSettings = {
  therapist_name: "mgr Marek Fizjoterapeuta",
  clinic_name: "Gabinet FizjoPlan",
};
