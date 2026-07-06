## Naprawa uprawnień EXECUTE dla funkcji RLS

Jedna migracja naprawcza, bez zmian w politykach, tabelach ani froncie.

### SQL migracji

```sql
-- 1) EXECUTE na funkcjach używanych w politykach i triggerze auth
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_allowed_email(text) TO supabase_auth_admin;

-- 2) Uzupełnienie brakującego profilu dla istniejących kont z allowlisty
INSERT INTO public.profiles (user_id, display_name, role)
SELECT u.id, split_part(u.email, '@', 1), 'therapist'
FROM auth.users u
WHERE public.is_allowed_email(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
  );
```

### Zakres

- Bez zmian w tabelach, politykach RLS, triggerach ani kodzie frontendu.
- Backfill obejmie Twoje konto (dg.mobilfizjo@gmail.com) — dopisze wiersz w `profiles` z rolą `therapist`, jeśli jeszcze go nie ma.
