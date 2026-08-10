# Kalendarz pracy terapeuty

Godziny pracy i dni wolne stają się danymi w bazie, konfigurowanymi w Ustawieniach i używanymi przez oś dnia oraz pasek dostępności w formularzu wpisu.

## 1. Baza

Nowa tabela **working_hours**: dzień tygodnia (0-6), czy otwarte, godzina od, godzina do. Dokładnie siedem wierszy, wpisanych od razu w migracji: poniedziałek-piątek otwarte 07:00-20:00, sobota i niedziela zamknięte.

Nowa tabela **day_off**: data (unikalna), opcjonalny opis, znacznik "blokuje rezerwacje" (domyślnie tak).

Dostęp: terapeuta ma pełny dostęp (podgląd i zapis), administrator tylko podgląd. Rola „rodzina" nie ma dostępu do tych tabel — w jej widokach oś dnia użyje dotychczasowego zakresu 07:00-20:00 (bez oznaczeń dni wolnych).

## 2. Ustawienia terapeuty — sekcja „Godziny pracy"

- Siedem wierszy (Poniedziałek…Niedziela), każdy z przełącznikiem otwarte/zamknięte i dwoma polami czasu (od, do). Zmiana zapisuje się od razu; pola czasu nieaktywne, gdy dzień zamknięty.
- Podsekcja „Dni wolne": lista nadchodzących i przeszłych dat z opisem, przycisk dodawania (wybór daty + opcjonalny opis) i usuwanie pojedynczych pozycji.

Sekcja widoczna tylko dla terapeuty (spójnie z resztą ekranu Ustawień).

## 3. Oś dnia i pasek dostępności

- Zakres renderowanej osi pochodzi z godzin pracy dla dnia tygodnia wybranej daty, zamiast sztywnych 07:00-20:00. Jeśli w tym dniu istnieją wpisy poza godzinami pracy, zakres jest rozszerzany tak, by były widoczne.
- Dzień zamknięty (wg godzin pracy) lub oznaczony jako wolny: przygaszone tło osi + etykieta „Nieczynne" / „Dzień wolny" wraz z opisem, jeśli podany. Dla dnia zamkniętego bez wpisów oś pokazuje domyślny zakres 07:00-20:00 w wersji przygaszonej.
- Jeśli w dniu oznaczonym jako wolny są już wpisy w kalendarzu, przy etykiecie „Dzień wolny" pojawia się dopisek „(zaplanowane wizyty pozostają)" — oznaczenie niczego nie usuwa z grafiku.
- Terapeuta nadal może klikać luki, dodawać i edytować wpisy w takim dniu — oznaczenie jest wyłącznie informacyjne; blokada dotyczy przyszłego modułu rezerwacji online.
- Pasek dostępności w formularzu wpisu: ten sam zakres godzin i to samo oznaczenie dnia zamkniętego/wolnego.

## Szczegóły techniczne

- Migracja: `public.working_hours` (weekday smallint PK/unique, is_open boolean, start_time time, end_time time) + `public.day_off` (date unique, reason text, blocks_booking boolean default true), GRANT-y dla `authenticated`/`service_role`, RLS: ALL dla `has_role(auth.uid(),'therapist')`, SELECT dla `has_role(auth.uid(),'admin')`; seed siedmiu wierszy w tej samej migracji.
- `src/lib/types.ts`: typy `WorkingHours`, `DayOff`; `src/lib/store.ts`: stan + akcje `updateWorkingHours`, `addDayOff`, `removeDayOff` (optimistic, wzorem istniejących akcji); `src/components/data-sync.tsx`: dołączenie obu tabel do `loadAll` (błąd odczytu dla roli bez dostępu traktowany jako pusta lista).
- Nowy helper `src/lib/working-hours.ts`: `getDayRange(date, workingHours, daysOff, appointments)` zwracający `{ startMin, endMin, closed, dayOffReason }`.
- `src/components/day-timeline.tsx` i `src/components/availability-strip.tsx`: zamiana stałych `TIMELINE_START/END` oraz `START_MIN/END_MIN` na wartości z helpera; brak zmian w logice układu bloków, luk i kolizji.
- `src/routes/_layout.ustawienia.tsx`: nowa sekcja „Godziny pracy" z podsekcją „Dni wolne".

Poza zakresem: rezerwacje online, cennik, zgody.
