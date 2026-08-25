# Wydarzenia rodzinne — trzy kategorie właściciela

Wydarzenie rodzinne będzie miało właściciela: Dawid, Kasia lub Wspólne. Każda kategoria ma swój pastelowy kolor w palecie Warm Sand, widoczny na osi dnia, ekranie Dzisiaj i w arkuszu szczegółów, dla wszystkich roli widzących wydarzenia rodzinne.

## Zakres

- **Baza**: do wpisów kalendarza dochodzi pole właściciela z wartościami „his”, „hers”, „both” i domyślną „both”. Migracja tylko dodaje kolumnę — istniejące wpisy stają się „Wspólne”. Dotyczy wyłącznie wydarzeń rodzinnych (wizyty pacjentów ignorują to pole).
- **Formularz wydarzenia rodzinnego**: pod polem tytułu trzy przyciski segmentowane „Dawid / Kasia / Wspólne”, domyślnie „Wspólne”. Etykiety wpisane na stałe (bez pobierania z profili). Wybór zapisuje się przy dodawaniu i edycji.
- **Kolory**: trzy pary tokenów (tło + pasek akcentu):
  - Dawid — pastelowa zieleń,
  - Kasia — grafitowo-popielaty pastel,
  - Wspólne — obecny ciepły odcień (bez zmian).
  Stosowane w kartach wpisów na osi dnia, na ekranie Dzisiaj i w arkuszu szczegółów. Wyszarzanie minionych wpisów, wyróżnienie trwających i plakietka „Rodzina” bez zmian.
- **Legenda**: w miejscu obecnej legendy nad siatką miesiąca dochodzą trzy znaczniki kolorów z podpisami „Dawid”, „Kasia”, „Wspólne”. Widoczna dla wszystkich ról widzących wydarzenia rodzinne (dotychczasowe znaczniki „Dzień wolny”/„Nieczynne” pozostają jak dziś — tylko dla terapeuty).
- Poza zakresem: wizyty pacjentów, rezerwacje online, powiadomienia SMS.

## Szczegóły techniczne

- Migracja: `ALTER TABLE public.appointments ADD COLUMN owner text NOT NULL DEFAULT 'both' CHECK (owner IN ('his','hers','both'))`. Bez zmian RLS i grantów.
- `src/lib/types.ts`: `FamilyOwner = "his" | "hers" | "both"`, pole `owner?: FamilyOwner` w `Appointment`.
- `src/lib/store.ts`: `owner` w insercie (`addAppointment`), w mapowaniu wiersza na obiekt oraz w patchu `updateAppointment`.
- `src/components/add-appointment-dialog.tsx`: stan `owner`, reset w efekcie inicjalizującym (`[open]`), segmentowany wybór (przyciski `variant="outline"`/`default`, `aria-pressed`) widoczny tylko dla `type === "family_event"`, przekazanie `owner` w obu ścieżkach zapisu.
- `src/styles.css`: nowe zmienne w `:root` i w motywie ciemnym — `--family-his`, `--family-his-bar`, `--family-hers`, `--family-hers-bar` (istniejące `--family`/`--family-bar` = „both”), z mapowaniem w bloku `@theme` na `--color-family-*`, aby działały klasy `bg-family-his` itd. Wartości w oklch, spójne z paletą.
- Pomocnik prezentacyjny (np. `familyOwnerClasses(owner)` w `src/lib/format.ts` lub nowym `src/lib/family.ts`) zwracający klasy tła i paska oraz etykietę; użyty w `src/components/appointment-card.tsx` (Dzisiaj), `src/components/day-timeline.tsx` i `src/components/appointment-details-sheet.tsx` w miejsce sztywnych `bg-family` / `bg-family-bar`.
- `src/routes/_layout.kalendarz.tsx`: rozszerzenie wiersza legendy o trzy kwadraciki w klasach z tego samego pomocnika (`aria-hidden` na znacznikach).
