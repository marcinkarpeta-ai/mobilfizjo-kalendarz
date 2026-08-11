# Krok przygotowawczy do rezerwacji online

Wyłącznie warstwa danych, ustawienia i endpointy dla pacjentów. Bez publicznej strony rezerwacji i bez tworzenia samych rezerwacji.

## 1. Migracja (tylko dodawanie)

- `patients`: nowe kolumny `booking_consent_at`, `booking_consent_changed_at` (timestamptz).
- `app_settings`: `booking_enabled` (bool, domyślnie false), `booking_days_ahead` (int, 14), `booking_min_hours_ahead` (int, 12).
- Enum rodzajów wiadomości: nowa wartość `booking_code`; nowy szablon w `message_templates`: „Twój kod do rezerwacji: {{code}}. Ważny 10 minut.”
- Nowa tabela `booking_sessions`: id, phone, code_hash, patient_id, expires_at, verified, attempts, created_at, token_hash. Bez dostępu dla ról aplikacji (RLS włączone, brak polityk, brak grantów dla anon/authenticated; tylko service_role).
- Funkcje SECURITY DEFINER obsługujące żądanie kodu, weryfikację i pobranie wolnych terminów po stronie bazy tam, gdzie to naturalne; endpointy korzystają z klucza serwisowego.

Żadna istniejąca kolumna nie jest zmieniana ani usuwana.

## 2. Zgoda „Samodzielna rezerwacja”

- Formularz pacjenta: trzeci przełącznik obok zgody obsługowej i marketingowej, z datą wyrażenia zgody; zmiana zapisuje `booking_consent_changed_at`.
- Karta pacjenta: wiersz zgody z datą, identycznie jak pozostałe.
- Lista pacjentów: plakietka „Rezerwacje” analogiczna do „Marketing”.

## 3. Ustawienia terapeuty — sekcja „Rezerwacje online”

- Główny wyłącznik `booking_enabled`.
- „Ile dni w przód” (`booking_days_ahead`).
- „Minimalne wyprzedzenie (godz.)” (`booking_min_hours_ahead`).

## 4. Endpointy dla pacjentów (`/api/booking/*`)

Autoryzacja własna (kod SMS + token sesji), nie sekret n8n.

**a) POST /api/booking/request-code `{phone}`**
Normalizuje numer, sprawdza `booking_enabled` i istnienie pacjenta z aktywną zgodą. Zawsze zwraca `{ok:true}`. Gdy warunki spełnione: 6-cyfrowy kod, zapis wyłącznie skrótu, ważność 10 minut, wiersz w kolejce wiadomości (`booking_code`, pending). Limit 3 kody na numer na dobę.

**b) POST /api/booking/verify `{phone, code}`**
Porównanie skrótu, maksymalnie 5 prób, po sukcesie token sesji ważny 30 minut (w bazie tylko skrót tokenu).

**c) POST /api/booking/slots `{token, service_id, date_from, date_to}`**
Zwraca wyłącznie godziny — zero danych pacjentów.

Reguła terminów dla każdego dnia w zakresie:

```text
dzień zamknięty lub wolny (blocks_booking) -> pomijany
dzień z wpisami:
  kandydaci = koniec każdej wizyty/wydarzenia, koniec+40 min, koniec+60 min
dzień pusty:
  kandydaci = otwarcie, otwarcie+40, otwarcie+60, ... (krok 40 i 60 min)
  tylko w pierwszych 2 godzinach pracy
warunek: cały czas trwania usługi mieści się przed kolejnym zajętym blokiem
         i przed końcem godzin pracy
zakres: od teraz + booking_min_hours_ahead do dziś + booking_days_ahead
```

Cofnięcie zgody „Samodzielna rezerwacja” unieważnia natychmiast aktywne sesje pacjenta — sprawdzane przy każdym wywołaniu `slots`.

## Szczegóły techniczne

- Trasy: `src/routes/api/booking/request-code.ts`, `verify.ts`, `slots.ts` (handlery serwerowe, klient serwisowy ładowany wewnątrz handlera).
- Walidacja wejścia przez zod; normalizacja numeru przez istniejącą funkcję `canonical_phone`.
- Skróty kodu i tokenu liczone SHA-256 z solą po stronie serwera; kod i token nigdy nie trafiają do bazy jawnie.
- Zakres dnia i status dnia liczone tą samą logiką co `src/lib/working-hours.ts` (godziny pracy + dni wolne), po stronie serwera.
- Aktualizacja `src/lib/types.ts`, `src/lib/store.ts`, `src/components/data-sync.tsx` o nowe pola zgody i ustawień.
