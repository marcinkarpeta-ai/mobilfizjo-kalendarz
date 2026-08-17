INSERT INTO public.message_templates(kind, body)
SELECT 'confirmation_first'::message_kind,
       '{{salutation}}, potwierdzam wizytę {{date}} o {{time}}. Gabinet znajduje się przy ul. Przykładowej 1, Kraków.'
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE kind = 'confirmation_first');

CREATE OR REPLACE FUNCTION public.enqueue_visit_messages(_appointment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a record;
  p record;
  now_ts timestamptz := now();
  is_first boolean;
  conf_kind message_kind;
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

  is_first := NOT EXISTS (
    SELECT 1 FROM public.appointments o
    WHERE o.patient_id = a.patient_id
      AND o.id <> a.id
      AND o.type = 'patient_visit'
      AND o.status IN ('scheduled', 'completed')
  );
  conf_kind := CASE WHEN is_first THEN 'confirmation_first'::message_kind
                    ELSE 'confirmation'::message_kind END;

  -- confirmation
  INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
  VALUES (a.id, a.patient_id, conf_kind, 'pending',
          public.render_message_body(conf_kind, a.patient_id, a.starts_at),
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
END $function$;

CREATE OR REPLACE FUNCTION public.tg_appointments_after_update_messages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NEW.status = 'scheduled' AND NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
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

    UPDATE public.messages_log
      SET body = public.render_message_body(kind, NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id
        AND status = 'pending'
        AND kind IN ('confirmation', 'confirmation_first');
  END IF;

  RETURN NEW;
END $function$;