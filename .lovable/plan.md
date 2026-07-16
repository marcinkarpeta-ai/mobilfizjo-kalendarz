## Zakres

Odwołane wizyty znikają z osi dnia i z ekranu "Dzisiaj". Zostają widoczne wyłącznie w historii karty pacjenta (już oznaczone) plus nowy licznik statystyczny. Pasek dostępności, siatka miesiąca (kropki), reguły RLS i logika odwoływania — bez zmian.

## Zmiany

### 1. `src/components/day-timeline.tsx`
- Na wejściu odfiltrować `appointments` do `a.status !== "cancelled"` przed `layoutColumns` i `computeGaps`. Dzięki temu luki pod odwołaną wizytą są w pełni widoczne i klikalne jak każde inne.
- Usunąć gałąź renderującą wyblakłe bloki odwołane (pętla po `items` w `layoutColumns` dokładająca `cancelled` oraz cały path `cancelled` w JSX bloków). `BlockContent` traci nieużywaną prop `cancelled` — uprościć sygnaturę.
- Zwrócić dodatkowo listę odwołanych z dnia (osobny wynik hooka renderującego) — najprościej: `DayTimeline` przyjmuje pełną listę i wewnętrznie dzieli; renderuje pod osią sekcję "Odwołane" opisaną niżej.

### 2. Sekcja "Odwołane (N)" pod osią (w `DayTimeline`)
- Pokazywana tylko, gdy dzień zawiera odwołane wizyty (i nie w trybie `familyView`).
- Zwinięty przycisk `<button>` w stylu dyskretnej linii pod osią: "Odwołane (N)" + chevron; stan otwarcia lokalny (`useState`).
- Rozwinięta: `<ul>` pozycji `HH:MM–HH:MM · nazwisko/imię pacjenta` z klasą `line-through` i `text-muted-foreground`; każda pozycja to `<button>` który wywołuje istniejące `onSelectAppointment(appt)` (arkusz szczegółów już potrafi obsłużyć odwołane).
- Sortowanie chronologiczne.

### 3. `src/routes/_layout.index.tsx` (Dzisiaj)
- Dołożyć filtr `a.status !== "cancelled"` do `dayAppts`. To eliminuje odwołane z sekcji "Następna wizyta" i "Plan dnia". Ekran Dzisiaj nie dostaje sekcji "Odwołane (N)" — zgodnie z pytaniem nie ma tam osi dnia, tylko lista; historia jest w karcie pacjenta.

### 4. `src/routes/_layout.pacjenci.$id.tsx` — statystyki
- Nad `Tabs` (albo w zakładce "Dane" jako pierwszy blok) dodać sekcję statystyk. Minimalny wariant: jeden `DataRow` "Odwołane wizyty" z wartością `"{ogółem} ogółem / {12m} w 12 mies."`.
- Liczenie po pełnej `appointments` pacjenta:
  - `total = appointments.filter(a => a.status === "cancelled").length`
  - `last12 = appointments.filter(a => a.status === "cancelled" && parseISO(a.starts_at) >= subMonths(now, 12)).length`
- Jeżeli `total === 0`, i tak wyświetlamy wiersz z `"0 ogółem / 0 w 12 mies."` — spójność z innymi wierszami danych.

### 5. Weryfikacja historii w karcie pacjenta
- Historia sortowana `desc` w istniejącym kodzie (linie 80–82) — bez zmian.
- `AppointmentCard` już renderuje status odwołania widocznie (przekreślenie / plakietka). Zweryfikować i, gdyby oznaczenie było zbyt subtelne, dodać wyraźną plakietkę "Odwołana" (destructive) obok tytułu wizyty. Zmiana wyłącznie prezentacyjna w `src/components/appointment-card.tsx`, tylko jeśli obecny stan nie spełnia "wyraźnie".

## Poza zakresem
- Logika odwoływania (zapis, powiadomienia), SMS-y, siatka miesiąca (kropki w kalendarzu), RLS, `get_busy_blocks` (i tak pomija odwołane).
- Pasek dostępności w formularzu — bez zmian.
- Rola family — bloki "Zajęte" bez zmian (odwołane nie tworzą bloków).
