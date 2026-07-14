## Zakres

Wdrażam zatwierdzony plan importu CSV pacjentów w całości oraz dodaję migrację cofającą niezamówioną zmianę `salutation NOT NULL`.

## 1. Migracja bazy

Osobna migracja przywracająca NULL:

```sql
ALTER TABLE public.patients ALTER COLUMN salutation DROP NOT NULL;
UPDATE public.patients SET salutation = NULL WHERE salutation = '';
```

Bez innych zmian schematu (brak zmian w RLS/GRANT).

## 2. Nowe pliki

- `src/lib/csv.ts` — inline parser CSV: auto-detekcja separatora (`,` / `;`), BOM, cudzysłowy z escape (`""`), CRLF/LF. Normalizacja nagłówków (lowercase, trim). Obsługiwane kolumny: `first_name`, `last_name`, `phone` (wymagane), `salutation`, `birth_date`, `general_note` (opcjonalne). Brak wymaganej kolumny → wyjątek z listą braków.
- `src/lib/import-patients.ts` — walidacja i normalizacja wiersza + wyznaczanie statusu (`new` / `duplicate` / `error`). Reguły:
  - `first_name`, `last_name`: trim, wymagane, max 60.
  - `phone`: usuń spacje/`-`, `00…` → `+…`, 9 cyfr → `+48…`, regex `^\+?\d[\d\s-]{7,17}$`. Wynikowy `phone` znormalizowany.
  - `salutation`: `trim()`; pusty → `null` (bez fallbacku).
  - `birth_date`: `YYYY-MM-DD` lub pusty → `null`.
  - `general_note`: trim, max 2000, pusty → `null`.
  - Duplikat: znormalizowany telefon pasuje do istniejącego pacjenta (aktywnego lub zarchiwizowanego) lub powtarza się wcześniej w pliku.
- `src/components/import-patients-dialog.tsx` — dwuetapowy dialog:
  - Krok 1: `<input type="file" accept=".csv,text/csv">`. Po wybraniu — parsowanie, walidacja, wyliczenie statusów.
  - Krok 2: nagłówek z licznikami (`Nowych N • Duplikatów M • Błędów K`), tabela `max-h-[60vh] overflow-auto` z kolumnami: Lp., Imię, Nazwisko, Telefon, Status (Badge: Nowy / Duplikat numeru / Błąd + tooltip powodu). Przyciski `Anuluj` i `Importuj N nowych` (disabled gdy 0). Po sukcesie: toast, zamknięcie.

## 3. Zmiany istniejące

- `src/lib/store.ts` — dodać `bulkAddPatients(patches: NewPatient[]): Promise<Patient[]>`. Wstawia rekordy przez `supabase.from("patients").insert(rows).select()`; `service_consent_at` i `marketing_consent_at` = `null`; `salutation` z inputu (może być `null`). Optimistic update do listy + rollback przy błędzie. Zwraca utworzone rekordy dla UI toastu.
- `src/lib/types.ts` — `Patient.salutation: string | null` (zamiast `string`).
- `src/components/add-patient-dialog.tsx` — formularz nadal wymaga `salutation` (min 1) — zachowane. Wczytywanie edycji: `patient.salutation ?? ""`.
- `src/routes/_layout.pacjenci.index.tsx`:
  - Przycisk „Import CSV" (ikona `Upload`) obok FAB „Dodaj pacjenta" (widoczny tylko dla roli `therapist`), otwiera `ImportPatientsDialog`.
  - Plakietka „Uzupełnij formę zwrotu" (Badge outline) na karcie pacjenta gdy `!p.salutation || p.salutation.trim() === ""` — obok istniejących plakietek zgód. Reaguje więc i na `NULL`, i na pusty string.
- `src/routes/_layout.pacjenci.$id.tsx` — analogiczna plakietka w nagłówku karty (klik → otwiera dialog edycji). Warunek: `!salutation?.trim()`.
- Miejsca renderujące `{p.salutation} · {p.phone}` (lista pacjentów, combobox w `add-appointment-dialog`, karta pacjenta) — użyć fallbacku wizualnego typu `{p.salutation || "—"} · {p.phone}` gdzie jest to sensowne, bez zmiany logiki wysyłki SMS.

## 4. Poza zakresem

Eksport, vCard, undo importu, mapowanie zgód z CSV, import wizyt/notatek, zmiany RLS/GRANT.

## Kolejność wykonania

1. Migracja `DROP NOT NULL` + `UPDATE ... = NULL WHERE = ''` (osobne zatwierdzenie).
2. Po zatwierdzeniu — reszta zmian frontendu (typy, store, dialog importu, przycisk, plakietka na 2 ekranach).
