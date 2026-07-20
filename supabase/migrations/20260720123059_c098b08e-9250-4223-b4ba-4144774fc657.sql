
-- allowed_users: konto marcin (admin)
INSERT INTO public.allowed_users(username, role)
VALUES ('marcin', 'admin')
ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role;

-- Kalendarz: admin też widzi bloki zajętości (jak family)
CREATE OR REPLACE FUNCTION public.get_busy_blocks(_from timestamp with time zone, _to timestamp with time zone)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.starts_at, a.ends_at
  FROM public.appointments a
  WHERE a.type = 'patient_visit'
    AND a.status = 'scheduled'
    AND a.starts_at < _to
    AND a.ends_at   > _from
    AND (public.has_role(auth.uid(),'therapist')
         OR public.has_role(auth.uid(),'family')
         OR public.has_role(auth.uid(),'admin'))
$function$;

-- feedback: rozszerz polityki therapist o admin
DROP POLICY IF EXISTS feedback_select_therapist ON public.feedback;
CREATE POLICY feedback_select_therapist ON public.feedback
  FOR SELECT
  USING (public.has_role(auth.uid(),'therapist') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS feedback_update_therapist ON public.feedback;
CREATE POLICY feedback_update_therapist ON public.feedback
  FOR UPDATE
  USING (public.has_role(auth.uid(),'therapist') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'therapist') OR public.has_role(auth.uid(),'admin'));

-- feedback_comments: rozszerz warunki wątków dostępnych dla terapeuty
DROP POLICY IF EXISTS "Comments visible to feedback participants" ON public.feedback_comments;
CREATE POLICY "Comments visible to feedback participants" ON public.feedback_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_comments.feedback_id
        AND (
          f.created_by = auth.uid()
          OR public.has_role(auth.uid(),'therapist')
          OR public.has_role(auth.uid(),'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Comments insert by participants" ON public.feedback_comments;
CREATE POLICY "Comments insert by participants" ON public.feedback_comments
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.feedback f
      WHERE f.id = feedback_comments.feedback_id
        AND (
          f.created_by = auth.uid()
          OR public.has_role(auth.uid(),'therapist')
          OR public.has_role(auth.uid(),'admin')
        )
    )
  );

-- storage: bucket feedback-photos - therapist/admin widzi wszystkie zdjęcia
DROP POLICY IF EXISTS feedback_photos_select_therapist ON storage.objects;
CREATE POLICY feedback_photos_select_therapist ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'feedback-photos'
    AND (
      public.has_role(auth.uid(),'therapist')
      OR public.has_role(auth.uid(),'admin')
    )
  );
