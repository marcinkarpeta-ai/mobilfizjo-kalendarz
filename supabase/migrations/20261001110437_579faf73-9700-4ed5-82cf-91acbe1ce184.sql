INSERT INTO public.message_templates(kind, body)
SELECT 'reschedule', '{{salutation}}, zmiana terminu- zapraszam {{date}} o {{time}}.'
WHERE NOT EXISTS (SELECT 1 FROM public.message_templates WHERE kind = 'reschedule');

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
      WHERE appointment_id = NEW.id AND status = 'pending' AND kind = 'reminder_24h'
        AND NEW.starts_at - interval '24 hours' > now_ts;

    UPDATE public.messages_log
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id AND status = 'pending' AND kind = 'reminder_24h'
        AND NEW.starts_at - interval '24 hours' <= now_ts;

    UPDATE public.messages_log
      SET scheduled_at = NEW.starts_at - interval '2 hours',
          body = public.render_message_body('reminder_2h', NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id AND status = 'pending' AND kind = 'reminder_2h'
        AND NEW.starts_at - interval '2 hours' > now_ts;

    UPDATE public.messages_log
      SET status = 'cancelled'
      WHERE appointment_id = NEW.id AND status = 'pending' AND kind = 'reminder_2h'
        AND NEW.starts_at - interval '2 hours' <= now_ts;

    UPDATE public.messages_log
      SET body = public.render_message_body(kind, NEW.patient_id, NEW.starts_at)
      WHERE appointment_id = NEW.id AND status = 'pending'
        AND kind IN ('confirmation', 'confirmation_first');

    IF has_consent AND NOT EXISTS (
      SELECT 1 FROM public.messages_log
      WHERE appointment_id = NEW.id AND status = 'pending'
        AND kind IN ('confirmation', 'confirmation_first')
    ) THEN
      INSERT INTO public.messages_log(appointment_id, patient_id, kind, status, body, scheduled_at)
      VALUES (NEW.id, NEW.patient_id, 'reschedule', 'pending',
              public.render_message_body('reschedule', NEW.patient_id, NEW.starts_at),
              now_ts);
    END IF;
  END IF;

  RETURN NEW;
END $function$;