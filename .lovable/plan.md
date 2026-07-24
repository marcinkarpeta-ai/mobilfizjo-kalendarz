Zakres: wyłącznie prezentacja. Bez zmian danych, RLS, store, typów, logiki statusów.

## 1. Nowe tokeny w `src/styles.css`

Dodać dwa semantyczne tokeny (light + dark) w `:root` i `.dark`, plus mapowanie w `@theme inline` żeby dostępne były klasy `bg-family` / `bg-family-bar`:

- `--family` — cieplejszy odcień akcentu o wyższym nasyceniu niż obecne `bg-accent/10` (dla tła kart wydarzeń rodzinnych; wciąż w obrębie palety Warm Sand, ale wyraźnie odróżnialny od `--card`).
- `--family-bar` — mocniejszy wariant do paska akcentu wydarzeń rodzinnych (zamiennik obecnego `bg-accent`).

W `@theme inline`: `--color-family: var(--family);` i `--color-family-bar: var(--family-bar);`.

## 2. `src/components/appointment-card.tsx` (ekran Dzisiaj)

- Tło kart rodzinnych: zamiast `bg-accent/10` użyć `bg-family` (tam gdzie nie odwołane).
- Pasek akcentu rodzinnego: zamiast `bg-accent` użyć `bg-family-bar`.
- Nowy hook `useNow()` (co 60s przez `setInterval`) — patrz sekcja 5.
- Wyliczyć `isPast = ends_at < now`, `isOngoing = starts_at <= now < ends_at` (tylko dla `status === "scheduled"`; nie dotyczy `cancelled`, które ma osobną prezentację).
- `isPast` → dołożyć `opacity-60` do `<article>` i przygasić pasek akcentu (np. `opacity-60` na pasku lub wariant `bg-primary/50` / `bg-family-bar/50`).
- `isOngoing` → subtelnie mocniejsza ramka: `border-primary/60` (rodzina: `border-[color:var(--family-bar)]/70`).
- Kliknięcie zachowane; badge „Rodzina" bez zmian.

## 3. `src/components/day-timeline.tsx` (oś dnia w Kalendarzu)

Ten sam zestaw zmian dla bloków `positioned`:
- Zamiana `bg-accent/10` → `bg-family` dla `isFamilyEvent`.
- Zamiana `bg-accent` → `bg-family-bar` w pasku akcentu wydarzeń rodzinnych.
- Wyliczenie `isPast` / `isOngoing` na podstawie `useNow()` i pól `appt.starts_at` / `ends_at`.
- `isPast`: `opacity-60` na `<article>` + przygaszony pasek.
- `isOngoing`: mocniejsza ramka (`border-primary/60` lub `border-[color:var(--family-bar)]/70`).
- Bloki pozostają klikalne; sekcja „Odwołane" bez zmian; busy-blocks bez zmian (to nie „wpisy zakończone").

## 4. `src/components/appointment-details-sheet.tsx` (nagłówek arkusza)

- Gdy `isFamilyEvent`, w `<SheetHeader>` dodać delikatne tło rodzinne: opakować tytuł+badge w kontener z `bg-family` i zaokrągleniem, żeby na pierwszy rzut oka pokazać typ wpisu. Reszta arkusza bez zmian. (Badge „Zakończona"/„Zaplanowana" pozostaje bez zmian — status arkusza już to komunikuje, wyszarzenie dotyczy kart na liście/osi.)

## 5. Nowy hook `src/hooks/use-now.ts`

```text
useNow(intervalMs = 60_000): Date
```
- `useState<Date>(() => new Date())`, `useEffect` z `setInterval` co 60 s (+ cleanup).
- Wywoływany w `AppointmentCard` i `DayTimeline` — powoduje re-render co minutę, więc próg `ends_at < now` przelicza się bez przeładowania strony.

## Rola family/admin
Renderują dokładnie te same komponenty (`AppointmentCard`, `DayTimeline`) — zmiany 2–3 obejmują je automatycznie. Zajęte anonimowe bloki (busy) nie mają statusu i pozostają nietknięte.

## Poza zakresem (nie ruszamy)
- Wizyty odwołane (mają własną prezentację i sekcję „Odwołane").
- `availability-strip.tsx`, „Wiadomości", „Sugestie", siatka miesiąca.
- Logika statusów (`completed` / `scheduled` w bazie) — wyszarzenie liczone czysto po czasie w UI.
