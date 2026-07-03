
# Fix: hydration mismatch na Dzisiaj/Kalendarz

## Przyczyna
`TodayPage` i `CalendarPage` liczą stan z `new Date()` i czytają zustand-owy store persystowany w localStorage. SSR renderuje z „innym teraz" i z initialnymi mockami, klient hydratuje z realnym czasem i danymi z localStorage → mismatch (np. sekcja „Następna wizyta" istnieje na serwerze, znika na kliencie).

## Zakres
Minimalna zmiana, tylko na dwóch ekranach które używają aktualnej daty + storeu:
- `src/routes/_layout.index.tsx`
- `src/routes/_layout.kalendarz.tsx`

Nie ruszamy Pacjentów, Wiadomości, Ustawień, nawigacji ani logiki DayTimeline.

## Rozwiązanie
Nowy mały hook `src/hooks/use-mounted.ts`:
```ts
import { useEffect, useState } from "react";
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
```

W obu ekranach: przed pierwszym mountem renderujemy tylko szkielet (nagłówek + puste kontenery z `min-height`), żeby SSR i pierwszy render klienta były identyczne. Po mountcie renderujemy właściwą treść zależną od `new Date()` / storeu.

```tsx
const mounted = useMounted();
// ...
return (
  <>
    <AppHeader ... />
    <PageContainer>
      {mounted ? <RealContent/> : <SkeletonPlaceholder/>}
    </PageContainer>
  </>
);
```

Header może pokazywać datę tylko po mountcie (np. subtitle=`mounted ? capitalize(fmtDateLong(today)) : ""`), żeby też nie wywoływał mismatchu.

## Poza zakresem
Zmiana strategii SSR (np. `ssr: false` na trasach) — zbyt szerokie. Podmiana zustand persist na inne rozwiązanie — niepotrzebne.
