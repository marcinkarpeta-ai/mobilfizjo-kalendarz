
-- Zamiana enum message_status -> text + CHECK, plus nowe kolumny i indeksy dla integracji n8n.

ALTER TABLE public.messages_log ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.messages_log ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.messages_log ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.messages_log
  ADD CONSTRAINT messages_log_status_chk
  CHECK (status IN ('pending','processing','sent','failed','cancelled','delivered','undelivered'));

ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS provider_ref text;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE INDEX IF NOT EXISTS messages_log_claim_idx
  ON public.messages_log (scheduled_at)
  WHERE status IN ('pending','processing');

CREATE UNIQUE INDEX IF NOT EXISTS messages_log_provider_ref_uidx
  ON public.messages_log (provider_ref)
  WHERE provider_ref IS NOT NULL;

-- Atomowy claim: pobiera do _limit wiadomości pending (lub processing starsze niż 10 min),
-- zwraca id, phone (join z patients), body, kind. Pomija zablokowane wiersze.
CREATE OR REPLACE FUNCTION public.claim_pending_messages(_limit int)
RETURNS TABLE (id uuid, phone text, body text, kind text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH picked AS (
    SELECT m.id
    FROM public.messages_log m
    WHERE m.scheduled_at <= now()
      AND (m.status = 'pending'
           OR (m.status = 'processing' AND m.processing_started_at < now() - interval '10 minutes'))
    ORDER BY m.scheduled_at
    LIMIT GREATEST(COALESCE(_limit, 50), 1)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.messages_log m
    SET status = 'processing',
        processing_started_at = now()
    FROM picked
    WHERE m.id = picked.id
    RETURNING m.id, m.patient_id, m.body, m.kind::text AS kind
  )
  SELECT u.id, p.phone, u.body, u.kind
  FROM updated u
  JOIN public.patients p ON p.id = u.patient_id
  ORDER BY u.id;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_messages(int) FROM PUBLIC, anon, authenticated;
