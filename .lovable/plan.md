# Plan: Ujednolicenie szerokości przycisków czasu trwania

## Cel
W formularzu "Nowy wpis" wszystkie trzy przyciski szybkiego ustawiania czasu trwania (40 min / 1 h / 1,5 h) powinny mieć identyczną szerokość, dopasowaną do najszerszego z nich ("1,5 h").

## Zmiana
W pliku `src/components/add-appointment-dialog.tsx`, w wierszu renderującym przyciski `DURATION_PRESETS`, zmienić klasę przycisku tak, aby wymuszała jednolitą szerokość.

Obecna klasa:
```
className="h-7 rounded-full px-3 text-xs"
```

Docelowa klasa (przykład):
```
className="h-7 w-16 rounded-full px-2 text-xs"
```

lub z użyciem `min-w` + `flex-1` / `shrink-0`, jeśli kontener ma pozwolić na równe rozmieszczenie. Końcowa wartość zostanie dobrana po szybkiej weryfikacji w podglądzie, aby żaden z przycisków nie był węższy niż "1,5 h".

## Weryfikacja
- Otworzyć formularz "Nowy wpis" w podglądzie.
- Sprawdzić, czy przyciski 40 min, 1 h i 1,5 h mają identyczną szerokość.
- Upewnić się, że tekst w najszerszym przycisku nie jest obcinany.

## Zakres
Tylko wizualna zmiana przycisków w `add-appointment-dialog.tsx`. Brak zmian logiki, walidacji, paska dostępności ani innych ekranów.
