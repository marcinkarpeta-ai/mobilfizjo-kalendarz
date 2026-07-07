## Cel

Frontend świadomy roli (`profiles.role`: `therapist` / `family`) — bez zmian w RLS ani w bazie.

## 1. Rola w store i layoucie

- Rozszerzyć `useStore` o `role: UserRole | null` (i pomocniczo `userId: string | null`) plus setter `_setAuth`.
- `_layout.tsx` po pobraniu profilu wywołuje `_setAuth({ userId, role: profile.role })`. Bez profilu — sign out (obecne zachowanie).
- Wygodny hook `useRole()` → `useStore(s => s.role)`.

## 2. Bloki „Zajęte" dla family

Nowy hook `useBusyBlocks(fromISO, toISO)`:
- Zwraca `[]` dla roli `therapist`.
- Dla `family` wywołuje `supabase.rpc("get_busy_blocks", { _from, _to })`, cache prosto w `useState` + revalidacja przy zmianie zakresu.
- Nic nie loguje przy błędzie sieci (toast raz).

Zwracany typ: `{ starts_at: string; ends_at: string }[]`. Bloki traktowane jak „wirtualne" wpisy, wyłącznie do renderu i do wyznaczania luk.

## 3. `Dzisiaj` (`_layout.index.tsx`)

- Dla `family`:
  - `nextUp` liczone tylko z wydarzeń rodzinnych + z bloków „Zajęte" (najbliższy blok jako karta z tytułem „Zajęte", bez linku).
  - Lista dnia = wydarzenia rodzinne (pełne) + bloki „Zajęte" (nowa karta), posortowane po `starts_at`. Wpisy pacjentów całkowicie pomijane.
- Nowy komponent `BusyBlockCard` — szary pasek akcentu (`bg-muted`), tytuł „Zajęte", tylko godzina, `<article>` bez `<Link>`.

## 4. `Kalendarz` (`_layout.kalendarz.tsx`)

- Zakres pobieranych bloków = początek widocznej siatki miesiąca do końca (`days[0]` … `days[last]`).
- Dla `family`:
  - Kropki w komórkach dnia: kropka „patient_visit" (primary) zastąpiona szarą kropką „busy" (`bg-muted-foreground/60`), gdy dzień ma jakiś blok „Zajęte". Kropka `family` bez zmian.
  - `DayTimeline` dostaje nowy prop `busyBlocks: {starts_at, ends_at}[]` i renderuje je jako nieklikalne szare bloki z etykietą „Zajęte" (bez patient/label).
  - `computeGaps` w `day-timeline.tsx` liczy busy jako sumę: `appointments (family_event)` ∪ `busyBlocks`.
  - Przycisk „+" i klikanie luki: otwiera `AddAppointmentDialog` z `mode="family_only"` (patrz §5).

## 5. `AddAppointmentDialog` — tryb family

Nowy prop `mode?: "full" | "family_only"` (default `full`). Dla `family_only`:
- Ukryte `TabsList` (typ na sztywno `family_event`), ukryte pola `patient_id` / `visit_label_id` / ostrzeżenia zgód.
- Widoczne: data, godziny, tytuł, pasek dostępności.
- Zapis: `type: "family_event"`, `title` domyślnie „Wydarzenie rodzinne".

`AvailabilityStrip` dostaje nowy prop `extraBusy?: {starts_at, ends_at}[]`. `computeGaps` wewnątrz stripa dorzuca je do listy „active" przed sortowaniem. Wywołujące ekrany przekazują pobrane `busyBlocks` z zakresu dnia formularza (fetch przy zmianie `date`).

## 6. Trasy bronione dla family

W `_layout.pacjenci.tsx` i `_layout.wiadomosci.tsx` dodać `beforeLoad`: jeśli rola z `profiles` = `family`, `throw redirect({ to: "/" })`. `beforeLoad` musi ponownie pobrać profil (jedno lekkie `select("role").eq("user_id", user.id).maybeSingle()`).

## 7. Dolna nawigacja

`bottom-nav.tsx` używa `useRole()`. Dla `family` filtruje `tabs` do: `Dzisiaj`, `Kalendarz`, `Ustawienia`. Dla `therapist` — bez zmian.

## 8. Ustawienia dla family

`_layout.ustawienia.tsx`: gdy rola = `family`, renderujemy skrócony widok:
- Sekcja „Profil": jedno pole `display_name` (z `profiles.display_name`) + „Zapisz" → `supabase.from("profiles").update({ display_name }).eq("user_id", userId)`.
- Sekcja „Konto": „Wyloguj się".
- `PoweredByFooter` renderowany na dole tak samo jak w widoku therapist (ostatni element w `PageContainer`, po sekcji „Konto").
- Reszta (etykiety, szablony, konto rodzinne, O aplikacji, therapist_name/clinic_name) — ukryta.

## 9. Therapist: wizualne odróżnienie wydarzeń rodzinnych

- W `DayTimeline` i `AppointmentCard` dla `family_event` dodatkowo delikatne tło `bg-accent/10` całego bloku oraz mały badge „Rodzina" w prawym górnym rogu (`Badge variant="outline"`), tylko gdy `!familyView`.
- Bez zmian w logice; wyłącznie klasy Tailwind + jeden `<Badge>`.

## Zakres poza planem

- Bez migracji, bez zmian RLS, bez zmian w `admin-seed.functions.ts`.
- Bez realtime dla `get_busy_blocks` (revalidacja przy zmianie zakresu widoku i po dodaniu wpisu przez family).

## Sekcja techniczna

- Nowe pliki: `src/hooks/use-busy-blocks.ts`, `src/components/busy-block-card.tsx`.
- Modyfikacje: `src/lib/store.ts`, `src/routes/_layout.tsx`, `src/routes/_layout.index.tsx`, `src/routes/_layout.kalendarz.tsx`, `src/routes/_layout.pacjenci.tsx`, `src/routes/_layout.wiadomosci.tsx`, `src/routes/_layout.ustawienia.tsx`, `src/components/bottom-nav.tsx`, `src/components/day-timeline.tsx`, `src/components/availability-strip.tsx`, `src/components/add-appointment-dialog.tsx`, `src/components/appointment-card.tsx`.
- `get_busy_blocks` jest w wygenerowanych typach: `supabase.rpc("get_busy_blocks", { _from, _to })` → `{starts_at, ends_at}[]`.
- Zakres busy dla `Dzisiaj`: `[startOfDay, endOfDay]`; dla `Kalendarza`: `[days[0], addDays(days[last], 1)]`; dla `AvailabilityStrip`: `[startOfDay(date), endOfDay(date)]`.
