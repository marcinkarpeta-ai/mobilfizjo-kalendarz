
# Widok dnia jako pionowa oś czasu (Kalendarz)

## Zakres
Zmieniamy wyłącznie sekcję "dzień" pod gridem miesiąca w `src/routes/_layout.kalendarz.tsx`. Grid miesiąca, dolna nawigacja i ekran Dzisiaj pozostają bez zmian.

## Zachowanie

- Oś od **07:00 do 20:00** (14 godzin), linie separujące co godzinę, etykiety godzin po lewej (kolumna ~44 px).
- Skala: **1 minuta = 1 px** → oś ma stałą wysokość 840 px. Prosta, przewidywalna, wystarczająco czytelna na 390 px szerokości.
- Wpisy renderowane jako bloki pozycjonowane absolutnie wewnątrz kontenera osi:
  - `top = (startMin - 420)`, `height = max(24, duration)` px (min. 24 px żeby krótkie bloki były klikalne).
  - Wpisy przycięte do zakresu 07:00–20:00 (jeśli wystają, przycinamy z ostrzeżeniem wizualnym: zaokrąglony brzeg tylko od strony wewnątrz zakresu).
- **Luki (wolne sloty)** liczone z wpisów **nieodwołanych** posortowanych po `starts_at`, w zakresie 07:00–20:00, z uwzględnieniem brzegów dnia.
  - Luki > 30 min dostają subtelną etykietę `Wolne HH:MM–HH:MM` (mały, `text-muted-foreground`, wyśrodkowaną).
  - Cały obszar luki (także < 30 min) jest klikalny (`button` przezroczysty) i otwiera `AddAppointmentDialog` z `defaultDate` i **wstępnie ustawionymi godzinami** luki.
- **Wizyty odwołane**: renderowane wyblakłe (`opacity-40`, przekreślony tekst godziny), **nie liczą się do zajętości** — luka „przechodzi" pod nimi. Wizyta odwołana leży wtedy nad luką (z-index wyższy niż przycisk luki, `pointer-events-none` na wnętrzu, żeby kliknięcie w wolny obszar wciąż otwierało formularz; sama karta ma osobny `pointer-events-auto` tylko na treści dla ewentualnego linku).
- **Nakładające się wpisy** (np. rodzinne + wizyta): dzielą szerokość kolumny wpisów na równe kolumny side-by-side (proste grupowanie po overlapie, bez algorytmu Google Calendar — wystarczy).
- **Skrócona zawartość dla krótkich bloków**: gdy `height < 56 px`, karta pokazuje tylko `HH:MM` + nazwisko/tytuł, bez podtytułu i bez badge'y statusu.

## Wygląd
- Zachowujemy wygląd `AppointmentCard`: kolory, zaokrąglenia (`rounded-2xl`), lewy pasek akcentu (`bg-primary`/`bg-accent`/wyszarzony), border, cień. Wewnątrz osi renderujemy nowy komponent `TimelineAppointment` (wariant kompaktowy istniejącej karty), żeby nie mieszać z domyślnym paddingiem `p-4` — używamy `p-2` / `p-3` zależnie od wysokości.
- Etykiety godzin: `text-[11px] text-muted-foreground`, pozycjonowane na linii godziny.
- Linie: `border-t border-border/60` co 60 px, plus jaśniejsza pół-godzina (`border-dashed border-border/30`) — pomaga w orientacji, ale nie krzyczy.

## Struktura plików
- Nowy komponent `src/components/day-timeline.tsx`:
  - Props: `date: Date`, `appointments: Appointment[]`, `patients: Map`, `labels: Map`, `onGapClick(startISO, endISO)`.
  - Wewnątrz: obliczenie luk, layout kolumn dla overlapu, render osi + bloków + luk.
- `src/routes/_layout.kalendarz.tsx`:
  - Zamiast `ul` z `AppointmentCard` renderuje `<DayTimeline …/>`.
  - Trzyma stan `dialogPreset: { date: Date, startHHMM?: string, endHHMM?: string } | null`.
  - Przekazuje preset do `AddAppointmentDialog`.
- `src/components/add-appointment-dialog.tsx`:
  - Rozszerzamy o opcjonalne propsy `defaultStart?: string` (HH:MM) i `defaultEnd?: string` (HH:MM), użyte przy `reset`/`defaultValues` formularza. Bez zmian logiki walidacji.

## Szczegóły techniczne
- Wszystkie kolory z tokenów (`bg-card`, `border-border`, `bg-primary`, `bg-accent`, `text-muted-foreground`) — bez hardcoded klas kolorów.
- Bez nowych zależności. `date-fns` z locale `pl` już jest.
- Helper `minutesFromStartOfDay(iso, date)` w komponencie (lokalny), + `TIMELINE_START = 420`, `TIMELINE_END = 1200`, `PX_PER_MIN = 1`.
- Dostępność: bloki wpisów są `<Link>` lub `<article>` (tak jak dziś), luki to `<button type="button" aria-label="Nowy wpis 09:45–10:30">`.

## Poza zakresem
- Widoki tygodnia i miesiąca (grid dat zostaje).
- Ekran Dzisiaj (`_layout.index.tsx`) — bez zmian.
- Drag & drop, resize bloków, scroll-to-now — nie w tej iteracji.
