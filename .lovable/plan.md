# Przerwa w godzinach pracy i nowa reguła wolnych terminów

## 1. Baza (migracja wyłącznie dodająca)

Do `working_hours` dochodzą dwie opcjonalne kolumny: `break_start` i `break_end` (godzina). Jedna przerwa na dzień, domyślnie pusta. Żadnych zmian ani usunięć istniejących kolumn.

## 2. Ustawienia — sekcja „Godziny pracy”

- Przy każdym dniu dodatkowa para pól „Przerwa od–do” (nieaktywna, gdy dzień zamknięty), z możliwością wyczyszczenia (pusta = brak przerwy).
- Zapis natychmiastowy, jak przy pozostałych polach.
- Walidacja przed zapisem: przerwa musi mieścić się w godzinach pracy tego dnia i mieć koniec późniejszy niż początek; oba pola wypełnione albo oba puste. Przy błędzie krótki komunikat i brak zapisu.

## 3. Nowa reguła wolnych terminów (wspólna dla `/slots` i `/create`)

Dla każdego dnia:

- Punkty startowe: godzina otwarcia, koniec przerwy (jeśli ustawiona), koniec każdej wizyty i wydarzenia rodzinnego o statusie „zaplanowane”.
- Od każdego punktu kandydaci: sam punkt, punkt +40 min, dalej co 60 minut (+60, +120, +180 …) aż do końca godzin pracy.
- Termin dostępny, gdy cały czas trwania usługi mieści się: przed kolejnym zajętym blokiem, przed początkiem przerwy (jeśli start jest przed przerwą) i przed końcem godzin pracy.
- Kandydaci wypadający w przerwie są odrzucani; dni zamknięte i dni wolne z blokadą rezerwacji są pomijane.
- Zakres: od teraz + `booking_min_hours_ahead` do dziś + `booking_days_ahead`.
- Wynik bez duplikatów, posortowany rosnąco.

`/create` sprawdza dostępność tą samą funkcją, więc reguła jest identyczna po obu stronach.

## 4. Oś dnia

Godziny przerwy oznaczone subtelnym, przygaszonym pasem z etykietą „Przerwa”. Bez wpływu na klikanie luk — terapeuta nadal może dodać wpis w tych godzinach.

## Szczegóły techniczne

- Migracja: `ALTER TABLE public.working_hours ADD COLUMN break_start time, ADD COLUMN break_end time;`
- `src/lib/types.ts`: `WorkingHours` zyskuje `break_start: string | null`, `break_end: string | null`; `src/lib/store.ts` i `data-sync.tsx` przenoszą nowe pola (bez zmian w API akcji `updateWorkingHours`).
- `src/lib/booking.server.ts`: `slotsForDay(dayBlocks, openMin, closeMin, duration, breakStart?, breakEnd?)` — przepisana generacja kandydatów wg reguły wyżej; usunięcie dotychczasowego `EMPTY_DAY_WINDOW`. Przerwa traktowana jako dodatkowy blok przy sprawdzaniu kolizji.
- `src/routes/api/booking/slots.ts` i `create.ts`: dociągnięcie `break_start, break_end` w zapytaniu o `working_hours` i przekazanie do `slotsForDay`.
- `src/lib/working-hours.ts`: `getDayRange` zwraca dodatkowo `breakStartMin`/`breakEndMin` (null gdy brak).
- `src/components/day-timeline.tsx`: pas przerwy renderowany pod blokami wpisów (`pointer-events-none`, tokeny `bg-muted/60`, `text-muted-foreground`); logika luk i kolizji bez zmian.
- `src/routes/_layout.ustawienia.tsx`: dwa dodatkowe pola `type="time"` w wierszu dnia + walidacja przed wywołaniem `updateWorkingHours`.

Poza zakresem: endpointy kodu SMS, wygląd strony rezerwacji, pasek dostępności w formularzu (bez zmian poza tym, co wynika z `getDayRange`).
