## Cel
Dodać rozwijalne notatki do kart spraw w sekcji "Sprawy" na ekranie Dzisiaj (`src/components/today-tasks-section.tsx`).

## Zakres zmian
Wyłącznie plik `src/components/today-tasks-section.tsx`.

## Implementacja

### 1. Stan lokalny rozwinięcia
- Dodać `const [expanded, setExpanded] = useState<Set<string>>(new Set())` w komponencie `TodayTasksSection`.
- Stan nie jest zapisywany — resetuje się przy odmontowaniu komponentu.

### 2. Wspólny komponent karty sprawy
- Wydzielić wewnętrzny komponent `TaskCard` (lub funkcję renderującą) używany zarówno w liście głównej, jak i w grupie "Nadchodzące".
- Parametry: `task`, `today`, `variant: "main" | "upcoming"`.

### 3. Zachowanie rozwijania
- Jeśli `task.note` istnieje (po trimowaniu):
  - Obok tytułu wyświetlić ikonę `ChevronDown` z rotacją w zależności od stanu rozwinięcia.
  - Cała karta (poza checkboxem) będzie klikalna i przełącza rozwinięcie.
  - Kliknięcie checkboxa zatrzymuje propagację (`stopPropagation`) i nie przełącza rozwinięcia.
- Jeśli `task.note` jest pusta/null:
  - Brak chevrona.
  - Karta nie jest klikalna (brak obsługi kliknięcia).

### 4. Prezentacja notatki
- Po rozwinięciu pod tytułem wyświetlić `<p className="whitespace-pre-wrap text-muted-foreground text-sm mt-1">{task.note}</p>`.
- Termin pozostaje pod tytułem, notatka pojawia się poniżej terminu.

### 5. Dostępność
- Dodać `aria-expanded` do klikalnej części karty (gdy ma notatkę).
- Zachować `aria-label` checkboxa.

## Poza zakresem
- Brak zmian w `/sprawy`, store, bazie, RLS, innych komponentach.
- Brak zapisywania stanu rozwinięcia.