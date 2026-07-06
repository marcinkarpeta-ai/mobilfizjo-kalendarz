# Plan: Podłączenie Supabase (krok A)

## Zakres
- Włączenie Lovable Cloud (Supabase, region UE).
- Schemat DB zgodny z `src/lib/types.ts` + korekty typów.
- Auth e-mail+hasło; `/auth` podłączone do prawdziwego logowania.
- Allowlist e-maili terapeuty: konta spoza listy nie dostają profilu.
- RLS oparte na `has_role('therapist')` — brak profilu ⇒ brak dostępu przez API.
- `appointments.created_by` uzupełniane automatycznie triggerem.
- Zamiana zustand+localStorage na Supabase, **API `useStore` bez zmian**.
- Seed: etykiety zabiegów + szablony wiadomości. Bez mocków pacjentów/wizyt.
- Zero zmian wizualnych.

## Poza zakresem (krok B)
Rola `family` i jej polityki, notatki UI, zdjęcia, SMS, webhooki.

---

## 1. Korekty typów (`src/lib/types.ts`)
- `MessageKind` → dodać `"reminder_2h"`.
- Placeholdery szablonów: `{{salutation}}`, `{{date}}`, `{{time}}`, `{{ics_link}}`.
- `Appointment` → dodać `created_by?: string`.

## 2. Schemat DB (migracja SQL)

### 2.1 Enum ról (przygotowanie pod krok B)
- `CREATE TYPE public.app_role AS ENUM ('therapist','family');`
- (Alternatywnie `text` + CHECK; wybieram enum — spójne z knowledge o user_roles.)

### 2.2 Tabele w `public`
Każda z `GRANT` (patrz §2.5) i `ENABLE ROW LEVEL SECURITY`.

- `profiles` — `user_id uuid PK REFERENCES auth.users ON DELETE CASCADE`, `display_name text`, `role app_role NOT NULL DEFAULT 'therapist'`, `created_at timestamptz default now()`.
- `patients` — 1:1 z `Patient` (`id uuid PK default gen_random_uuid()`, `first_name`, `last_name`, `salutation`, `phone text UNIQUE NOT NULL`, `birth_date date`, `service_consent_at`, `service_consent_changed_at`, `marketing_consent_at`, `marketing_consent_changed_at`, `general_note`, `archived_at`, `created_at`).
- `visit_labels` — `id`, `name`.
- `appointments` — `id`, `type`, `starts_at`, `ends_at`, `status`, `patient_id fk`, `visit_label_id fk`, `title`, `notes`, **`created_by uuid REFERENCES public.profiles(user_id)`**, `created_at`.
- `visit_notes`, `note_photos`, `messages_log`, `marketing_proposals`, `message_templates` (`kind` UNIQUE), `app_settings` (singleton + kolumna `allowed_emails text[]`).

Indexy: `appointments(starts_at)`, `appointments(patient_id)`, `messages_log(patient_id)`, `visit_notes(patient_id)`.

### 2.3 Funkcje SECURITY DEFINER (`SET search_path = public`)
- `public.has_role(_user_id uuid, _role app_role) RETURNS boolean` — czyta `profiles.role` (jedna rola per user w kroku A; docelowo tabela `user_roles` w kroku B, jeśli będzie potrzeba wielu ról; API funkcji zostaje).
- `public.is_allowed_email(_email text) RETURNS boolean` — case-insensitive, sprawdza:
  1. stałą listę zaszytą w migracji (fallback bootstrap), oraz
  2. `app_settings.allowed_emails` (jeśli wypełnione).
- `public.handle_new_user()` — trigger `AFTER INSERT ON auth.users`: jeżeli e-mail dozwolony, `INSERT INTO profiles (user_id, role) VALUES (NEW.id, 'therapist') ON CONFLICT DO NOTHING`. W przeciwnym razie no-op (brak profilu → RLS blokuje wszystko).
- `public.set_appointment_created_by()` — trigger `BEFORE INSERT ON appointments`: `NEW.created_by := COALESCE(NEW.created_by, auth.uid());`.

### 2.4 RLS — krok A (korekta wg prośby)

Wszystkie tabele danych: **jedna polityka FOR ALL**

```sql
CREATE POLICY "therapist_full_access"
ON public.<table>
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'therapist'))
WITH CHECK (public.has_role(auth.uid(), 'therapist'));
```

Dotyczy: `patients`, `visit_labels`, `appointments`, `visit_notes`, `note_photos`, `messages_log`, `marketing_proposals`, `message_templates`, `app_settings`.

