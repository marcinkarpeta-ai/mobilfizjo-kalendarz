# Integracja n8n ↔ messages_log

Trzy publiczne endpointy pod `/api/public/messages-log/*`, chronione nagłówkiem `Authorization: Bearer <N8N_WEBHOOK_SECRET>`. Konwersja `message_status` z enumu na `text` + `CHECK`, dodanie kolumn `scheduled_at`, `delivered_at`, `provider_ref`, `processing_started_at`. Brak `INSERT` — wiadomości tworzy wyłącznie aplikacja.

## 1. Sekret

`N8N_WEBHOOK_SECRET` — dodam przez `add_secret` po zatwierdzeniu planu. Tę samą wartość wklejasz w n8n jako nagłówek `Authorization: Bearer …`.

## 2. Migracja bazy (jedna, w transakcji)

`status` i `kind` są dziś typami enum. `ALTER TYPE ADD VALUE` nie może być użyte w tej samej transakcji, w której nowa wartość jest wpisywana — dlatego przechodzę na `text + CHECK` (prościej i elastyczniej na przyszłość niż dwie osobne migracje).

Kroki w jednej migracji:

- `ALTER TABLE public.messages_log ALTER COLUMN status DROP DEFAULT`.
- `ALTER TABLE public.messages_log ALTER COLUMN status TYPE text USING status::text`.
- `ALTER TABLE public.messages_log ALTER COLUMN status SET DEFAULT 'pending'`.
- `ALTER TABLE public.messages_log ADD CONSTRAINT messages_log_status_chk CHECK (status IN ('pending','processing','sent','failed','cancelled','delivered','undelivered'))`.
- `kind` zostawiam jako enum bez zmian (nie dodajemy tam nowych wartości; endpointy tylko go czytają/zwracają).
- `ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now()`.
- `ADD COLUMN IF NOT EXISTS delivered_at timestamptz`.
- `ADD COLUMN IF NOT EXISTS provider_ref text`.
- `ADD COLUMN IF NOT EXISTS processing_started_at timestamptz`.
- Indeks częściowy `(scheduled_at) WHERE status IN ('pending','processing')` — szybki claim.
- Unikalny indeks częściowy `(provider_ref) WHERE provider_ref IS NOT NULL` — lookup w raporcie delivery.
- Enum `message_status` może zostać w bazie (nie usuwam, żeby nie ruszać ewentualnych zależności) — nieużywany.

RLS bez zmian; endpointy używają `supabaseAdmin` po weryfikacji Bearer.

Osobno, po zatwierdzonej migracji, jeden `UPDATE` w `client.ts` (typy regenerują się po migracji) — nie jest to schema-change.

## 3. Endpointy

Wspólny helper `src/lib/n8n-auth.server.ts` — timing-safe porównanie Bearer z `process.env.N8N_WEBHOOK_SECRET`, zwraca `Response('Unauthorized', {status: 401})` bez szczegółów. Env i `supabaseAdmin` czytane wewnątrz handlerów.

### POST `/api/public/messages-log/claim`
- `src/routes/api/public/messages-log/claim.ts`
- SECURITY DEFINER funkcja `public.claim_pending_messages(_limit int)` wywoływana przez `supabaseAdmin.rpc(...)`. Wewnątrz:
  ```sql
  UPDATE public.messages_log m
  SET status='processing', processing_started_at=now()
  WHERE m.id IN (
    SELECT id FROM public.messages_log
    WHERE scheduled_at <= now()
      AND (status='pending'
           OR (status='processing' AND processing_started_at < now() - interval '10 minutes'))
    ORDER BY scheduled_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING m.id, m.body, m.kind, m.patient_id;
  ```
  Potem join z `patients` po `patient_id` po stronie funkcji → zwraca `(id, phone, body, kind)`. Funkcja tworzona w tej samej migracji co reszta.
- Response: `{ items: [{id, phone, body, kind}] }`.

### PATCH `/api/public/messages-log/$id/result`
- `src/routes/api/public/messages-log/$id.result.ts`
- Zod: `{ status: 'sent'|'failed', provider_ref?: string, error?: string }`.
- `UPDATE ... WHERE id=$id AND status='processing'` — ustawia `status`, `sent_at=now()` gdy `sent`, `provider_ref`, `error`, czyści `processing_started_at`. 0 wierszy → 409 `{error:'not_in_processing'}`.

### PATCH `/api/public/messages-log/$id/delivery`
- `src/routes/api/public/messages-log/$id.delivery.ts`
- `$id` = `provider_ref` (SerwerSMS unique_id), zgodnie z opisem.
- Zod: `{ status: 'delivered'|'undelivered', reason?: string, delivered_at?: string(datetime ISO) }`.
- `UPDATE ... WHERE provider_ref=$id AND status='sent'` — ustawia `status`, `delivered_at=coalesce(payload, now())`, `error=reason` przy `undelivered`. 0 wierszy → 409.

Wszystkie: JSON, walidacja Zod, brak PII w błędach, `OPTIONS` nie potrzebny (n8n woła serwer-serwer).

## 4. Poza zakresem

- Frontend/UI, cron w n8n, tworzenie `messages_log` przez aplikację (bez zmian).
- URL do konfiguracji w n8n: `https://project--3219d5d0-0620-462c-b227-a8313dfaa36f.lovable.app/api/public/messages-log/claim` itd.

## Pytanie do potwierdzenia

`$id` w `/delivery` = `provider_ref` (SerwerSMS unique_id). Jeśli wolisz mieć tam nasze `messages_log.id`, a `provider_ref` w body — powiedz, zamienię przed implementacją.
