# Szybkie ustawianie czasu trwania wizyty

## Co powstanie

1. **Przyciski szybkiego czasu trwania w formularzu wpisu**
   - Obok pól Od/Do rząd małych przycisków: 40 min, 1 h, 1,5 h.
   - Kliknięcie ustawia pole Do = Od + wybrany czas. Pole Od bez zmian. Gdy Od jest puste — nic się nie dzieje.
   - Przycisk odpowiadający aktualnej różnicy Od–Do jest podświetlony jako wybrany.

2. **Domyślny czas wizyty w Ustawieniach**
   - Nowe pole „Domyślny czas wizyty (min)" w ustawieniach terapeuty, wartość domyślna 60.
   - Ta wartość jest używana przy tworzeniu nowej wizyty:
     - kliknięcie w lukę na osi dnia (dziś na sztywno 60 min),
     - przycisk „+" dodawania wpisu,
     - pasek dostępności przy wyborze wolnego okna (dziś na sztywno 45 min).
   - Wszystkie trzy miejsca ujednolicone na wartość z ustawień.

## Szczegóły techniczne

- Migracja: `app_settings.default_visit_minutes integer NOT NULL DEFAULT 60`.
- `src/lib/types.ts` (`AppSettings`), `src/lib/store.ts` (stan początkowy) i `src/components/data-sync.tsx` (hydracja) rozszerzone o nowe pole.
- `src/routes/_layout.ustawienia.tsx`: pole liczbowe zapisujące ustawienie (minimum 5, krok 5).
- `src/components/add-appointment-dialog.tsx`: rząd przycisków pod/obok Od–Do; wyliczanie aktywnego wariantu z różnicy minut; ustawianie Do przez dodanie minut do Od.
- `src/components/availability-strip.tsx`: stała 45 zastąpiona wartością ze store'a.
- `src/components/day-timeline.tsx` / `src/routes/_layout.kalendarz.tsx`: preset luki i przycisku „+" korzysta z ustawienia zamiast 60.

Poza zakresem: reszta formularza, walidacje, obsługa kolizji.
