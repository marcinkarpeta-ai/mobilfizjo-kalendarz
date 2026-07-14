## Cel

Duplikaty telefonów wykrywane po kanonicznej postaci, tożsamej po stronie JS i SQL. Jedynym strażnikiem unikalności w bazie jest nowy indeks częściowy na wartości kanonicznej — dotychczasowe `UNIQUE (phone)` znika.

## Kanoniczna postać telefonu — reguła (JS i SQL identycznie)

1. Usuń wszystko poza cyframi.
2. Jeżeli po oczyszczeniu długość wynosi **dokładnie 11** i zaczyna się od `48` → obetnij pierwsze 2 cyfry.
3. Jeżeli długość wynosi **dokładnie 13** i zaczyna się od `0048` → obetnij pierwsze 4 cyfry.
4. W innych przypadkach nic nie obcinaj.
5. Wynikiem jest `+48` + 9 cyfr, jeżeli końcowa długość to 9. W innych: `+` + same cyfry (numer międzynarodowy inny niż PL) lub `null`, gdy < 7 cyfr.

Przykład: `+48 669 863 894` → 11 cyfr zaczynających się od `48` → obcięcie → `669863894` → `+48669863894`. `123456789` (9 cyfr) → nie zaczyna się od `48` po oczyszczeniu → `+48123456789`.

## Zmiany w kodzie

### `src/lib/csv.ts`

- `canonicalPhone(v: string): string | null` — implementacja reguły powyżej.
- `formatPhoneStorage(v: string): string` — canonical + formatowanie: dla PL `+48 XXX XXX XXX`, w innych `+<digits>`.

### `src/lib/import-patients.ts`

- Mapa `byPhone` bazy i `seenInFile` po `canonicalPhone`.
- `ImportRow.data.phone` = `formatPhoneStorage(phoneRaw)`.
- `canonicalPhone === null` → status Błąd „Nieprawidłowy telefon".

### `src/components/add-patient-dialog.tsx`

Porównanie duplikatów przez `canonicalPhone`, zapis przez `formatPhoneStorage`.

### `src/lib/store.ts`

`patientInsert` / `patientToDb` wołają `formatPhoneStorage`. `addPatient` i `bulkAddPatients` łapią kod błędu Postgres `23505` na nowym indeksie i pokazują czytelny toast.

## Migracja bazy (jedna migracja, kolejność krytyczna)

1. **Funkcja** `public.canonical_phone(text) returns text` **IMMUTABLE** — realizuje reguły z sekcji „Kanoniczna postać".
2. **Wykrycie kolizji wśród aktywnych** (przed jakimikolwiek zmianami danych i schematu):
   ```sql
   DO $$
   DECLARE conflict text;
   BEGIN
     SELECT string_agg(canon, ', ')
       INTO conflict
       FROM (
         SELECT public.canonical_phone(phone) AS canon
         FROM public.patients
         WHERE archived_at IS NULL AND phone IS NOT NULL
         GROUP BY 1
         HAVING count(*) > 1
       ) t;
     IF conflict IS NOT NULL THEN
       RAISE EXCEPTION 'Kolizja telefonów wśród aktywnych pacjentów: %', conflict;
     END IF;
   END $$;
   ```
   Zakres `WHERE archived_at IS NULL` jest spójny z zakresem nowego indeksu — duplikat, w którym co najmniej jeden rekord jest zarchiwizowany, nie blokuje migracji, bo nowy indeks też by go dopuścił.
3. **Usunięcie starego constraintu**: `ALTER TABLE public.patients DROP CONSTRAINT patients_phone_key;` (potwierdzone w schemacie). Wykonane przed UPDATE, żeby przejściowe różnice formatu podczas normalizacji nie kolidowały z twardym `UNIQUE (phone)`.
4. **Normalizacja istniejących numerów**: `UPDATE public.patients SET phone = <sformatowana wersja>` — wszystkie do `+48 XXX XXX XXX` (lub `+<digits>` dla nie-PL); rekordy z `phone IS NULL` lub `canonical_phone(...) IS NULL` pozostają bez zmian.
5. **Nowy indeks częściowy**: `CREATE UNIQUE INDEX patients_phone_canonical_key ON public.patients (public.canonical_phone(phone)) WHERE archived_at IS NULL;` — jedyny strażnik unikalności; obejmuje wyłącznie aktywnych pacjentów.

## Poza zakresem

- Zmiana formatu wyświetlania numeru w innych ekranach — telefon w bazie i tak będzie już znormalizowany.
- Międzynarodowe numery inne niż PL — obsługiwane, ale bez formatowania spacjami.
