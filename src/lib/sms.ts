// Reguły liczenia SMS (GSM 03.38 vs UCS-2) i podgląd treści szablonów.

const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(
    "",
  ),
);
// znaki wymagające "escape" w GSM (liczą się jako 2)
const GSM_EXT = new Set("^{}\\[~]|€".split(""));

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM_BASIC.has(ch) && !GSM_EXT.has(ch)) return false;
  }
  return true;
}

export function gsmLength(text: string): number {
  let n = 0;
  for (const ch of text) n += GSM_EXT.has(ch) ? 2 : 1;
  return n;
}

export type SmsInfo = {
  encoding: "gsm" | "ucs2";
  length: number;
  singleLimit: number;
  perSegment: number;
  segments: number;
};

export function smsSegments(text: string): SmsInfo {
  const gsm = isGsm7(text);
  const length = gsm ? gsmLength(text) : [...text].length;
  const singleLimit = gsm ? 160 : 70;
  const perSegment = gsm ? 153 : 67;
  const segments =
    length === 0 ? 1 : length <= singleLimit ? 1 : Math.ceil(length / perSegment);
  return {
    encoding: gsm ? "gsm" : "ucs2",
    length,
    singleLimit,
    perSegment,
    segments,
  };
}

export function renderTemplatePreview(
  body: string,
  longestSalutation: string,
): string {
  return body
    .replaceAll("{{date}}", "29.07.2026")
    .replaceAll("{{time}}", "20:00")
    .replaceAll("{{ics_link}}", "")
    .replaceAll("{{salutation}}", longestSalutation);
}

export function pickLongestSalutation(
  patients: Array<{ salutation?: string | null }>,
): string {
  let best = "";
  for (const p of patients) {
    const s = (p.salutation ?? "").trim();
    if (s.length > best.length) best = s;
  }
  return best.length > 0 ? best : "Panie Mieczysławie";
}
