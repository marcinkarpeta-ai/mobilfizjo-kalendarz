GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_allowed_email(text) TO supabase_auth_admin;

INSERT INTO public.profiles (user_id, display_name, role)
SELECT u.id, split_part(u.email, '@', 1), 'therapist'
FROM auth.users u
WHERE public.is_allowed_email(u.email)
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);