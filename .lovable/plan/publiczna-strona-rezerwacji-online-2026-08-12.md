# Publiczna strona rezerwacji online

Dokładam publiczny kreator rezerwacji, endpoint tworzący wizytę oraz oznaczenie „Rezerwacja online” w aplikacji terapeuty. Istniejące endpointy `/api/booking/request-code`, `/verify`, `/slots` zostają bez zmian.

## 1. Migracja (tylko dodawanie)

- `appointments`: nowa kolumna `booked_online boolean NOT NULL DEFAULT false`.
- Funkcja SECURITY DEFINER `book_online_appointment(_patient_id, _visit_label_id, _starts_at, _ends_at)`:
  - blokuje równoległe rezerwacje (advisory lock na terapeucie),
  - ponownie sprawdza, czy okno nie nakłada się z żadną wizytą/wydarzeniem o statusie `scheduled`,
  - przy kolizji zgłasza błąd `slot_taken`,
  - w przeciwnym razie wstawia wizytę (`patient_visit`, `scheduled`, `booked_online = true`) i zwraca jej id.
  - Wstawienie idzie zwykłym `INSERT`-em, więc istniejący trigger kolejki SMS (potwierdzenie + przypomnienia) zadziała normalnie.

Żadna istniejąca kolumna ani polityka nie jest zmieniana.

## 2. Endpoint POST `/api/booking/create`

Wejście: `{ token, service_id, starts_at }` (walidacja zod).

Kolejno: weryfikacja tokenu sesji (`booking_sessions`, `verified`, nieprzeterminowany) → sprawdzenie `booking_enabled` → sprawdzenie pacjenta (aktywna zgoda `booking_consent_at`, nie zarchiwizowany) → sprawdzenie usługi (`bookable = true`) → policzenie `ends_at` z `duration_minutes` → sprawdzenie, że termin mieści się w godzinach pracy, poza dniami wolnymi i w oknie `booking_min_hours_ahead` / `booking_days_ahead` (ta sama logika co `slots`) → wywołanie funkcji bazodanowej.

Odpowiedzi: `{ ok: true, starts_at, ends_at }`, przy kolizji `409 { error: "slot_taken" }` (front pokazuje „Termin właśnie został zajęty”), przy braku sesji `401`.

Dodatkowo endpoint `POST /api/booking/services { token }` zwracający usługi z `bookable = true` (nazwa, czas, cena, opis) — publiczna strona nie ma dostępu do bazy bez logowania.

## 3. Strona `/rezerwacja`

Nowa trasa `src/routes/rezerwacja.tsx` (poza `_layout`, bez wymogu logowania, `ssr: false`), mobile-first, tokeny wyglądu jak w aplikacji, na dole `PoweredByFooter`.

```text
krok 1  telefon + krótka informacja o przetwarzaniu danych i odnośnik do klauzuli
krok 2  6-cyfrowy kod z SMS; „Wyślij ponownie” aktywne po 60 s (licznik)
krok 3  wybór usługi (nazwa, czas, cena) → lista wolnych terminów pogrupowana
        po dniach, przewijanie kolejnych dni w zakresie booking_days_ahead
krok 4  podsumowanie (usługa, data, godzina, czas trwania, cena) + „Rezerwuję”
potwierdzenie: termin + informacja, że SMS z potwierdzeniem już leci
```

- Token sesji trzymany tylko w pamięci komponentu (bez localStorage); po wygaśnięciu powrót do kroku 1 z komunikatem.
- Krok 1 zawsze pokazuje ten sam komunikat sukcesu, niezależnie od tego, czy numer jest w kartotece.
- `booking_enabled = false`: cała strona pokazuje „Rezerwacje online są chwilowo niedostępne” (sprawdzane lekkim publicznym endpointem statusu).
- Metadane trasy: własny tytuł i opis, `robots: noindex` jak na ekranie logowania.

## 4. Oznaczenie w aplikacji terapeuty

- `booked_online` dodane do typu `Appointment`, mapowania w `data-sync.tsx` i store’a.
- Oś dnia: dyskretna ikonka/kropka przy wizycie zarezerwowanej online.
- Arkusz szczegółów wizyty: wiersz „Rezerwacja online”.

## Szczegóły techniczne

- Nowe pliki: `src/routes/rezerwacja.tsx`, `src/routes/api/booking/create.ts`, `src/routes/api/booking/services.ts`, `src/routes/api/booking/status.ts`, komponenty kroków w `src/components/booking/*`.
- Wspólna logika terminów (godziny pracy, dni wolne, wyprzedzenie) wydzielona z `slots.ts` do `src/lib/booking.server.ts`, aby `create.ts` walidował identycznie.
- Klient serwisowy ładowany wewnątrz handlerów (`await import("@/integrations/supabase/client.server")`).
- Endpointy nie zwracają żadnych danych pacjentów.
