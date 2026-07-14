## Cel
Poluzować wymóg nazwiska — pacjent musi mieć co najmniej jedno z pól imię/nazwisko. Dodać plakietkę "Uzupełnij dane" i obsłużyć wyświetlanie bez podwójnych spacji.

## 1. Migracja bazy

```sql
ALTER TABLE public.patients ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN last_name  DROP NOT NULL;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_name_present_chk
  CHECK (
    COALESCE(NULLIF(btrim(first_name), ''), NULLIF(btrim(last_name), '')) IS NOT NULL
  );
```

## 2. Typy i store

- `src/lib/types.ts`: `first_name: string | null`, `last_name: string | null`.
- `src/lib/store.ts`: `mapPatient` toleruje `null`; `addPatient`/`updatePatient`/`bulkAddPatients` zapisują `null` gdy puste (nie pusty string).

## 3. Wyświetlanie imię+nazwisko

Nowy helper `formatPatientName(p)` w `src/lib/format.ts`:
- składa `[first, last].filter(Boolean).join(" ")`;
- gdy oba puste → `"(bez nazwiska)"` (fallback dla bezpieczeństwa, nie powinien wystąpić dzięki CHECK).

Zamienić wszystkie miejsca łączenia `${first_name} ${last_name}` na ten helper:
- `_layout.pacjenci.index.tsx`, `_layout.pacjenci.$id.tsx`
- `appointment-card.tsx`, `appointment-details-sheet.tsx`
- `add-appointment-dialog.tsx` (combobox: wyszukiwanie po imieniu, nazwisku, telefonie — zachować diakrytyko-niewrażliwe działanie także na `null`)
- `import-patients-dialog.tsx` (wiersz podglądu)
- `import-patients.ts` (komunikat "Już istnieje: …")

## 4. Import CSV (`src/lib/import-patients.ts`)

- Usunąć błędy "Brak imienia" / "Brak nazwiska".
- Nowa reguła: gdy oba puste → `status: "error"`, `error: "Brak imienia i nazwiska."`.
- Gdy jedno z pól puste → `status: "new"`, do kolumny Uwagi dopisać `"Dane niekompletne"` (nowe pole `warning?: string` na `ImportRow`, wyświetlane w podglądzie tuż obok/łącznie z `error`/`duplicateOf`).
- W `data`: puste → `null` (spójne z DB), a nie `""`.

## 5. Formularz ręczny (`src/components/add-patient-dialog.tsx`)

- Zod: `first_name` i `last_name` opcjonalne (`.trim().max(60).optional()`).
- Po `safeParse`: jeśli oba puste → `setErrors({ first_name: "Podaj imię lub nazwisko.", last_name: " " })` (albo jeden komunikat pod grupą pól).
- Do zapisu: `first_name: parsed.first_name || null`, `last_name: parsed.last_name || null`.

## 6. Plakietka "Uzupełnij dane"

Analogicznie do istniejącej plakietki formy zwrotu (`salutation` null/empty):
- warunek: `!p.first_name?.trim() || !p.last_name?.trim()`
- w `src/routes/_layout.pacjenci.index.tsx` (na wierszu listy)
- w `src/routes/_layout.pacjenci.$id.tsx` (na karcie pacjenta)
- ten sam wariant `Badge` co dla formy zwrotu, tekst: „Uzupełnij dane"

## Poza zakresem
RLS, import zgód, zmiany w day-timeline i innych widokach kalendarza (pokazywanie nazwiska w kartach użyje nowego helpera bez zmian layoutu).
