import { parseCsv, isValidPhone, normalizeBirthDate, canonicalPhone, formatPhoneStorage } from "./csv";
import type { Patient } from "./types";

export type ImportStatus = "new" | "duplicate" | "error";

export interface ImportRow {
  status: ImportStatus;
  error?: string;
  warning?: string;
  duplicateOf?: { id: string; name: string };
  data: {
    first_name: string | null;
    last_name: string | null;
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
  for (const p of existingPatients) {
    const c = canonicalPhone(p.phone);
    if (c) byPhone.set(c, p);
  }

  const seenInFile = new Map<string, number>();

  const out: ImportRow[] = rows.map((cols) => {
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => (raw[h] = cols[i] ?? ""));

    const getCell = (key: "first_name" | "last_name" | "phone" | "salutation" | "birth_date" | "general_note"): string => {
      const idx = mapping.indexOf(key);
      return idx >= 0 ? (cols[idx] ?? "").trim() : "";
    };

    const firstNameRaw = getCell("first_name");
    const lastNameRaw = getCell("last_name");
    const phoneRaw = getCell("phone");
    const salutationRaw = getCell("salutation");
    const birthRaw = getCell("birth_date");
    const noteRaw = getCell("general_note");

    const first_name = firstNameRaw || null;
    const last_name = lastNameRaw || null;
    const salutation = salutationRaw ? salutationRaw : null;
    const general_note = noteRaw ? noteRaw : null;
    const birth_date = birthRaw ? normalizeBirthDate(birthRaw) : null;
    const canon = canonicalPhone(phoneRaw);

    const data = {
      first_name,
      last_name,
      phone: canon ? formatPhoneStorage(phoneRaw) : phoneRaw.trim(),
      salutation,
      birth_date,
      general_note,
    };

    if (missingRequired.length > 0) {
      return { status: "error", error: "Brak wymaganych kolumn.", data, raw };
    }
    if (!first_name && !last_name) {
      return { status: "error", error: "Brak imienia i nazwiska.", data, raw };
    }
    if (!phoneRaw || !isValidPhone(phoneRaw) || !canon) {
      return { status: "error", error: "Nieprawidłowy telefon.", data, raw };
    }
    if (birthRaw && !birth_date) {
      return { status: "error", error: "Nieprawidłowa data urodzenia.", data, raw };
    }

    const warning = !first_name || !last_name ? "Dane niekompletne" : undefined;

    const existing = byPhone.get(canon);
    if (existing) {
      const existingName =
        [existing.first_name, existing.last_name]
          .map((v) => (v ?? "").trim())
          .filter(Boolean)
          .join(" ") || "(bez nazwiska)";
      return {
        status: "duplicate",
        data,
        raw,
        duplicateOf: { id: existing.id, name: existingName },
      };
    }

    // duplicate within file (by canonical form)
    const seenIdx = seenInFile.get(canon);
    if (seenIdx !== undefined) {
      return {
        status: "duplicate",
        data,
        raw,
        duplicateOf: { id: "", name: `wiersz #${seenIdx + 1} w pliku` },
      };
    }
    seenInFile.set(canon, seenInFile.size);

    return { status: "new", data, raw, warning };
  });

  return { rows: out, headers, separator, missingRequired };
}
