Naprawa nadpisywania stanu w formularzu edycji wizyty (`src/components/add-appointment-dialog.tsx`).

### Problem
`defaultDate = new Date()` w destrukturyzacji propsów tworzy nowy obiekt przy każdym renderze. Efekt inicjalizujący pola formularza ma `defaultDate` w zależnościach, więc po każdej ręcznej zmianie daty/godziny efekt nadpisuje stan wartościami pierwotnymi.

### Zmiany (tylko w `src/components/add-appointment-dialog.tsx`)
1. Usunąć domyślną wartość `new Date()` z destrukturyzacji propsa `defaultDate`.
2. Zmienić zależności efektu inicjalizującego na `[open]`.
   - Wartości `editing`, `defaultDate`, `defaultStart`, `defaultEnd` czytać wewnątrz efektu przez refy lub bezpośrednio z propsów.
   - Dodać komentarz `// eslint-disable-next-line react-hooks/exhaustive-deps` z uzasadnieniem, że inicjalizacja ma nastąpić tylko przy otwarciu okna.
   - Fallback `new Date()` zastosować wewnątrz efektu, gdy `defaultDate` nie zostało przekazane.
3. Zweryfikować, że wyliczanie kolizji (`overlapping`) i komponent `AvailabilityStrip` nadal reagują na zmiany pól formularza.

### Weryfikacja
- Ręczna zmiana daty/godziny w formularzu edycji pozostaje zmieniona.
- Otwarcie okna dialogowego nadal wypełnia początkowe wartości.
- Pasek dostępności i ostrzeżenie o kolizji działają po zmianach.