## Zmiana loginu konta rodzinnego: magda → family1

### 1) Migracja SQL

- `DELETE FROM public.allowed_users WHERE lower(username) = 'magda';`
- `INSERT INTO public.allowed_users (username, role) VALUES ('family1', 'family') ON CONFLICT DO NOTHING;`
- Nadpisz `public.handle_new_user()` tak, aby dla e-maila `family1@fizjoplan.local` ustawiał `display_name = 'Rodzina'` (dla pozostałych: dotychczasowy `split_part(email,'@',1)`).

### 2) `src/lib/admin-seed.functions.ts`

- Zmień stałą `email` na `"family1@fizjoplan.local"`.
- Przed utworzeniem konta `family1`: znajdź w `listUsers()` konto `magda@fizjoplan.local`; jeśli istnieje:
  - `DELETE FROM public.profiles WHERE user_id = <id>` (przez `supabaseAdmin`),
  - `supabaseAdmin.auth.admin.deleteUser(<id>)`.
- Następnie stwórz `family1@fizjoplan.local` (jeśli jeszcze nie istnieje) z `email_confirm: true`; po utworzeniu upewnij się, że profil ma `display_name = 'Rodzina'` (upsert po `user_id`) — trigger również to zrobi, ale upsert zabezpiecza przypadek, gdy konto już istniało z innym display_name.
- Autoryzacja bez zmian: `requireSupabaseAuth` + sprawdzenie `has_role(...,'therapist')`.

### 3) `src/routes/_layout.ustawienia.tsx`

- Zaktualizuj tekst pomocniczy: „login `magda`" → „login `family1`". Bez zmian logiki.

### Poza zakresem

- Żadnych zmian w RLS, tabelach poza `allowed_users`, `get_busy_blocks`, `role_for_email`, `auth.tsx`, ani w komponentach UI poza jedną etykietą tekstową w Ustawieniach.

### Test po wdrożeniu

Ustawienia → „Utwórz konto rodzinne". Oczekiwane: ewentualne stare `magda@fizjoplan.local` zostaje usunięte, powstaje `family1@fizjoplan.local` z profilem `display_name = 'Rodzina'`, rola `family`. Login w `/auth`: `family1` + hasło z `FAMILY_SEED_PASSWORD`.
