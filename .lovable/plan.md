## Cel
Rozbudować moduł sugestii w dwustronny wątek: komentarze pod zgłoszeniem, ekran „Sugestie" dostępny dla każdego zalogowanego, plakietka nieprzeczytanej aktywności (pomijająca aktywność własną).

## 1. Migracja bazy

**Tabela `public.feedback_comments`:**
- `id uuid PK default gen_random_uuid()`
- `feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE`
- `created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE`
- `body text NOT NULL CHECK (length(btrim(body)) > 0)`
- `created_at timestamptz NOT NULL DEFAULT now()`
- Indeks: `(feedback_id, created_at)`

GRANT: `SELECT, INSERT ON public.feedback_comments TO authenticated; GRANT ALL TO service_role;`

RLS + polityki:
- INSERT `WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id AND (f.created_by = auth.uid() OR public.has_role(auth.uid(),'therapist'))))`
- SELECT `USING (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id AND (f.created_by = auth.uid() OR public.has_role(auth.uid(),'therapist'))))`

Trigger `tg_feedback_comments_protect_immutable` BEFORE UPDATE OR DELETE → `RAISE EXCEPTION` (żadnych edycji ani kasowań komentarzy przez klienta).

**Tabela `public.feedback_reads`:**
- `feedback_id uuid REFERENCES public.feedback(id) ON DELETE CASCADE`
- `user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE`
- `read_at timestamptz NOT NULL DEFAULT now()`
- PK złożony `(feedback_id, user_id)`

GRANT: `SELECT, INSERT, UPDATE ON public.feedback_reads TO authenticated; GRANT ALL TO service_role;`

RLS + polityki (tylko własne wiersze):
- SELECT/INSERT/UPDATE `USING/WITH CHECK (user_id = auth.uid())`

## 2. Reguła „nowej aktywności"

Wątek liczy się jako mający nieprzeczytaną aktywność dla użytkownika `U`, gdy istnieje którekolwiek:
- `feedback.created_by <> U` AND (`read_at` NULL LUB `feedback.created_at > read_at`) — nowe cudze zgłoszenie (dotyczy therapist widzącego cudze);
- istnieje komentarz w wątku z `created_by <> U` AND (`read_at` NULL LUB `comment.created_at > read_at`) — cudzy nowy komentarz.

Aktywność własna (własne zgłoszenie, własne komentarze) NIE liczy się do „nowe".

Obliczenie po stronie klienta z pobranych: `feedback.created_by`, `feedback.created_at`, `feedback_reads.read_at`, oraz najświeższego cudzego komentarza `max(created_at) WHERE created_by <> U`. To ostatnie pobierzemy jednym dodatkowym zapytaniem: `select feedback_id, max(created_at) from feedback_comments where created_by <> U group by feedback_id` (grupowanie po stronie klienta z pobranej listy `(feedback_id, created_by, created_at)`, jeśli agregacja RPC niedostępna z klienta — prostsze: `select feedback_id, created_by, created_at from feedback_comments in (ids)` i redukcja w JS).

## 3. Zapisy `feedback_reads`

- Otwarcie wątku (mount widoku): `upsert({ feedback_id, user_id: U, read_at: now() }, { onConflict: 'feedback_id,user_id' })`.
- Po pomyślnym wysłaniu własnego komentarza: dokładnie ten sam upsert z `now()` — żeby własny wpis nie zostawał „nowszy" niż read_at.

## 4. Widok „Sugestie" w Ustawieniach (obie role)

Zastępujemy obecny `FeedbackList` (therapist-only) nowym `FeedbackThreadsList` widocznym też dla family. W sekcji „Sugestie":
- Nagłówek pozycji z plakietką liczby wątków z nieprzeczytaną aktywnością (badge liczbowy obok tytułu sekcji).
- Fetch:
  - `feedback` `select('id, screen, body, photo_path, status, created_at, created_by, profiles!feedback_created_by_fkey(display_name)')` `order('created_at', desc)` — RLS ograniczy family do własnych.
  - `feedback_reads` `select('feedback_id, read_at').eq('user_id', U)`.
  - `feedback_comments` `select('feedback_id, created_by, created_at').in('feedback_id', ids)` — do policzenia (a) licznika komentarzy per wątek, (b) najświeższego cudzego komentarza.
- Karta pozycji: data · ekran · autor (widoczny dla therapist) · pierwsze linie treści · plakietka statusu (Nowe zielona / Przejrzane niebieska / Zrobione szara) · licznik komentarzy (ikona `MessageSquare`) · kropka „nowe" wg reguły z pkt 2.
- Klik → `Link` do `/ustawienia/sugestie/$id`.

Zmiana statusu przenosi się z listy do widoku wątku (tylko therapist).

## 5. Widok wątku `src/routes/_layout.ustawienia.sugestie.$id.tsx`

Nowa trasa (flat dot-separated). `ssr: false` dziedziczone z `_layout`.
- Fetch: pojedyncze zgłoszenie (`select` jak wyżej + `profiles`), komentarze `feedback_comments` `select('id, body, created_at, created_by, profiles!feedback_comments_created_by_fkey(display_name)').eq('feedback_id', id).order('created_at')`, signed URL dla `photo_path` (60 s).
- Nagłówek: `AppHeader` „Sugestia" z przyciskiem powrotu do `/ustawienia`.
- Karta zgłoszenia: data, ekran, autor, treść (whitespace-pre-wrap), zdjęcie.
- Panel statusu — tylko therapist: `Select` (Nowe/Przejrzane/Zrobione) → `update feedback`.
- Chronologiczna lista komentarzy: bąbelki z `display_name`, datą `dd.MM.yyyy HH:mm`, własne wyrównane w prawo (inne tło).
- Pole „Dodaj komentarz" (Textarea + Wyślij) widoczne dla `feedback.created_by === U` LUB `role === 'therapist'`. Po insercie: dopisanie do lokalnej listy + upsert `feedback_reads` z `now()`.
- Mount: upsert `feedback_reads` z `now()`.

Realtime pominięte.

## 6. Poza zakresem
Powiadomienia push/e-mail, edycja i kasowanie komentarzy, załączniki w komentarzach, realtime, filtry/sortowanie poza domyślnym (najnowsze zgłoszenia u góry).

## Techniczne szczegóły

- Typy Supabase (`src/integrations/supabase/types.ts`) zregenerują się po migracji — kod frontu piszemy po migracji.
- Nawigacja: `<Link to="/ustawienia/sugestie/$id" params={{ id }}>` — flat routing.
- Kolizja z istniejącą trasą `/_layout/ustawienia`: dodanie `_layout.ustawienia.sugestie.$id.tsx` obok jest bezpieczne (TanStack file-based, brak layoutu potomnego).
- `FeedbackSheet` bez zmian.
