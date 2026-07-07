DELETE FROM public.allowed_users WHERE lower(username) = 'magda';
INSERT INTO public.allowed_users (username, role) VALUES ('family1', 'family')
  ON CONFLICT ((lower(username))) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r public.app_role := public.role_for_email(NEW.email);
        dn text;
BEGIN
  IF r IS NOT NULL THEN
    IF lower(NEW.email) = 'family1@fizjoplan.local' THEN
      dn := 'Rodzina';
    ELSE
      dn := COALESCE(NULLIF(split_part(NEW.email,'@',1),''), 'user');
    END IF;
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (NEW.id, dn, r)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;