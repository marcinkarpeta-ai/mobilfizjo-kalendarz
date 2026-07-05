
## Zakres

Ekran Pacjenci (`_layout.pacjenci.tsx`) i karta pacjenta (`_layout.pacjenci.$id.tsx`). Wspólny formularz dodawania/edycji (`add-patient-dialog.tsx`). Store i typy.

## Zmiany modelu (`src/lib/types.ts`)

Dodać do `Patient`:
- `service_consent_changed_at?: string` — data ostatniej zmiany zgody obsługowej (włączenia lub wycofania)
- `marketing_consent_changed_at?: string` — analogicznie dla marketingowej
- `general_note?: string` — notatka ogólna o pacjencie (pole tekstowe w formularzu)
- `archived_at?: string` — jeśli ustawione, pacjent jest zarchiwizowany

## Store (`src/lib/store.ts`)

- `updatePatient` już istnieje — użyjemy go do edycji i archiwizacji.
- Dodać helpery: `archivePatient(id)` ustawia `archived_at = now`; `restorePatient(id)` czyści `archived_at`.
- Fizyczne `deletePatient` NIE powstaje — usuwanie nie istnieje w UI.
- Przy tworzeniu i edycji, gdy zmienia się stan zgody, ustawiać `*_consent_at` (data wyrażenia, kasowana przy wycofaniu) oraz zawsze aktualizować `*_consent_changed_at` (data ostatniej zmiany, do etykiet "wycofana dn. ..."). Logikę trzymamy w dialogu, store zapisuje przekazane wartości.

## Formularz `add-patient-dialog.tsx` (dodawanie + edycja)

Rozszerzyć props:
```
{ open, onOpenChange, patient?: Patient }
```
- Bez `patient` → tryb "Nowy pacjent" (jak dziś).
- Z `patient` → tryb "Edytuj pacjenta": tytuł i tekst przycisku zmienione; stany inicjalizowane z `patient` w `useEffect` na `open`.

Nowe pole:
- `Textarea` "Notatka ogólna" (opcjonalne, max ~2000 znaków) — pod polem daty urodzenia.

Walidacja telefonu:
- Unikalność sprawdzana przeciw pacjentom o innym `id` niż edytowany. Jeśli kolizja, błąd: `"Ten numer należy już do: {imię nazwisko}"` (zamiast obecnego ogólnego komunikatu).

Zgody:
- Porównać stan checkboxów z wartościami z `patient` (lub `undefined` przy tworzeniu). Dla każdej zgody, której stan się zmienił, ustawić `*_consent_changed_at = now`. `*_consent_at` = `now` gdy włączona, `undefined` gdy wyłączona (przy tworzeniu — jak dziś, tylko z now dla wyrażonej).

Zapis:
- Tryb tworzenia: `addPatient(...)`.
- Tryb edycji: `updatePatient(patient.id, patch)` z pełnym patchem (w tym `general_note`, obie daty zgód, `*_changed_at`).

## Karta pacjenta (`_layout.pacjenci.$id.tsx`)

Nagłówek/nagłówki akcji:
- Przycisk `Edytuj` (obok istniejącego `ArrowLeft` po prawej albo w sekcji Dane) → otwiera `AddPatientDialog` z przekazanym `patient`.
- Przycisk `Archiwizuj` (widoczny gdy nie zarchiwizowany) → otwiera `AlertDialog` z tekstem: "Pacjent zniknie z listy, ale historia wizyt zostaje.". Potwierdzenie wywołuje `archivePatient(id)`, toast "Zarchiwizowano.", `router.navigate({ to: "/pacjenci" })`.
- Gdy pacjent jest zarchiwizowany: baner informacyjny + przycisk `Przywróć` w miejscu `Archiwizuj`.

W zakładce "Dane" pokazać zgodę z datą:
- `Wyrażona {fmtDate(service_consent_at)}` gdy obecna.
- Gdy `service_consent_at` brak, ale `service_consent_changed_at` obecne → `Wycofana {fmtDate(service_consent_changed_at)}`.
- Gdy brak obu → `Brak` (jak dziś).
- Analogicznie dla marketingowej.

Dodać wiersz z `general_note` (jeśli obecna) — pełnej szerokości pod ostatnią zgodą, w karcie z etykietą "Notatka ogólna".

## Lista pacjentów (`_layout.pacjenci.tsx`)

- Filtrować `patients` po `!archived_at` domyślnie.
- Nad polem wyszukiwania (lub obok, po prawej) dyskretny `Switch` z etykietą "Pokaż zarchiwizowanych" (użyć `@/components/ui/switch`, jeśli nie zaimportowany).
- Gdy włączony: pokazuj wszystkich; przy każdym zarchiwizowanym `Badge variant="outline"` "Zarchiwizowany" oraz przycisk `Przywróć` (np. mały `Button` obok badge). Kliknięcie `Przywróć` wywołuje `restorePatient(id)` i toast.
- Licznik w podtytule pokazuje tylko aktywnych ("N osób w kartotece"); w trybie z zarchiwizowanymi doprecyzować: "N aktywnych • M zarchiwizowanych".

## Wybór pacjenta w "Nowy wpis" (`add-appointment-dialog.tsx`)

- W liście `<Select>` filtrować `patients.filter(p => !p.archived_at)`. Zarchiwizowani nie pojawiają się jako opcje.
- Istniejące wizyty (w tym powiązane z zarchiwizowanym pacjentem) pozostają w kalendarzu bez zmian — nie modyfikujemy `appointments`.

## Poza zakresem

- Fizyczne usuwanie pacjentów — nie dodajemy.
- Kalendarz, `day-timeline.tsx`, `availability-strip.tsx`, wiadomości, ekran Dzisiaj — bez zmian.
- Wizyty archiwizowanych pacjentów w kalendarzu wyświetlane normalnie (można w przyszłej iteracji dodać oznaczenie, teraz brak wymogu).
