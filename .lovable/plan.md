## Konta po nazwach użytkowników + rola family (DB + ekran /auth)

Zakres: migracja bazy + minimalna zmiana w `src/routes/auth.tsx`. Pozostałe komponenty, nawigacja i ekrany bez zmian.

### 1) Tabela `allowed_users`

```sql
CREATE TABLE public.allowed_users (
  username text PRIMARY KEY,          -- therapist: pełny e-mail; family: sam login
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX allowed_users_username_lower_idx
  ON public.allowed_users (lower(username));

GRANT SELECT ON public.allowed_users TO supabase_auth_admin;
GRANT SELECT ON public.allowed_users TO authenticated;
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "therapist manage allowed_users"
  ON public.allowed_users FOR ALL
  USING (public.has_role(auth.uid(),'therapist'))
  WITH CHECK (public.has_role(auth.uid(),'therapist'));

INSERT INTO public.allowed_users (username, role) VALUES
  ('dg.mobilfizjo@gmail.com', 'therapist'),
  ('magda', 'family')
ON CONFLICT (username) DO NOTHING;
```

### 2) Funkcja dopasowująca (zastępuje `is_allowed_email`)

Akceptuje pełny e-mail lub `<username>@fizjoplan.local`.

```sql
CREATE OR REPLACE FUNCTION public.role_for_email(_email text)
RETURNS public.app_role
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE needle text := lower(coalesce(_email,'')); found public.app_role;
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
```

### 3) Trigger `handle_new_user` — rola z allowed_users

```sql
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
```

### 4) Utworzenie konta `magda` przez Auth Admin API

Bezpośredni INSERT do `auth.users` odpada (ryzyko rozjazdu z `auth.identities` i polami tokenów GoTrue). Robimy to jednorazowym server function z uprawnieniami service_role, chronionym rolą therapist:

**Nowy plik `src/lib/admin-seed.functions.ts`:**

```ts
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const seedFamilyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isTherapist } = await context.supabase
      .rpc('has_role', { _user_id: context.userId, _role: 'therapist' })
    if (!isTherapist) throw new Error('Forbidden')

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const email = 'magda@fizjoplan.local'
    const password = process.env.FAMILY_SEED_PASSWORD!

    const { data: list } = await supabaseAdmin.auth.admin.listUsers()
    if (list?.users.some(u => u.email?.toLowerCase() === email)) {
      return { status: 'exists' as const }
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (error) throw error
    return { status: 'created' as const }
  })
```

- Hasło startowe trzymamy w sekrecie `FAMILY_SEED_PASSWORD` (wygenerowany losowo, przekażę Ci jednorazowo w czacie po wdrożeniu).
- Wywołanie jednorazowe: dodam mały przycisk **tymczasowo** w Ustawieniach ("Utwórz konto family") widoczny tylko dla terapeuty — po użyciu można usunąć w kolejnym kroku. Jeśli wolisz bez UI, wywołam funkcję z konsoli DevTools (`useServerFn` też można obejść jednorazowym fetchem do `/api/...`). Powiedz, którą drogę preferujesz — inaczej domyślnie dodam przycisk w Ustawieniach.

Trigger `handle_new_user` sam założy profil z rolą `family` (bo `magda` jest w `allowed_users`).

### 5) RLS dla `family`

```sql
CREATE POLICY "family read family_event" ON public.appointments
  FOR SELECT USING (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family insert family_event" ON public.appointments
  FOR INSERT WITH CHECK (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family update family_event" ON public.appointments
  FOR UPDATE USING (public.has_role(auth.uid(),'family') AND type='family_event')
  WITH CHECK (public.has_role(auth.uid(),'family') AND type='family_event');
CREATE POLICY "family delete family_event" ON public.appointments
  FOR DELETE USING (public.has_role(auth.uid(),'family') AND type='family_event');
```

Pozostałe tabele (`patients`, `visit_notes`, `note_photos`, `messages_log`, `marketing_proposals`, `message_templates`, `visit_labels`, `app_settings`) — bez nowych polityk dla family; RLS odmówi. `profiles` już zezwala na SELECT własnego wiersza.

### 6) Funkcja `get_busy_blocks` (zamiast widoku)

```sql
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
```

Zwraca wyłącznie `starts_at`, `ends_at` — bez id, patient_id i innych kolumn.

### 7) Ekran `/auth` (jedyna zmiana we froncie w tym kroku)

W `src/routes/auth.tsx`:
- etykieta pola → „Nazwa użytkownika" (`type="text"`, `autocomplete="username"`),
- przed `signInWithPassword` mapowanie:
  `const email = raw.includes('@') ? raw.toLowerCase() : \`${raw.toLowerCase()}@fizjoplan.local\`;`
- reszta ekranu bez zmian; publiczna rejestracja pozostaje wyłączona.

### Jak przetestować przez API po wdrożeniu

Zaloguj się jako `magda` (hasło otrzymasz po wdrożeniu). Pobierz `access_token` z DevTools → Application → localStorage (`sb-…-auth-token`, pole `access_token`).

```bash
URL="https://<PROJECT>.supabase.co/rest/v1"
ANON="<VITE_SUPABASE_PUBLISHABLE_KEY>"
TOKEN="<access_token>"
H=(-H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
```

**(a) busy_blocks — RPC:**
```bash
curl -s -X POST "$URL/rpc/get_busy_blocks" "${H[@]}" -d '{
  "_from":"2026-07-01T00:00:00Z","_to":"2026-08-01T00:00:00Z"
}'
# oczekiwane: [{ "starts_at": "...", "ends_at": "..." }, ...]
```

**(b) family_event — SELECT + INSERT:**
```bash
curl -s "$URL/appointments?select=id,type&type=eq.family_event" "${H[@]}"

curl -s -X POST "$URL/appointments" "${H[@]}" -d '{
  "type":"family_event","status":"scheduled","title":"Test rodzinny",
  "starts_at":"2026-07-10T10:00:00Z","ends_at":"2026-07-10T11:00:00Z"
}'
# oczekiwane: 201 z utworzonym wierszem
```

**(c) odmowy:**
```bash
curl -si "$URL/patients?select=id&limit=1" "${H[@]}"
# oczekiwane: [] (RLS filtruje) lub 401/403

curl -si "$URL/appointments?select=id&type=eq.patient_visit&limit=1" "${H[@]}"
# oczekiwane: []

curl -si -X POST "$URL/appointments" "${H[@]}" -d '{
  "type":"patient_visit","status":"scheduled",
  "starts_at":"2026-07-10T12:00:00Z","ends_at":"2026-07-10T13:00:00Z"
}'
# oczekiwane: "new row violates row-level security policy"
```
