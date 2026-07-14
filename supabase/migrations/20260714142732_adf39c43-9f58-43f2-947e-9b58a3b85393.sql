-- 1. Canonical phone function (IMMUTABLE, identical logic to JS)
CREATE OR REPLACE FUNCTION public.canonical_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
  len int;
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(_phone, '\D', '', 'g');
  len := length(digits);
  IF len = 11 AND left(digits, 2) = '48' THEN
    digits := substr(digits, 3);
  ELSIF len = 13 AND left(digits, 4) = '0048' THEN
    digits := substr(digits, 5);
  END IF;
  len := length(digits);
  IF len < 7 THEN RETURN NULL; END IF;
  IF len = 9 THEN
    RETURN '+48' || digits;
  END IF;
  RETURN '+' || digits;
END $$;

-- 2. Detect conflicts among active patients (before any change)
DO $$
DECLARE conflict text;
BEGIN
  SELECT string_agg(canon, ', ')
    INTO conflict
    FROM (
      SELECT public.canonical_phone(phone) AS canon
      FROM public.patients
      WHERE archived_at IS NULL AND phone IS NOT NULL
      GROUP BY 1
      HAVING count(*) > 1 AND (public.canonical_phone(phone)) IS NOT NULL
    ) t;
  IF conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Kolizja telefonow wsrod aktywnych pacjentow po normalizacji: %. Rozstrzygnij recznie przed ponowieniem migracji.', conflict;
  END IF;
END $$;

-- 3. Drop old unique constraint
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_phone_key;

-- 4. Normalize existing phone values to canonical storage format
--    PL 9-digit: "+48 XXX XXX XXX"; other valid: "+<digits>"; unparseable: leave as-is
UPDATE public.patients
SET phone = CASE
  WHEN public.canonical_phone(phone) IS NULL THEN phone
  WHEN public.canonical_phone(phone) LIKE '+48%' AND length(public.canonical_phone(phone)) = 12
    THEN '+48 '
      || substr(public.canonical_phone(phone), 4, 3)
      || ' '
      || substr(public.canonical_phone(phone), 7, 3)
      || ' '
      || substr(public.canonical_phone(phone), 10, 3)
  ELSE public.canonical_phone(phone)
END
WHERE phone IS NOT NULL;

-- 5. New partial unique index on canonical form for active patients
CREATE UNIQUE INDEX patients_phone_canonical_key
  ON public.patients (public.canonical_phone(phone))
  WHERE archived_at IS NULL;