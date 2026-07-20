
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  screen text NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  photo_path text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','seen','done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "feedback_select_own"
  ON public.feedback FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "feedback_select_therapist"
  ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'));

CREATE POLICY "feedback_update_therapist"
  ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'therapist'))
  WITH CHECK (public.has_role(auth.uid(), 'therapist'));

CREATE OR REPLACE FUNCTION public.tg_feedback_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.screen IS DISTINCT FROM OLD.screen
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.photo_path IS DISTINCT FROM OLD.photo_path
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only status can be updated on feedback rows';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER feedback_protect_immutable
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_protect_immutable();

-- Storage policies for feedback-photos bucket
CREATE POLICY "feedback_photos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "feedback_photos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "feedback_photos_select_therapist"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-photos'
    AND public.has_role(auth.uid(), 'therapist')
  );
