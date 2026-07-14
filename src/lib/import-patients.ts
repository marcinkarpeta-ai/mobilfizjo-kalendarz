import { parseCsv, isValidPhone, normalizeBirthDate, canonicalPhone, formatPhoneStorage } from "./csv";
import type { Patient } from "./types";

export type ImportStatus = "new" | "duplicate" | "error";

export interface ImportRow {
  status: ImportStatus;
  error?: string;
  duplicateOf?: { id: string; name: string };
  data: {
    first_name: string;
    last_name: string;
    phone: string;
    salutation: string | null;
    birth_date: string | null;
    general_note: string | null;
  };
  raw: Record<string, string>;
}

// Normalizes a header for lookup: lowercase, strip diacritics, non-alnum.
function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_MAP: Record<string, keyof ImportRow["data"]> = {
  firstname: "first_name",
  imie: "first_name",
  lastname: "last_name",
  nazwisko: "last_name",
  phone: "phone",
  telefon: "phone",
  tel: "phone",
  salutation: "salutation",
  forma: "salutation",
  formagrzecznosciowa: "salutation",
  zwrot: "salutation",
  birthdate: "birth_date",
  dataurodzenia: "birth_date",
  urodziny: "birth_date",
  generalnote: "general_note",
  notatka: "general_note",
  uwagi: "general_note",
  note: "general_note",
};

function mapHeaders(headers: string[]): (keyof ImportRow["data"] | null)[] {
  return headers.map((h) => HEADER_MAP[normHeader(h)] ?? null);
}

export interface ImportPreview {
  rows: ImportRow[];
  headers: string[];
  separator: string;
  missingRequired: string[];
}

export function buildImportPreview(
  text: string,
  existingPatients: Patient[],
): ImportPreview {
  const { headers, rows, separator } = parseCsv(text);
  const mapping = mapHeaders(headers);
  const missingRequired: string[] = [];
  const hasFirst = mapping.includes("first_name");
  const hasLast = mapping.includes("last_name");
  const hasPhone = mapping.includes("phone");
  if (!hasFirst) missingRequired.push("Imię");
  if (!hasLast) missingRequired.push("Nazwisko");
  if (!hasPhone) missingRequired.push("Telefon");

  const byPhone = new Map<string, Patient>();
  for (const p of existingPatients) byPhone.set(normalizePhone(p.phone), p);

  const seenInFile = new Map<string, number>();

  const out: ImportRow[] = rows.map((cols) => {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => (raw[h] = cols[i] ?? ""));

    const get = (key: keyof ImportRow["data"]): string => {
      const idx = mapping.indexOf(key);
      return idx >= 0 ? (cols[idx] ?? "").trim() : "";
    };

    const first_name = get("first_name");
    const last_name = get("last_name");
    const phoneRaw = get("phone");
    const salutationRaw = get("salutation");
    const birthRaw = get("birth_date");
    const noteRaw = get("general_note");

    const salutation = salutationRaw.trim() ? salutationRaw.trim() : null;
    const general_note = noteRaw.trim() ? noteRaw.trim() : null;
    const birth_date = birthRaw ? normalizeBirthDate(birthRaw) : null;

    const data = {
      first_name,
      last_name,
      phone: normalizePhone(phoneRaw),
      salutation,
      birth_date,
      general_note,
    };

    if (missingRequired.length > 0) {
      return { status: "error", error: "Brak wymaganych kolumn.", data, raw };
    }
    if (!first_name) {
      return { status: "error", error: "Brak imienia.", data, raw };
    }
    if (!last_name) {
      return { status: "error", error: "Brak nazwiska.", data, raw };
    }
    if (!phoneRaw || !isValidPhone(phoneRaw)) {
      return { status: "error", error: "Nieprawidłowy telefon.", data, raw };
    }
    if (birthRaw && !birth_date) {
      return { status: "error", error: "Nieprawidłowa data urodzenia.", data, raw };
    }

    const existing = byPhone.get(data.phone);
    if (existing) {
      return {
        status: "duplicate",
        data,
        raw,
        duplicateOf: {
          id: existing.id,
          name: `${existing.first_name} ${existing.last_name}`,
        },
      };
    }

    // duplicate within file
    const seenIdx = seenInFile.get(data.phone);
    if (seenIdx !== undefined) {
      return {
        status: "duplicate",
        data,
        raw,
        duplicateOf: { id: "", name: `wiersz #${seenIdx + 1} w pliku` },
      };
    }
    seenInFile.set(data.phone, seenInFile.size);

    return { status: "new", data, raw };
  });

  return { rows: out, headers, separator, missingRequired };
}
