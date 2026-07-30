ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS sms_balance_full integer,
  ADD COLUMN IF NOT EXISTS sms_balance_pln numeric(10,2),
  ADD COLUMN IF NOT EXISTS sms_balance_updated_at timestamptz;