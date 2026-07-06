
-- === ENUMS ===
CREATE TYPE public.app_role AS ENUM ('therapist','family');
CREATE TYPE public.appointment_type AS ENUM ('patient_visit','family_event');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','completed','cancelled');
CREATE TYPE public.message_kind AS ENUM (
  'reminder_24h','reminder_2h','confirmation','cancellation',
  'marketing_anniversary','marketing_birthday'
);
CREATE TYPE public.message_status AS ENUM ('pending','sent','failed');
CREATE TYPE public.marketing_reason AS ENUM ('anniversary','birthday');

-- === PROFILES ===
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role public.app_role NOT NULL DEFAULT 'therapist',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- INSERT: brak polityki dla authenticated — wpis tworzy trigger SECURITY DEFINER

-- === has_role (musi istnieć zanim tworzymy pozostałe policies) ===
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- === is_allowed_email (allowlist + fallback constant) ===
CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hardcoded text[] := ARRAY['dg.mobilfizjo@gmail.com'];
  extra text[];
  needle text := lower(coalesce(_email, ''));
BEGIN
  IF needle = '' THEN RETURN false; END IF;
  IF needle = ANY (SELECT lower(e) FROM unnest(hardcoded) e) THEN
    RETURN true;
  END IF;
  SELECT allowed_emails INTO extra FROM public.app_settings LIMIT 1;
  IF extra IS NOT NULL AND needle = ANY (SELECT lower(e) FROM unnest(extra) e) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- === PATIENTS ===
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  salutation text NOT NULL,
  phone text NOT NULL UNIQUE,
  birth_date date,
  service_consent_at timestamptz,
  service_consent_changed_at timestamptz,
  marketing_consent_at timestamptz,
  marketing_consent_changed_at timestamptz,
  general_note text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_therapist_all" ON public.patients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === VISIT LABELS ===
CREATE TABLE public.visit_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_labels TO authenticated;
GRANT ALL ON public.visit_labels TO service_role;
ALTER TABLE public.visit_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_labels_therapist_all" ON public.visit_labels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === APPOINTMENTS ===
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.appointment_type NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  visit_label_id uuid REFERENCES public.visit_labels(id) ON DELETE SET NULL,
  title text,
  notes text,
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_therapist_all" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));
CREATE INDEX appointments_starts_at_idx ON public.appointments(starts_at);
CREATE INDEX appointments_patient_id_idx ON public.appointments(patient_id);

-- === VISIT NOTES ===
CREATE TABLE public.visit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_notes TO authenticated;
GRANT ALL ON public.visit_notes TO service_role;
ALTER TABLE public.visit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_notes_therapist_all" ON public.visit_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));
CREATE INDEX visit_notes_patient_id_idx ON public.visit_notes(patient_id);

-- === NOTE PHOTOS ===
CREATE TABLE public.note_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.visit_notes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_photos TO authenticated;
GRANT ALL ON public.note_photos TO service_role;
ALTER TABLE public.note_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "note_photos_therapist_all" ON public.note_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === MESSAGES LOG ===
CREATE TABLE public.messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  kind public.message_kind NOT NULL,
  status public.message_status NOT NULL DEFAULT 'pending',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages_log TO authenticated;
GRANT ALL ON public.messages_log TO service_role;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_log_therapist_all" ON public.messages_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));
CREATE INDEX messages_log_patient_id_idx ON public.messages_log(patient_id);

-- === MARKETING PROPOSALS ===
CREATE TABLE public.marketing_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reason public.marketing_reason NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved boolean
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_proposals TO authenticated;
GRANT ALL ON public.marketing_proposals TO service_role;
ALTER TABLE public.marketing_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketing_proposals_therapist_all" ON public.marketing_proposals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === MESSAGE TEMPLATES ===
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.message_kind NOT NULL UNIQUE,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_templates_therapist_all" ON public.message_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === APP SETTINGS (singleton) ===
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_name text NOT NULL DEFAULT '',
  clinic_name text NOT NULL DEFAULT '',
  allowed_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_therapist_all" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

-- === TRIGGER: nowy użytkownik -> profil (jeśli e-mail dozwolony) ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_allowed_email(NEW.email) THEN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (NEW.id, split_part(NEW.email, '@', 1), 'therapist')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === TRIGGER: appointments.created_by <- auth.uid() ===
CREATE OR REPLACE FUNCTION public.set_appointment_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_appointments_created_by
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_appointment_created_by();

-- === TRIGGER: message_templates.updated_at ===
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- === SEED ===
INSERT INTO public.visit_labels (name) VALUES
  ('Masaż leczniczy'),
  ('Terapia manualna'),
  ('Kinesiotaping'),
  ('Rehabilitacja pourazowa'),
  ('Konsultacja');

INSERT INTO public.message_templates (kind, body) VALUES
  ('reminder_24h',          '{{salutation}}, przypominam o wizycie {{date}} o {{time}}. {{ics_link}}'),
  ('reminder_2h',           '{{salutation}}, przypominam — dziś o {{time}}.'),
  ('confirmation',          '{{salutation}}, potwierdzam wizytę {{date}} o {{time}}. {{ics_link}}'),
  ('cancellation',          '{{salutation}}, wizyta {{date}} o {{time}} została odwołana.'),
  ('marketing_anniversary', '{{salutation}}, mija rok od naszej pierwszej wizyty. Dziękuję za zaufanie!'),
  ('marketing_birthday',    '{{salutation}}, wszystkiego najlepszego z okazji urodzin!');

INSERT INTO public.app_settings (therapist_name, clinic_name)
  VALUES ('mgr Marek Fizjoterapeuta', 'Gabinet FizjoPlan');
