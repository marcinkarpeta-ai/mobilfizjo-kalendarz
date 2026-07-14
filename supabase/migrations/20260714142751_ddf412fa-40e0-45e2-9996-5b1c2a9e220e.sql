CREATE OR REPLACE FUNCTION public.canonical_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
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