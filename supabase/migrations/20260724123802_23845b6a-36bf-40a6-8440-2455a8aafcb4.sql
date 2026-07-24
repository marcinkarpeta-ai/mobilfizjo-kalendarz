
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (btrim(title) <> ''),
  note text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  done_at timestamptz,
  done_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(),'therapist')
    OR public.has_role(auth.uid(),'family')
    OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Roles can insert own tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(),'therapist')
      OR public.has_role(auth.uid(),'family')
      OR public.has_role(auth.uid(),'admin')
    )
  );

CREATE POLICY "Roles can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(),'therapist')
    OR public.has_role(auth.uid(),'family')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'therapist')
    OR public.has_role(auth.uid(),'family')
    OR public.has_role(auth.uid(),'admin')
  );

CREATE OR REPLACE FUNCTION public.set_task_created_by()
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

CREATE TRIGGER tg_tasks_set_created_by
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_created_by();

CREATE INDEX tasks_status_due_idx ON public.tasks(status, due_date);
CREATE INDEX tasks_done_at_idx ON public.tasks(done_at DESC);
