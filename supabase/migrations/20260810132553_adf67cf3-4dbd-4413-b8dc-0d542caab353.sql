CREATE TABLE public.working_hours (
  weekday smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_open boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '07:00',
  end_time time NOT NULL DEFAULT '20:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.working_hours TO authenticated;
GRANT ALL ON public.working_hours TO service_role;

ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY working_hours_therapist_all ON public.working_hours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'::app_role));

CREATE POLICY working_hours_admin_select ON public.working_hours
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_working_hours_updated_at
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.working_hours (weekday, is_open, start_time, end_time) VALUES
  (0, false, '07:00', '20:00'),
  (1, true,  '07:00', '20:00'),
  (2, true,  '07:00', '20:00'),
  (3, true,  '07:00', '20:00'),
  (4, true,  '07:00', '20:00'),
  (5, true,  '07:00', '20:00'),
  (6, false, '07:00', '20:00');

CREATE TABLE public.day_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  reason text,
  blocks_booking boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_off TO authenticated;
GRANT ALL ON public.day_off TO service_role;

ALTER TABLE public.day_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_off_therapist_all ON public.day_off
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'::app_role));

CREATE POLICY day_off_admin_select ON public.day_off
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_day_off_updated_at
  BEFORE UPDATE ON public.day_off
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();