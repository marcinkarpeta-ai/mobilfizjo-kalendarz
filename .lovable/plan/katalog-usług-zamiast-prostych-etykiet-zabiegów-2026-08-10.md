# Katalog usług zamiast prostych etykiet zabiegów

Etykiety zabiegów stają się pełnym katalogiem usług: nazwa, czas trwania, cena, opis, dostępność w przyszłych rezerwacjach online i kolejność. Przypisywanie usługi do wizyty działa jak dotychczas.

## 1. Baza

Do istniejącej tabeli `visit_labels` dochodzą wyłącznie nowe kolumny (nic nie jest usuwane ani zmieniane):

- czas trwania w minutach (domyślnie 60)
- cena w zł (opcjonalna)
- krótki opis (opcjonalny)
- „dostępna w rezerwacjach online" (domyślnie wyłączona)
- kolejność na liście (domyślnie 0)

Istniejące etykiety dostają wartości domyślne, więc kalendarz działa bez zmian.

## 2. Ustawienia terapeuty — sekcja „Usługi"

Dotychczasowa sekcja „Etykiety zabiegów" zostaje przebudowana na listę usług:

- Każda pozycja: nazwa, obok czas trwania i cena (jeśli podana), pod spodem opis (jeśli podany), znacznik „rezerwacje online" gdy włączone.
- Strzałki w górę/w dół zmieniają kolejność (zapis kolejności od razu).
- Przycisk „Dodaj usługę" oraz dotknięcie pozycji otwierają dolny arkusz z polami: nazwa (wymagana), czas trwania (min), cena (zł, opcjonalna), opis (opcjonalny), przełącznik „dostępna w rezerwacjach online". W arkuszu edycji także usuwanie usługi (z dotychczasowym zachowaniem).
- Lista sortowana wg kolejności, następnie nazwy.

## 3. Formularz wizyty

Po wybraniu usługi pole „Do" ustawia się automatycznie na „Od" + czas trwania usługi (gdy usługa ma czas trwania). Ręczna zmiana godzin i przyciski szybkiego czasu trwania działają jak dotąd; ponowny wybór tej samej usługi niczego nie nadpisuje bez zmiany wyboru.

## 4. Karta pacjenta

Rozkład etykiet w statystykach pokazuje nazwy usług — bez zmian w logice liczenia.

## Szczegóły techniczne

- Migracja: `ALTER TABLE public.visit_labels ADD COLUMN duration_minutes integer NOT NULL DEFAULT 60, ADD COLUMN price_pln numeric(10,2), ADD COLUMN description text, ADD COLUMN bookable boolean NOT NULL DEFAULT false, ADD COLUMN sort_order integer NOT NULL DEFAULT 0`. Bez zmian RLS/GRANT (istniejąca polityka `visit_labels_therapist_all` zostaje).
- `src/lib/types.ts`: rozszerzenie `VisitLabel` o `duration_minutes`, `price_pln?`, `description?`, `bookable`, `sort_order`.
- `src/lib/store.ts`: `addLabel(data)` / `updateLabel(id, patch)` przyjmują pełny obiekt usługi (optymistycznie, wzorem obecnych akcji) + nowa akcja `reorderLabels(ids)` zapisująca `sort_order`; `removeLabel` bez zmian. Sortowanie po `sort_order`, potem `name` (`Intl.Collator('pl')`).
- `src/components/data-sync.tsx`: mapowanie nowych kolumn; zapytanie sortowane po `sort_order`.
- Nowy komponent `src/components/service-edit-sheet.tsx` (Sheet z dołu, wzorem `task-edit-sheet.tsx`) używany do dodawania i edycji.
- `src/routes/_layout.ustawienia.tsx`: sekcja „Usługi" zastępuje obecny blok etykiet (inline input + lista) listą pozycji z ikonami zmiany kolejności i arkuszem.
- `src/components/add-appointment-dialog.tsx`: w handlerze zmiany `labelId` przeliczenie pola „Do" na podstawie `duration_minutes` wybranej usługi (tylko gdy „Od" ustawione); podświetlanie presetów czasu trwania działa dalej na podstawie różnicy Od/Do.
- `src/routes/_layout.pacjenci.$id.tsx`: bez zmian logiki — nazwy pochodzą z `labelById`.

Poza zakresem: publiczna strona rezerwacji, zgody, wyliczanie wolnych terminów.
