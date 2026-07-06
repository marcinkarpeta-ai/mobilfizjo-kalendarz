
-- 1) allowed_users
CREATE TABLE IF NOT EXISTS public.allowed_users (
  username text PRIMARY KEY,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS allowed_users_username_lower_idx
  ON public.allowed_users (lower(username));

GRANT SELECT ON public.allowed_users TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_users TO authenticated;
GRANT ALL ON public.allowed_users TO service_role;

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "therapist manage allowed_users" ON public.allowed_users;
CREATE POLICY "therapist manage allowed_users"
  ON public.allowed_users FOR ALL
  USING (public.has_role(auth.uid(),'therapist'))
  WITH CHECK (public.has_role(auth.uid(),'therapist'));

INSERT INTO public.allowed_users (username, role) VALUES
  ('dg.mobilfizjo@gmail.com', 'therapist'),
  ('magda', 'family')
ON CONFLICT (username) DO NOTHING;

-- 2) role_for_email + is_allowed_email
CREATE OR REPLACE FUNCTION public.role_for_email(_email text)
RETURNS public.app_role
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE needle text := lower(coalesce(_email,''));
        found public.app_role;
BEGIN
  IF needle = '' THEN RETURN NULL; END IF;
  SELECT role INTO found FROM public.allowed_users
    WHERE lower(username) = needle LIMIT 1;
  IF found IS NOT NULL THEN RETURN found; END IF;
  IF needle LIKE '%@fizjoplan.local' THEN
    SELECT role INTO found FROM public.allowed_users
      WHERE lower(username) = split_part(needle,'@',1) LIMIT 1;
  END IF;
  RETURN found;
END $$;

CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.role_for_email(_email) IS NOT NULL $$;

GRANT EXECUTE ON FUNCTION public.role_for_email(text) TO supabase_auth_admin, authenticated;
GRANT EXECUTE ON FUNCTION public.is_allowed_email(text) TO supabase_auth_admin;

-- 3) handle_new_user — rola z allowed_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.app_role := public.role_for_email(NEW.email);
BEGIN
  IF r IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (NEW.id, COALESCE(NULLIF(split_part(NEW.email,'@',1),''), 'user'), r)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- 4) RLS dla family na appointments
DROP POLICY IF EXISTS "family read family_event" ON public.appointments;
DROP POLICY IF EXISTS "family insert family_event" ON public.appointments;
DROP POLICY IF EXISTS "family update family_event" ON public.appointments;
DROP POLICY IF EXISTS "family delete family_event" ON public.appointments;

CREATE POLICY "family read family_event" ON public.appointments
  FOR SELECT USING (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family insert family_event" ON public.appointments
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family update family_event" ON public.appointments
  FOR UPDATE USING (public.has_role(auth.uid(),'family') AND type='family_event')
  WITH CHECK (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family delete family_event" ON public.appointments
  FOR DELETE USING (public.has_role(auth.uid(),'family') AND type='family_event');

-- 5) get_busy_blocks
CREATE OR REPLACE FUNCTION public.get_busy_blocks(
  _from timestamptz, _to timestamptz
) RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.starts_at, a.ends_at
  FROM public.appointments a
  WHERE a.type = 'patient_visit'
    AND a.status = 'scheduled'
    AND a.starts_at < _to
    AND a.ends_at   > _from
    AND (public.has_role(auth.uid(),'therapist')
         OR public.has_role(auth.uid(),'family'))
$$;

GRANT EXECUTE ON FUNCTION public.get_busy_blocks(timestamptz, timestamptz) TO authenticated;
