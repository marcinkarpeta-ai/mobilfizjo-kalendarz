## Cel

Dodać trzecią rolę `admin` (opiekun aplikacji): pełne uprawnienia w module sugestii (jak therapist), kalendarz jak family (wydarzenia rodzinne + anonimowe bloki "Zajęte"), zero dostępu do pacjentów, notatek, wiadomości i marketingu.

## Krok 1 — Migracja A: rozszerzenie enum `app_role`

Osobna migracja (Postgres wymaga, żeby nowa wartość enuma była commitowana przed jej użyciem):

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
```

Nic więcej w tej migracji.

## Krok 2 — Migracja B: użycie wartości `admin`

- Dodać wpis do `allowed_users`: `username='marcin'`, `role='admin'`.
- Rozszerzyć `public.get_busy_blocks`: zmienić warunek roli z `therapist OR family` na `therapist OR family OR admin`.
- Rozszerzyć wszystkie polityki RLS, które obecnie sprawdzają `has_role(auth.uid(),'therapist')`, o `OR has_role(auth.uid(),'admin')`, na tabelach:
  - `public.feedback` (SELECT/UPDATE therapist → therapist OR admin; INSERT bez zmian bo dotyczy właściciela)
  - `public.feedback_comments` (SELECT/INSERT tam, gdzie therapist widzi wszystkie wątki)
  - `public.feedback_reads` (analogicznie)
  - polityki `storage.objects` dla bucketa `feedback-photos` gdzie występuje `has_role(...,'therapist')`
- Nie dotykamy polityk `patients`, `visit_notes`, `note_photos`, `messages_log`, `marketing_proposals`, `appointments` (admin nie ma tam dostępu — brak polityki = brak dostępu, RLS domyślnie odrzuca).

## Krok 3 — Konto Auth (server function)

Rozbudowa `src/lib/admin-seed.functions.ts` (albo dodanie równoległej funkcji `seedAdminAccount`) wzorowanej na `seedFamilyAccount`:

- Wymaga zalogowanego `therapist`.
- Czyta `process.env.ADMIN_SEED_PASSWORD` (sekret już istnieje w projekcie).
- `email='marcin@fizjoplan.local'`, `email_confirm: true`; jeśli konto istnieje — reset hasła.
- Upsert `profiles`: `display_name='Marcin — opiekun aplikacji'`, `role='admin'`.
- Wywołanie z Ustawień (pod istniejącym przyciskiem seed rodziny dokładam drugi przycisk „Utwórz/odśwież konto admin").

Uwaga: trigger `handle_new_user` używa `role_for_email` z `allowed_users`, więc gdyby user został utworzony przez signup, profil powstałby automatycznie — ale seed i tak wykonuje explicit upsert (jak przy family).

## Krok 4 — Frontend: typy i checki roli

- `src/lib/types.ts`: `export type UserRole = "therapist" | "family" | "admin";` (typy Supabase w `integrations/supabase/types.ts` zregenerują się po migracji A).
- Wprowadzam dwa helpery w `src/lib/store.ts` (lub `src/lib/roles.ts`):
  - `isRestrictedCalendarRole(role)` = `role === 'family' || role === 'admin'` — używany wszędzie tam, gdzie dziś jest `role === 'family'`.
  - `canManageFeedback(role)` = `role === 'therapist' || role === 'admin'` — używany wszędzie tam, gdzie dziś jest `role === 'therapist'` w kontekście sugestii.
- Zamiana wystąpień:
  - `src/hooks/use-busy-blocks.ts` linia 21: `role !== 'family'` → `!isRestrictedCalendarRole(role)`.
  - `src/routes/_layout.kalendarz.tsx`, `src/routes/_layout.index.tsx`, `src/components/appointment-details-sheet.tsx`, `src/components/bottom-nav.tsx` — `isFamily`/filtr tabów → `isRestrictedCalendarRole`.
  - `src/routes/_layout.pacjenci.tsx`, `src/routes/_layout.wiadomosci.tsx`: `profile.role === 'family'` → `isRestrictedCalendarRole(profile.role)` (redirect na `/`), żeby admin też nie miał wstępu.
  - `src/routes/_layout.ustawienia.tsx` — sekcja ograniczona do therapist; sekcja „Sugestie" dostępna dla wszystkich zostaje; ukrywam admin panele terapeuty (import CSV, seed rodziny, seed admin — widoczne dla therapist).
  - `src/routes/_layout.pacjenci.index.tsx` linia 95: bez zmian (dotyczy tylko terapeuty).
  - `src/routes/_layout.ustawienia.sugestie.$id.tsx`: `role === 'therapist'` (canComment, dropdown statusu) → `canManageFeedback(role)`.
  - `src/components/feedback-threads-list.tsx` linia 178 (widok autora) → `canManageFeedback(role)`. Zapytania listy dla admina używają tego samego kodu co dla terapeuty (pobierają wszystkie wątki) — RLS na to pozwala po Kroku 2.

## Krok 5 — Weryfikacja

- Logowanie jako `marcin` — widoczne wyłącznie: Dzisiaj, Kalendarz, Ustawienia; „+" tylko wydarzenie rodzinne; bloki cudzych wizyt anonimowe.
- Bezpośrednie wejście na `/pacjenci` i `/wiadomosci` → redirect na `/`.
- Sugestie: admin widzi wszystkie wątki, komentuje pod każdym, zmienia status.
- Baza: `SELECT * FROM patients` jako admin przez PostgREST → pusto (brak polityki).

## Poza zakresem

- Powiadomienia.
- Modyfikacje uprawnień therapist/family (poza dopisaniem `OR admin`).
- Nowe UI dla admina poza istniejącym modułem sugestii.
