
-- feedback_comments
CREATE TABLE public.feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_comments_feedback_id_created_at_idx
  ON public.feedback_comments (feedback_id, created_at);

GRANT SELECT, INSERT ON public.feedback_comments TO authenticated;
GRANT ALL ON public.feedback_comments TO service_role;

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments visible to feedback participants"
  ON public.feedback_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_comments.feedback_id
        AND (f.created_by = auth.uid() OR public.has_role(auth.uid(), 'therapist'))
    )
  );

CREATE POLICY "Comments insert by participants"
  ON public.feedback_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_comments.feedback_id
        AND (f.created_by = auth.uid() OR public.has_role(auth.uid(), 'therapist'))
    )
  );

CREATE OR REPLACE FUNCTION public.tg_feedback_comments_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'feedback_comments are immutable';
END $$;

CREATE TRIGGER feedback_comments_no_update
  BEFORE UPDATE ON public.feedback_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_comments_protect_immutable();

CREATE TRIGGER feedback_comments_no_delete
  BEFORE DELETE ON public.feedback_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_comments_protect_immutable();

-- feedback_reads
CREATE TABLE public.feedback_reads (
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feedback_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.feedback_reads TO authenticated;
GRANT ALL ON public.feedback_reads TO service_role;

ALTER TABLE public.feedback_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own reads select"
  ON public.feedback_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Own reads insert"
  ON public.feedback_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own reads update"
  ON public.feedback_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
