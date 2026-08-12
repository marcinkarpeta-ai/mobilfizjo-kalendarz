ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booked_online boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.book_online_appointment(
  _patient_id uuid,
  _visit_label_id uuid,
  _starts_at timestamptz,
  _ends_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('fizjoplan_booking'));

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.status = 'scheduled'
      AND a.starts_at < _ends_at
      AND a.ends_at > _starts_at
  ) THEN
    RAISE EXCEPTION 'slot_taken';
  END IF;

  INSERT INTO public.appointments(type, starts_at, ends_at, status, patient_id, visit_label_id, booked_online)
  VALUES ('patient_visit', _starts_at, _ends_at, 'scheduled', _patient_id, _visit_label_id, true)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.book_online_appointment(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_online_appointment(uuid, uuid, timestamptz, timestamptz) TO service_role;