`profiles` — polityki osobne:
- SELECT `TO authenticated USING (auth.uid() = user_id)` (własny profil; w kroku B rozszerzenie dla admina/rodziny).
- UPDATE `TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- INSERT: brak polityki dla `authenticated` — wpisy tworzy wyłącznie trigger `handle_new_user` (SECURITY DEFINER omija RLS). `service_role` może wstawiać dla operacji administracyjnych.

Efekt: konto zalogowane bez profilu (albo z rolą `family` w kroku B) nie odczyta ani nie zapisze niczego z tabel danych — nawet bez bramki w UI.

### 2.5 GRANTy (obowiązkowe dla PostgREST)
Dla każdej tabeli:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
```
**Bez** `GRANT ... TO anon` — wszystkie polityki są auth-only.

### 2.6 Triggery
- `on_auth_user_created` AFTER INSERT ON `auth.users` → `handle_new_user()`.
- `set_created_by_before_insert` BEFORE INSERT ON `public.appointments` → `set_appointment_created_by()`.

## 3. Seed (w migracji)
- `visit_labels`: Masaż leczniczy, Terapia manualna, Kinesiotaping, Rehabilitacja pourazowa, Konsultacja.
- `message_templates` (nowe placeholdery, w tym `reminder_2h`).
- `app_settings`: pojedynczy wiersz z domyślnymi wartościami + pusta `allowed_emails`.
- **Bez** seedu pacjentów/wizyt/notatek/messages/proposals.

## 4. Autentykacja i bramka
- Włączyć e-mail+hasło. W build mode zapytam o e-mail(e) terapeuty do allowlist (stała w `is_allowed_email`).
- Po utworzeniu konta terapeuty: wyłączyć publiczny signup przez `supabase--configure_auth` (jeśli dostępne). Awaryjnie ukryć zakładkę „Zarejestruj" w UI. Allowlist chroni bazę niezależnie.
- `src/routes/auth.tsx`: `supabase.auth.signInWithPassword` + tymczasowy signup do bootstrapowania.
- Managed `_authenticated/route.tsx` (ssr:false, redirect `/auth`). Przemianowanie plików `_layout.*` → `_authenticated.*` (URL bez zmian — pathless). Komponenty stron nietknięte.
- W `_authenticated` po zalogowaniu: pobierz `profiles` po `user_id`. Brak profilu ⇒ `signOut()` + toast „Konto bez uprawnień." + redirect `/auth`. To druga linia obrony obok RLS.
- Root `onAuthStateChange` → `router.invalidate()` + selektywne `queryClient.invalidateQueries()` (bez `SIGNED_OUT`).
- Sign-out w Ustawieniach (dyskretny przycisk).

## 5. Warstwa danych — zachowanie API `useStore`

Wybór: **zustand jako in-memory cache (bez `persist`), hydratowany z Supabase.**

- `src/lib/supabase-queries.ts` — `queryKeys` + `useQuery` per tabela + helpery mutacji.
- `src/components/data-sync.tsx` — montowany w `_authenticated/route.tsx`; odpala zapytania i zapisuje wyniki do zustand po każdej zmianie. Realtime na `patients`, `appointments`, `visit_labels`, `messages_log`, `marketing_proposals` → invaliduje odpowiednie query keys.
- `src/lib/store.ts` — przepisany:
  - Ten sam kształt (`useStore((s) => s.patients)` itd.).
  - Metody mutujące wywołują Supabase (helpery) i invalidują RQ; sygnatury bez zmian.
  - `addAppointment` **nie** przekazuje `created_by` (trigger).
  - `reset()` → no-op.
- Usunięcie `src/lib/mock-data.ts` i jego importów (seed jest w SQL).

## 6. Kolejność wykonania (build mode)
1. `supabase--enable` (UE).
2. Zapytanie o e-mail(e) terapeuty na allowlistę.
3. Migracja: enum, tabele, granty, RLS (`has_role('therapist')`), funkcje, triggery, indexy.
4. Insert: labels, templates, app_settings.
5. Edycja `src/lib/types.ts`.
6. Bootstrap konta terapeuty przez `/auth` signup → wyłączenie publicznego signup.
7. Przemianowanie tras + managed `_authenticated/route.tsx` z gate „no profile → signOut".
8. Przepisanie `/auth`.
9. `supabase-queries.ts`, `DataSync`, przepisany `store.ts`.
10. Usunięcie `mock-data.ts`.
11. Sign-out w Ustawieniach, root `onAuthStateChange`.
12. Weryfikacja: build; test logowania; test że drugie konto (spoza allowlist) po zalogowaniu jest wylogowywane i nic nie widzi; CRUD pacjenta; dodanie wizyty → `created_by = auth.uid()`.

## Ryzyka
- Krótkie okno otwartego signup podczas bootstrapu — allowlist + RLS `has_role('therapist')` zapobiegają odczytowi danych, nawet gdyby ktoś się zarejestrował.
- `has_role` czyta `profiles.role`; w kroku B, jeśli wprowadzimy wielorolowość, przeniesiemy źródło do `user_roles` zachowując sygnaturę funkcji.
- Managed `_authenticated` używa `ssr:false` — akceptowalne dla chronionych ekranów.
