## Cel
Moduł sugestii rozwojowych: zgłaszanie pomysłów przez terapeutę i rodzinę (z opcjonalnym zdjęciem), plus prosty widok listy w Ustawieniach dla terapeuty.

## 1. Migracja bazy

Nowa tabela `public.feedback`:
- `id uuid PK default gen_random_uuid()`
- `created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE`
- `screen text NOT NULL`
- `body text NOT NULL CHECK (length(btrim(body)) > 0)`
- `photo_path text` (klucz w Storage; nullable)
- `status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','seen','done'))`
- `created_at timestamptz NOT NULL DEFAULT now()`

GRANT: `SELECT, INSERT, UPDATE ON public.feedback TO authenticated; GRANT ALL TO service_role;`

RLS ENABLE + polityki:
- INSERT: `authenticated`, `WITH CHECK (created_by = auth.uid())`
- SELECT own: `USING (created_by = auth.uid())`
- SELECT therapist: `USING (public.has_role(auth.uid(),'therapist'))`
- UPDATE therapist: `USING (public.has_role(auth.uid(),'therapist')) WITH CHECK (public.has_role(auth.uid(),'therapist'))`

Trigger BEFORE UPDATE (`public.tg_feedback_protect_immutable`, SECURITY DEFINER, `SET search_path = public`): blokuje zmianę `created_by`, `screen`, `body`, `photo_path`, `created_at` przez `RAISE EXCEPTION` — dopuszczalna jest wyłącznie zmiana `status` (walidacja wartości przez CHECK na kolumnie).

Storage: prywatny bucket `feedback-photos` (przez `supabase--storage_create_bucket`, `public=false`). Polityki na `storage.objects`:
- INSERT authenticated do własnego folderu (`bucket_id='feedback-photos' AND (storage.foldername(name))[1] = auth.uid()::text`)
- SELECT own analogicznie
- SELECT therapist: `bucket_id='feedback-photos' AND public.has_role(auth.uid(),'therapist')`

Ścieżka pliku: `{user_id}/{uuid}-{filename}`.

## 2. Komponent `src/components/feedback-sheet.tsx`

`Sheet` z shadcn (side="bottom"):
- Props: `open`, `onOpenChange`, `screen: string`.
- Pola: `Textarea` (placeholder „Co poprawić lub dodać?"), input `file` (accept `image/*`, `capture="environment"`), miniatura po wyborze, przycisk „Wyślij".
- Wysyłka:
  1. Jeśli plik: `supabase.storage.from('feedback-photos').upload(...)` do `${userId}/${crypto.randomUUID()}-${file.name}`.
  2. `supabase.from('feedback').insert({ created_by: userId, screen, body, photo_path })`.
  3. Toast „Dziękujemy! Sugestia zapisana.", reset, zamknięcie.
- Walidacja: body wymagane (trim), max ~2000 znaków; obraz max 5 MB.

## 3. Ikona w nagłówku

`src/components/app-header.tsx`: nowy opcjonalny prop `feedbackScreen?: string`. Gdy podany, po prawej (obok istniejącego `right`) `Button` ikonowy `MessageSquarePlus` otwierający `FeedbackSheet`. Stan `open` wewnątrz `AppHeader`.

Wywołania: dodać `feedbackScreen` w `_layout.index.tsx`, `_layout.kalendarz.tsx`, `_layout.pacjenci.index.tsx`, `_layout.pacjenci.$id.tsx`, `_layout.wiadomosci.tsx`, `_layout.ustawienia.tsx` (oba warianty).

## 4. Pozycja „Zgłoś sugestię" w Ustawieniach

Nowa sekcja w `SettingsPage` i `FamilySettings` — przycisk otwierający `FeedbackSheet` z `screen="Ustawienia"`.

## 5. Widok listy „Sugestie" (tylko terapeuta)

Nowa sekcja w `SettingsPage`, widoczna dla `role === 'therapist'`:
- Fetch: `supabase.from('feedback').select('*').order('created_at',{ascending:false})`.
- Karty: data (`dd.MM.yyyy HH:mm`), `screen`, `body` (whitespace-pre-wrap), miniatura (signed URL 60 s przez `storage.from('feedback-photos').createSignedUrl`), `Select` statusu (Nowe / Przejrzane / Zrobione).
- Zmiana statusu: `update({ status }).eq('id', id)` — trigger pilnuje niezmienności pozostałych pól.

## Poza zakresem
Powiadomienia, e-maile, edycja treści zgłoszenia, komentarze, filtry/sortowanie poza domyślnym.
