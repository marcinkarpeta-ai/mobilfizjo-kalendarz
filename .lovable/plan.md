# Oznaczenie dni niedostępnych w siatce miesiąca

Siatka dni w Kalendarzu pokaże, które dni są wolne lub nieczynne — subtelnie, tak by wybór dnia i „dzisiaj” pozostały najbardziej wyraziste.

## Zakres

- **Dzień wolny** (wpis w „Dni wolne”): delikatna czerwonawa obwódka komórki i czerwonawy odcień numeru dnia.
- **Dzień zamknięty** (godziny pracy: zamknięte): szare tło komórki i przygaszony numer dnia.
- Gdy dzień jest jednocześnie wolny i zamknięty, pierwszeństwo ma oznaczenie „Dzień wolny”.
- Komórka wybrana i dzisiejsza zachowują obecny, mocniejszy wygląd — oznaczenia niedostępności wtedy ustępują (nie nakładamy obwódki/tła na wybrany dzień).
- Nad siatką krótka legenda: dwa małe znaczniki z podpisami „Dzień wolny” i „Nieczynne”, widoczna wyłącznie dla roli therapist.
- Kropki wpisów, nawigacja miesiącami, oś dnia i ustawienia bez zmian.

## Szczegóły techniczne

- Plik: `src/routes/_layout.kalendarz.tsx` (wyłącznie prezentacja).
- Dane już są w store: `workingHours`, `daysOff` (ładowane przez `data-sync.tsx`); dla ról bez dostępu listy są puste, więc oznaczenia po prostu się nie pojawią.
- Dla każdej komórki: `dayOff = daysOff.some(d => d.date === key)`, `closed = workingHours.find(w => w.weekday === d.getDay())?.is_open === false` (mapy/`useMemo` z `daysOff` i `workingHours`).
- Klasy przez `cn`, wyłącznie tokeny semantyczne: dzień wolny → `ring-1 ring-destructive/30 text-destructive/70`; zamknięty → `bg-muted/50 text-muted-foreground/70`. Oba stosowane tylko gdy `!isSelected`; pierścień „dzisiaj” (`ring-primary/50`) ma pierwszeństwo nad pierścieniem dnia wolnego.
- Legenda: mały wiersz `flex` nad nagłówkiem dni tygodnia, renderowany gdy `role === "therapist"`, z kropką/kwadracikiem w tych samych klasach co oznaczenia + `aria-hidden` na znacznikach.
