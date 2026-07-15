## Cel
Stałe sortowanie alfabetyczne pacjentów (PL) na liście Pacjenci oraz w comboboxie w formularzu "Nowy wpis". Bez innych zmian.

## Klucz sortowania
Wspólny helper w `src/lib/format.ts`:
- `comparePatients(a, b)`:
  - `key = (last_name?.trim() || first_name?.trim() || "")` – lowercase
  - porównanie: `collator.compare(keyA, keyB)` gdzie `collator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true })`
  - remis 1: `first_name?.trim() || ""` przez ten sam collator
  - remis 2: `phone` (zwykłe `localeCompare`)

## Zmiany
1. `src/lib/format.ts` – dodać `comparePatients`.
2. `src/routes/_layout.pacjenci.index.tsx` – w `filtered` (useMemo) po filtrze wyszukiwarki wywołać `.slice().sort(comparePatients)`. Dotyczy zarówno przypadku z zapytaniem, jak i bez.
3. `src/components/add-appointment-dialog.tsx` – lista pacjentów w comboboxie (useMemo z filtrowaniem po wyszukiwarce) – po filtrze zastosować to samo `sort(comparePatients)`.

## Poza zakresem
Karta pacjenta, wygląd, logika badge'y, RLS, inne ekrany.
