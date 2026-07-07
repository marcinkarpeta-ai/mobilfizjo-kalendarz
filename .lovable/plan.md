## Zmiana w `src/components/day-timeline.tsx`

### Cel
Klik w lukę ma proponować 1-godzinny slot startujący od miejsca kliknięcia (zaokrąglonego w dół do 30 min), zamiast całej luki.

### Modyfikacja przycisku luki

W `<button>` renderującym gap:

1. Dodać `onClick={(e) => { ... }}` z parametrem event (zamiast obecnego bezargumentowego).
2. Wewnątrz handlera:
   - Pobrać prostokąt przycisku: `const rect = e.currentTarget.getBoundingClientRect()`.
   - `const offsetPx = e.clientY - rect.top` (pozycja klika względem góry przycisku).
   - `const clickedMin = g.start + Math.floor(offsetPx / PX_PER_MIN)` — minuta dnia.
   - Zaokrąglenie w dół do 30 min: `let startMin = Math.floor(clickedMin / 30) * 30`.
   - Klamry: `startMin = Math.max(startMin, g.start)`.
   - `let endMin = startMin + 60`.
   - Jeśli `endMin > g.end`: `endMin = g.end`.
   - Minimum 15 min: jeśli `endMin - startMin < 15`, cofnąć `startMin = Math.max(g.start, endMin - 15)` (w praktyce dotyczy tylko luk <15 min, ale zabezpieczamy).
   - Wywołać `onGapClick(hhmm(startMin), hhmm(endMin))`.

### Bez zmian
- `aria-label` przycisku: nadal `Nowy wpis ${startLabel}–${endLabel}` (etykieta całej luki — zgodnie z instrukcją).
- Napis w środku: nadal `Wolne ${startLabel}–${endLabel}` dla luk >30 min.
- Sygnatura propa `onGapClick(startHHMM, endHHMM)` — bez zmian.
- Zachowanie identyczne dla therapist i family (family i tak nie widzi luk pokrywających się z busy blocks — `computeGaps` już je uwzględnia).
- `AvailabilityStrip` — nie ruszamy.

### Zakres
Jeden plik: `src/components/day-timeline.tsx`. Bez zmian w `_layout.kalendarz.tsx`, `_layout.index.tsx`, `add-appointment-dialog.tsx`, `availability-strip.tsx`.
