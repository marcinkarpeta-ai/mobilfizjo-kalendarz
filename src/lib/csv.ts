// Minimal CSV parser with quotes and auto separator detection.

export function detectSeparator(sample: string): string {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": 0,
    ";": 0,
    "\t": 0,
  };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}

export function parseCsv(
  text: string,
  separator?: string,
): { headers: string[]; rows: string[][]; separator: string } {
  const clean = text.replace(/^\uFEFF/, "");
  const sep = separator ?? detectSeparator(clean);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === sep) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // last field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // strip fully empty rows
  const filtered = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = (filtered.shift() ?? []).map((h) => h.trim());
  return { headers, rows: filtered, separator: sep };
}

export function normalizePhone(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

const PHONE_RE = /^\+?\d[\d\s-]{7,17}$/;
export function isValidPhone(v: string): boolean {
  return PHONE_RE.test(v.trim());
}

export function normalizeBirthDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD.MM.YYYY or DD/MM/YYYY
  m = s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}
