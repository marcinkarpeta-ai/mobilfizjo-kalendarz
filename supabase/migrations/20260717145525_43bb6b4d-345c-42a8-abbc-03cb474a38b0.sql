
-- Renderer for message body from template
CREATE OR REPLACE FUNCTION public.render_message_body(_kind public.message_kind, _patient_id uuid, _starts_at timestamptz)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl text;
  sal text;
  d text;
  t text;
  out_body text;
BEGIN
  SELECT body INTO tpl FROM public.message_templates WHERE kind = _kind LIMIT 1;
  IF tpl IS NULL THEN RETURN ''; END IF;

  SELECT NULLIF(btrim(salutation), '') INTO sal FROM public.patients WHERE id = _patient_id;
  IF sal IS NULL THEN sal := 'Dzień dobry'; END IF;

  d := to_char(_starts_at AT TIME ZONE 'Europe/Warsaw', 'DD.MM.YYYY');
  t := to_char(_starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI');

  out_body := tpl;
  out_body := replace(out_body, '{{salutation}}', sal);
  out_body := replace(out_body, '{{date}}', d);
  out_body := replace(out_body, '{{time}}', t);
  out_body := replace(out_body, '{{ics_link}}', '');
  -- collapse double spaces
  out_body := regexp_replace(out_body, ' {2,}', ' ', 'g');
  -- space before period/comma
  out_body := regexp_replace(out_body, ' +([.,])', '\1', 'g');
  RETURN btrim(out_body);
END $$;

GRANT EXECUTE ON FUNCTION public.render_message_body(public.message_kind, uuid, timestamptz) TO authenticated, service_role;

-- Enqueue confirmation + reminders for a scheduled patient_visit
CREATE OR REPLACE FUNCTION public.enqueue_visit_messages(_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  p record;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = _appointment_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF a.type <> 'patient_visit' OR a.status <> 'scheduled' OR a.patient_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO p FROM public.patients WHERE id = a.patient_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF p.service_consent_at IS NULL OR COALESCE(btrim(p.phone), '') = '' THEN
    RETURN;
  END IF;

  -- confirmation
  INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
  VALUES (a.id, a.patient_id, 'confirmation', 'pending',
          public.render_message_body('confirmation', a.patient_id, a.starts_at),
          now_ts);

  -- reminder_24h if in future
  IF a.starts_at - interval '24 hours' > now_ts THEN
    INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
    VALUES (a.id, a.patient_id, 'reminder_24h', 'pending',
            public.render_message_body('reminder_24h', a.patient_id, a.starts_at),
            a.starts_at - interval '24 hours');
  END IF;

  -- reminder_2h if in future
  IF a.starts_at - interval '2 hours' > now_ts THEN
    INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
    VALUES (a.id, a.patient_id, 'reminder_2h', 'pending',
            public.render_message_body('reminder_2h', a.patient_id, a.starts_at),
            a.starts_at - interval '2 hours');
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.enqueue_visit_messages(uuid) TO authenticated, service_role;

-- AFTER INSERT trigger
CREATE OR REPLACE FUNCTION public.tg_appointments_after_insert_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_visit_messages(NEW.id);
  RETURN NEW;
END $$;

GRANT EXECUTE ON FUNCTION public.tg_appointments_after_insert_messages() TO authenticated, service_role;

DROP TRIGGER IF EXISTS appointments_after_insert_messages ON public.appointments;
CREATE TRIGGER appointments_after_insert_messages
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.tg_appointments_after_insert_messages();

-- AFTER UPDATE trigger: handle cancellation & rescheduling
CREATE OR REPLACE FUNCTION public.tg_appointments_after_update_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  now_ts timestamptz := now();
  has_consent boolean;
BEGIN
  IF NEW.type <> 'patient_visit' OR NEW.patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM public.patients WHERE id = NEW.patient_id;
  has_consent := FOUND AND p.service_consent_at IS NOT NULL AND COALESCE(btrim(p.phone), '') <> '';

  -- Cancellation
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.messages_log
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id
        AND status IN ('pending', 'processing');

    IF has_consent THEN
      INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
      VALUES (NEW.id, NEW.patient_id, 'cancellation', 'pending',
              public.render_message_body('cancellation', NEW.patient_id, NEW.starts_at),
              now_ts);
    END IF;
    RETURN NEW;
  END IF;

  -- Rescheduling: starts_at changed while still scheduled
  IF NEW.status = 'scheduled' AND NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    -- reminder_24h
    UPDATE public.messages_log
      SET scheduled_at = NEW.starts_at - interval '24 hours',
          body = public.render_message_body('reminder_24h', NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind = 'reminder_24h'
        AND NEW.starts_at - interval '24 hours' > now_ts;

    UPDATE public.messages_log
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind = 'reminder_24h'
        AND NEW.starts_at - interval '24 hours' <= now_ts;

    -- reminder_2h
    UPDATE public.messages_log
      SET scheduled_at = NEW.starts_at - interval '2 hours',
          body = public.render_message_body('reminder_2h', NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind = 'reminder_2h'
        AND NEW.starts_at - interval '2 hours' > now_ts;

    UPDATE public.messages_log
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind = 'reminder_2h'
        AND NEW.starts_at - interval '2 hours' <= now_ts;

    -- confirmation: re-render body if still pending (not yet sent)
    UPDATE public.messages_log
      SET body = public.render_message_body('confirmation', NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind = 'confirmation';
  END IF;

  RETURN NEW;
END $$;

GRANT EXECUTE ON FUNCTION public.tg_appointments_after_update_messages() TO authenticated, service_role;

DROP TRIGGER IF EXISTS appointments_after_update_messages ON public.appointments;
CREATE TRIGGER appointments_after_update_messages
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.tg_appointments_after_update_messages();
