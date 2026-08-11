ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS booking_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_consent_changed_at timestamptz;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_days_ahead integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS booking_min_hours_ahead integer NOT NULL DEFAULT 12;

ALTER TYPE public.message_kind ADD VALUE IF NOT EXISTS 'booking_code';

CREATE TABLE IF NOT EXISTS public.booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  token_hash text,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.booking_sessions TO service_role;

ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS booking_sessions_phone_created_idx
  ON public.booking_sessions (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_sessions_token_idx
  ON public.booking_sessions (token_hash);
