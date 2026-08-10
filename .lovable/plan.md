# Plan: Proporcjonalne przyciski czasu trwania

## Cel
W formularzu "Nowy wpis" rząd przycisków 40 min / 1 h / 1,5 h ma mieć szerokość proporcjonalną do liczby minut i wspólny kontener równy szerokości pól Od+Do.

## Zmiana w src/components/add-appointment-dialog.tsx

1. Otoczyć przyciski `DURATION_PRESETS` kontenerem o szerokości równej szerokości pól Od+Do.
   - Kontener pól Od/Do to siatka z `grid-cols-3`; rząd przycisków zajmuje `col-span-3`. Aby kontener przycisków miał szerokość pól Od+Do, wystarczy pozostawić go w tej samej siatce jako `col-span-3` i upewnić się, że jego wewnętrzny flex rozciąga się na pełną dostępną szerokość.

2. Wewnątrz kontenera użyć `display: flex` z odstępami `gap-1.5`.

3. Każdemu przyciskowi nadać `flex-grow` proporcjonalny do minut:
   - 40 min → `flex-grow: 40`
   - 60 min → `flex-grow: 60`
   - 90 min → `flex-grow: 90`

   Suma: 190. Zastosować style inline `style={{ flexGrow: d.minutes }}` lub klasy Tailwind odpowiadające tym współczynnikom (np. `grow-[40]`, `grow-[60]`, `grow-[90]`).

4. Etykiety wyśrodkowane (`justify-center`). Przy najwęższym przycisku (40 min) dopuszczalna mniejsza czcionka, aby tekst mieścił się bez zawijania — np. `text-[10px]` na tym przycisku lub ogólnie `text-xs` z opcjonalnym skalowaniem.

5. Zachować obecne zachowanie:
   - `variant={currentDuration === d.minutes ? "default" : "outline"}`
   - `aria-pressed={currentDuration === d.minutes}`
   - `onClick={() => applyDuration(d.minutes)}`
   - `type="button"`, `size="sm"`, zaokrąglenie `rounded-full`.

## Weryfikacja
- Otworzyć formularz "Nowy wpis".
- Sprawdzić, że przycisk "1,5 h" jest najszerszy, "1 h" średni, a "40 min" najwęższy.
- Potwierdzić, że wspólna szerokość rzędu równa się szerokości pól Od+Do.
- Sprawdzić, czy "40 min" mieści się w najwęższym przycisku bez zawijania.
- Kliknąć każdy przycisk i potwierdzić, że pole Do aktualizuje się zgodnie z czasem trwania oraz że aktywny przycisk podświetla się wariantem `default`.

## Poza zakresem
Bez zmian w logice formularza, walidacji, pasku dostępności, innych ekranach.
