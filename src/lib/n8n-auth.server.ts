import { timingSafeEqual } from "crypto";

const UNAUTHORIZED = () => new Response("Unauthorized", { status: 401 });

/**
 * Weryfikuje nagłówek `Authorization: Bearer <N8N_WEBHOOK_SECRET>`.
 * Zwraca `null` gdy OK, w przeciwnym razie gotową odpowiedź 401 (bez szczegółów).
 */
export function verifyN8nBearer(request: Request): Response | null {
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (!expected) return UNAUTHORIZED();

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return UNAUTHORIZED();

  const provided = match[1].trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return UNAUTHORIZED();
  try {
    if (!timingSafeEqual(a, b)) return UNAUTHORIZED();
  } catch {
    return UNAUTHORIZED();
  }
  return null;
}
