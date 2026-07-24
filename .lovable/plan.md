## Moduł "Sprawy" — wspólna lista zadań

### Baza (migracja)

Tabela `public.tasks`:
- `id uuid PK default gen_random_uuid()`
- `created_by uuid NOT NULL` (FK do `profiles.user_id`)
- `title text NOT NULL CHECK (btrim(title) <> '')`
- `note text`
- `due_date date`
- `status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done'))`
- `done_at timestamptz`
- `done_by uuid` (FK do `profiles.user_id`)
- `created_at timestamptz NOT NULL DEFAULT now()`

GRANT `SELECT, INSERT, UPDATE ON public.tasks TO authenticated`; `GRANT ALL ... TO service_role` (jak feedback, bez DELETE).

RLS (enable) — polityki dla użytkowników z rolą `therapist`, `family` lub `admin`:
- SELECT USING `has_role(auth.uid(),'therapist') OR has_role(auth.uid(),'family') OR has_role(auth.uid(),'admin')`
- INSERT WITH CHECK `created_by = auth.uid() AND (has_role... OR ...)`
- UPDATE USING (jak SELECT) WITH CHECK (jak SELECT)
- brak DELETE

Trigger `set_task_created_by` (BEFORE INSERT) domyślnie wypełnia `created_by := auth.uid()` gdy NULL — analogicznie do `set_appointment_created_by`.

Indeksy: `(status, due_date)` dla list.

### Frontend

**`src/lib/types.ts`** — dodać typ `Task`.

**`src/lib/tasks-store.ts`** (nowy, poza głównym `useStore` aby nie mieszać kontraktu) — Zustand store z:
- `tasks: Task[]`, `loaded: boolean`
- `loadTasks()` (fetch), `addTask({title, note?, due_date?})`, `completeTask(id)`, `reopenTask(id)`, `updateTask(id, patch)`
- Optymistyczne aktualizacje + toast na błąd (wzorzec z `store.ts`).
- Ładowanie: przy wejściu na `/sprawy` i przy montowaniu sekcji na `Dzisiaj` (brak realtime — wystarczy odświeżenie przy wejściu).

**`src/components/today-tasks-section.tsx`** (nowy) — sekcja "Sprawy" pod planem dnia na ekranie Dzisiaj:
- Filtr: `status='open' AND (due_date IS NULL OR due_date <= today)`.
- Sort: zaległe (due_date < dziś) → dzisiejsze → bez terminu; wewnątrz grup po `created_at`.
- Pozycja: checkbox (Radix Checkbox → `completeTask`), tytuł, autor (`display_name` z `profiles` — dołączyć do query), termin. Zaległe: czerwonawy dopisek "zaległe od DD.MM" (`text-destructive`).
- Ukrywana gdy lista pusta.
- Stopka: `<Link to="/sprawy">Wszystkie sprawy →</Link>`.

Wstawić w `src/routes/_layout.index.tsx` pod `<section aria-labelledby="today-list">`.

**`src/routes/_layout.sprawy_.index.tsx`** — nowa trasa `/sprawy`, odczepiona od rodzica przez sufiks `_` (jak `_layout.ustawienia_.sugestie.$id.tsx`). Dostępna dla wszystkich zalogowanych ról (już opakowane w `_authenticated` przez `_layout`).
- `AppHeader` z tytułem "Sprawy" i `feedbackScreen="Sprawy"`.
- Formularz dodawania u góry (Input tytuł, Textarea notatka, Input type=date) + przycisk "Dodaj".
- Lista otwartych: sekcje "Zaległe" / "Dziś" / "Bez terminu" / "Nadchodzące" (z widoczną datą). Każda pozycja klikalna → otwiera dolny arkusz edycji.
- Dolna zwinięta sekcja "Wykonane (30 dni)": Collapsible z listą (data wykonania, `display_name` odhaczającego, akcja "Przywróć" → `reopenTask`).
- Pobiera `tasks` przy mount (`loadTasks`).

**`src/components/task-edit-sheet.tsx`** (nowy) — dolny arkusz (`Sheet`) z polami tytuł/notatka/termin, przyciskiem Zapisz. Dostępny dla każdej roli.

**Ikona wejścia do /sprawy w nagłówku Dzisiaj** — dla wszystkich ról (stałe wejście, niezależne od zawartości sekcji):
- W `_layout.index.tsx` przekazać do `AppHeader` prop `right={<Button asChild variant="ghost" size="icon" aria-label="Sprawy"><Link to="/sprawy"><ListTodo/></Link></Button>}`. Ikona `ListTodo` z lucide, renderowana przed ikoną sugestii.

### Poza zakresem
Powiadomienia, powtarzalność, kategorie, osobne listy, załączniki, realtime, DELETE.

### Kolejność wykonania
1. Migracja (tabela + RLS + trigger + grants).
2. Regeneracja typów Supabase, potem `src/lib/types.ts` + `tasks-store.ts`.
3. Trasa `/sprawy` + arkusz edycji.
4. Sekcja "Sprawy" i ikona nagłówka na Dzisiaj.
