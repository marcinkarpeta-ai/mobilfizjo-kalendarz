## Zakres
Dwie zmiany UI dotyczące SMS-ów. Bez zmian w bazie, RPC ani logice zapisu `parts`.

## 1. Licznik znaków w edytorze szablonów
Plik: `src/routes/_layout.ustawienia.tsx` (sekcja edycji szablonów wiadomości).

Nowy helper `src/lib/sms.ts`:
- `GSM_BASIC_CHARS` — zestaw znaków GSM 03.38 (litery ASCII bez PL, cyfry, spacja, podstawowa interpunkcja, `@£$¥èéùìòÇØøÅå…`) + znaki „rozszerzenia" liczące się podwójnie (`^{}\[~]|€`).
- `isGsm7(text)` — wszystkie znaki należą do zbioru GSM.
- `gsmLength(text)` — długość z uwzględnieniem podwójnego kosztu znaków rozszerzenia.
- `smsSegments(text)` — zwraca `{ encoding: 'gsm'|'ucs2', length, segments, perSegment, singleLimit }`. Progi: GSM 160/153, UCS-2 70/67. 1 segment gdy `length <= singleLimit`, w innym wypadku `ceil(length / perSegment)`.
- `renderPreview(body, longestSalutation)` — podstawia:
  - `{{date}}` → `"29.07.2026"`
  - `{{time}}` → `"20:00"`
  - `{{ics_link}}` → `""`
  - `{{salutation}}` → `longestSalutation`

Wybór `longestSalutation`:
- Czytany z `useStore(s => s.patients)`: najdłuższy niepusty `salutation.trim()` (porównanie po `length`).
- Fallback: `"Panie Mieczysławie"`.

UI pod każdym `<Textarea>` szablonu (dla każdego z 6 rodzajów `MessageKind`):
- Wiersz: `Podgląd: {length} znaków · {segments} SMS · ~{cost} zł netto` (koszt = `segments * sms_price_net_gr / 100`, format `pl-PL` z 2 miejscami + `" zł netto"`).
- Gdy `segments > 1`: kontener licznika `bg-yellow-100 text-yellow-900 border-yellow-300` (dark: `bg-yellow-500/15 text-yellow-200 border-yellow-500/40`) + tekst: `"Ta treść wyśle się jako {segments} SMS-y — podwójny koszt. Skróć do {singleLimit} znaków, aby zmieścić w jednym."` (`singleLimit` = 70 lub 160 zależnie od kodowania).
- Zawsze pod spodem drobnym drukiem `text-xs text-muted-foreground`: `"Polskie znaki skracają limit ze 160 do 70 znaków."`

Licznik reaguje na żywo (już zarządzany stan `templates[kind]` w edytorze — wystarczy `useMemo` po `body`, `longestSalutation`, `sms_price_net_gr`).

## 2. Etykiety „SMS-ów"
- `src/components/sms-usage-card.tsx`:
  - Zamień „część"/„części" na `"SMS"` / `"SMS-ów"` (1 → `"SMS"`, inaczej `"SMS-ów"`) w nagłówku bieżącego miesiąca i w liście „Poprzednie miesiące".
  - Zmień dopisek na: `"Dłuższe wiadomości liczą się jako kilka SMS-ów."` (zamiast „Liczone wg części SMS…").
- `src/routes/_layout.ustawienia.tsx`:
  - Etykieta pola ceny → `"Cena netto za 1 SMS (gr)"`.
  - Podpowiedź pod polem: zostaw jak jest lub uspójnij („Używane do wyliczania szacunkowego kosztu w karcie „Zużycie SMS".").

Bez zmian w kolumnie `messages_log.parts`, w RPC `get_sms_monthly_stats` ani w endpoint `PATCH …/result`.

## Poza zakresem
- Zmiany w bazie, migracje, RLS.
- Zmiana sposobu liczenia `parts` po stronie n8n / endpointu.
- Walidacja/limity długości blokujące zapis szablonu.
