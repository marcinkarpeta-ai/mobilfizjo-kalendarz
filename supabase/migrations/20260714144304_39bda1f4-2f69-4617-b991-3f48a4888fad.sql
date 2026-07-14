ALTER TABLE public.patients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_name_present_chk
  CHECK (
    COALESCE(NULLIF(btrim(first_name), ''), NULLIF(btrim(last_name), '')) IS NOT NULL
  );