
## Zakres

Nowa funkcja na ekranie **Pacjenci**: przycisk „Import" (obok „Dodaj pacjenta") otwierający dwukrokowy dialog — wybór pliku CSV → tabela podglądu ze statusami → zapis. Widoczny tylko dla roli `therapist`. Bez zmian w RLS, bez eksportu, bez vCard.

## UI

**`src/routes/_layout.pacjenci.index.tsx`**
- Obok FAB „Dodaj pacjenta" drugi okrągły przycisk (ikona `Upload`) „Import" — otwiera `ImportPatientsDialog`. Renderowany tylko gdy `role === "therapist"` (rola pobierana tak samo jak w pozostałych ekranach ról-świadomych).
- Na kaflu pacjenta w liście, jeżeli `!salutation`, pokazać dyskretną plakietkę (`Badge variant="outline"`) „Uzupełnij formę zwrotu" — analogicznie do „Brak zgody"/„Marketing".

**`src/routes/_layout.pacjenci.$id.tsx`**
- W nagłówku karty, gdzie dziś jest `salutation · telefon`, jeżeli `!salutation` wyświetlić plakietkę „Uzupełnij formę zwrotu" (klikalna → otwiera dialog edycji pacjenta, jak istniejący przycisk „Edytuj").

**Nowy komponent `src/components/import-patients-dialog.tsx`**
- Krok 1 — wybór pliku: `<input type="file" accept=".csv,text/csv">`, krótka instrukcja z listą kolumn i informacją, że wymagane są tylko `first_name`, `last_name`, `phone`. Parsowanie w pamięci. Brak nagłówków / brak wymaganych kolumn → toast błędu.
- Krok 2 — podgląd:
  - Tabela (przewijana, `max-h-[60vh]`): Lp. · Imię · Nazwisko · Telefon (znormalizowany) · Status.
  - Statusy jako `Badge`:
    - **Nowy** (zielony) — trafi do zapisu.
    - **Duplikat numeru** (szary) — telefon istnieje w kartotece albo powtarza się w pliku; pominięty.
    - **Błąd** (czerwony) z krótkim opisem: „brak imienia/nazwiska/telefonu", „nieprawidłowy telefon", „nieprawidłowa data urodzenia".
  - Licznik na górze: `Nowych: X · Duplikatów: Y · Błędów: Z`.
  - Przyciski: „Anuluj", „Importuj X pacjentów" (disabled gdy X = 0). W trakcie zapisu spinner + blokada.
- Po zapisie toast: `Dodano X pacjentów. Pominięto Y duplikatów, Z błędów.` i zamknięcie dialogu.

## Parsowanie CSV

Nowy `src/lib/csv.ts` — mały parser inline (bez nowej zależności):
- Detekcja separatora: pierwsza linia — częstsze `;` czy `,` poza cudzysłowami (fallback `,`).
- Obsługa pól w cudzysłowach z `""`, CRLF/LF, BOM.
- Zwraca `{ headers: string[]; rows: string[][] }`.

Mapowanie nagłówków: lower-case + trim. Rozpoznawane wyłącznie dokładne nazwy z zadania (`first_name`, `last_name`, `phone`, `salutation`, `birth_date`, `general_note`) — kolejność dowolna, nieznane kolumny ignorowane. Brak którejś z wymaganych trzech kolumn → błąd walidacji pliku w kroku 1.

## Walidacja i normalizacja wierszy

W dialogu (lub `src/lib/import-patients.ts`):
- `first_name`, `last_name`: `trim`, wymagane, max 60.
- `phone`: `trim`, normalizacja:
  - usunąć spacje, myślniki, nawiasy;
  - `+` na początku zostaje;
  - `00` na początku → `+`;
  - 9 cyfr → prefiks `+48`;
  - inaczej — błąd „nieprawidłowy telefon".
  - Finalna walidacja tym samym regexem co w formularzu (`/^\+?\d[\d\s-]{7,17}$/`). Przy okazji wyciągnąć wspólną funkcję `normalizePhone` do `src/lib/format.ts` i użyć jej także w `add-patient-dialog.tsx` (bez zmiany zachowania).
- `salutation`: opcjonalne. Puste → zapis `null` (bez fallbacku, bez błędu). Zgodne z dzisiejszym typem (`salutation?: string`).
- `birth_date`: opcjonalne; jeśli podane, musi pasować do `^\d{4}-\d{2}-\d{2}$` i być poprawną datą — inaczej błąd.
- `general_note`: opcjonalne, max 2000.
- Status wiersza:
  1. walidacja nie przechodzi → `error`;
  2. znormalizowany telefon = telefon dowolnego istniejącego pacjenta (aktywnego lub zarchiwizowanego — baza ma unique) → `duplicate`;
  3. znormalizowany telefon już wystąpił we wcześniejszym wierszu tego pliku → `duplicate`;
  4. w przeciwnym razie → `new`.

## Zapis

W `src/lib/store.ts` dodać `bulkAddPatients(patches)`:
- Jedno `supabase.from("patients").insert(rows).select()` (RLS terapeuty pozwala).
- `service_consent_at`, `marketing_consent_at` — pozostają `null`; użytkownik uzupełni w karcie (istniejąca plakietka „Brak zgody").
- `salutation` puste zapisywane jako `null`.
- Po sukcesie doklejenie zwróconych wierszy do lokalnego stanu (analogicznie do `addPatient`).
- Zwraca `{ inserted: number }`; błąd Supabase (np. race na unique) łapie dialog i pokazuje toast.

## Ograniczenie do roli

- Przycisk „Import" tylko dla `therapist`.
- Baza i tak zablokuje wywołanie z innej roli — w razie błędu toast „Brak uprawnień".

## Plakietka „Uzupełnij formę zwrotu"

- Widoczna tylko gdy `!patient.salutation` (`null`/pusty string po `trim`).
- Miejsca:
  - kafel na liście (`_layout.pacjenci.index.tsx`) w kolumnie plakietek, obok badge'y zgód;
  - nagłówek karty pacjenta (`_layout.pacjenci.$id.tsx`) — jako badge obok imienia i nazwiska.
- Formularz „Edytuj pacjenta" pozostaje bez zmian — `salutation` nadal wymagane przy ręcznej edycji/dodawaniu.

## Poza zakresem

- Eksport, vCard, mapowanie zgód z CSV.
- Zmiany polityk RLS i migracje.
- Import wizyt/notatek.
- Undo importu.

## Pliki

- `src/routes/_layout.pacjenci.index.tsx` — przycisk „Import", mount dialogu, plakietka braku formy zwrotu.
- `src/routes/_layout.pacjenci.$id.tsx` — plakietka braku formy zwrotu w nagłówku.
- `src/components/import-patients-dialog.tsx` — nowy komponent (2 kroki + tabela statusów).
- `src/lib/csv.ts` — parser + detekcja separatora.
- `src/lib/import-patients.ts` (opc.) — walidacja/normalizacja wierszy.
- `src/lib/format.ts` — wspólne `normalizePhone` (użyte też w `add-patient-dialog.tsx`).
- `src/lib/store.ts` — `bulkAddPatients`.
