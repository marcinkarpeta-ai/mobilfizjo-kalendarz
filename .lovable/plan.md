
# Pasek dostępności w formularzu „Nowy wpis"

## Zakres
Tylko dwa pliki:
- **Nowy** `src/components/availability-strip.tsx` — kompaktowy pasek dostępności dnia.
- **Edycja** `src/components/add-appointment-dialog.tsx` — osadzenie paska pod polami Od/Do.

Bez zmian: `day-timeline.tsx`, `_layout.kalendarz.tsx`, walidacja, logika zapisu, inne ekrany.

## Komponent AvailabilityStrip

Props:
```ts
{
  date: string;              // "YYYY-MM-DD", synchronizowane z polem Data
  onDateChange: (d: string) => void;
  start: string;             // "HH:MM" z formularza
  end: string;               // "HH:MM"
  onRangeChange: (start: string, end: string) => void;
  appointments: Appointment[]; // z useStore w rodzicu
}
```

Layout (od góry):
1. **Nagłówek** (~28 px): strzałka `‹` (lewa), etykieta dnia po polsku (np. „pt, 3 lipca"), strzałka `›` (prawa). Kliknięcie strzałek: `onDateChange(prevDay/nextDay)`.
2. **Pasek dostępności** (~64 px): `position: relative`, `bg-secondary/40`, `rounded-xl`, `border border-border`. Skala pozioma: 100% szerokości = 07:00–20:00 (780 min).
   - Dla każdego nieodwołanego wpisu z wybranego dnia: `absolute` blok o `left = (startMin−420)/780*100%`, `width = duration/780*100%`, przycięty do zakresu; kolor: `bg-primary` (wizyta) lub `bg-accent` (rodzinne); bez tekstu. `title` dla dostępności: „HH:MM–HH:MM".
   - **Wolne luki**: obliczone tak jak w day-timeline (bez wpisów odwołanych). Każda luka to niewidoczny `<button>` pokrywający swój fragment paska, `aria-label="Ustaw termin od HH:MM"`. Kliknięcie: `onRangeChange(gap.start, gap.start+45min)` (przycięte do końca luki jeśli krótsza niż 45 min, ale nie krócej niż koniec luki albo min. 15 min).
   - **Zaznaczenie aktualnego terminu formularza**: nakładka `absolute` z `border-2 border-foreground/70 rounded-md`, pozycjonowana wg `start`/`end` formularza.
   - **Nakładka kolizji**: dla każdego nieodwołanego wpisu, przecięcie z aktualnym `[start,end]` renderowane jako `absolute bg-destructive/60` nad blokiem (tylko ta część, która się nakłada).
3. **Skala godzin** (~16 px, pod paskiem): drobne kreski i etykiety `07`, `10`, `13`, `16`, `20` w `text-[10px] text-muted-foreground` co 3 godziny — czytelnie i niezaśmiecająco.

## Gesty
Swipe poziomy na obszarze paska za pomocą natywnych pointer events:
- `onPointerDown` zapamiętuje `clientX`, `pointerId`, `capture`.
- `onPointerMove` — jeśli `|dx| > 50 px` po `pointerUp` → `onDateChange(prev/next)`. Jeśli w trakcie ruchu przekroczy próg 60 px, wywołujemy jednorazowo (blokada) i ustawiamy flagę „swiping" żeby uniknąć wywołania kliknięcia luki.
- Kliknięcie luki działa gdy `!swiping` w `onClick`.

Bez zewnętrznych bibliotek (żadnych framer/hammerjs).

## Integracja w dialogu

W `add-appointment-dialog.tsx`, tuż pod diva z polami `Od`/`Do` (ok. linii 156):
```tsx
<AvailabilityStrip
  date={date}
  onDateChange={setDate}
  start={start}
  end={end}
  onRangeChange={(s, e) => { setStart(s); setEnd(e); }}
  appointments={appointments}
/>
```
`appointments` już jest pobierane z useStore w komponencie.

Reszta pól, ostrzeżenia (`overlapping`, `noServiceConsent`), przyciski — bez zmian.

## Szczegóły techniczne
- Kolory wyłącznie z tokenów: `bg-primary`, `bg-accent`, `bg-destructive`, `border-border`, `bg-secondary`, `text-muted-foreground`, `text-foreground`.
- Zakres 07:00–20:00 = 780 minut, stałe: `START_MIN = 420`, `END_MIN = 1200`, `RANGE = 780`.
- Helpery lokalne: `hhmmToMin`, `minToHHMM`, `pctLeft(min)`, `pctWidth(startMin, endMin)`, `computeGaps` (kopia z day-timeline, mała, lokalna — nie eksportujemy tam nic).
- Filtr wpisów: `appointments.filter(a => a.starts_at.startsWith(date))` — bo formularz operuje na łańcuchu `YYYY-MM-DD` a mocki mają ISO z lokalnym offsetem — zabezpieczenie: fallback na `format(parseISO(a.starts_at),"yyyy-MM-dd")` jeśli powyższe zawiedzie.
- Dostępność: strzałki mają `aria-label="Poprzedni dzień"` / „Następny dzień"; pasek `role="group" aria-label="Dostępność dnia HH:MM–HH:MM"`.

## Poza zakresem
- Drag do wyznaczania nowego terminu na pasku (tylko klik luki).
- Resize istniejących wpisów.
- Zmiany walidacji/zapisu, day-timeline, ekranów.
