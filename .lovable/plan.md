## Zmiany w sekcji "Sprawy"

### 1) `src/components/today-tasks-section.tsx`
- Rozdziel otwarte sprawy na dwie grupy:
  - **główna**: `!due_date || due_date <= today` (obecna logika bez zmian, sort jak dziś),
  - **upcoming**: `due_date > today`, sort rosnąco po dacie.
- Sekcja renderuje się, gdy istnieje jakakolwiek otwarta sprawa (główna LUB upcoming).
- Pod listą główną dodaj `Collapsible` (domyślnie zwinięty) z triggerem `Nadchodzące (N)` + chevron (`ChevronDown` z rotacją). Renderuj tylko gdy `upcoming.length > 0`.
- Wewnątrz — te same karty co w części głównej: checkbox (`completeTask`), tytuł, widoczna data w formacie `dd.MM.yyyy` (`pl` locale).
- Link „Wszystkie sprawy →" zostaje bez zmian.
- **Usuń** renderowanie `t.created_by_name` z pozycji.

### 2) `src/routes/_layout.sprawy_.index.tsx`
- W `TaskGroup` usuń wyświetlanie `t.created_by_name` (tylko tytuł, notatka i ewentualny termin/marker zaległości).
- W sekcji „Wykonane" usuń fragment `${t.done_by_name ? \` • ${t.done_by_name}\` : ""}` — zostaje sama data wykonania.

### Poza zakresem
Store, baza, RLS, inne komponenty — bez zmian. Kolumny `created_by`/`done_by` w DB zostają, przestajemy je tylko renderować.
