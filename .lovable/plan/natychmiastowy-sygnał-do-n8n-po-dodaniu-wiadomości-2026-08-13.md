# Natychmiastowy sygnał do n8n po dodaniu wiadomości

## 1. Nowy sekret

Poproszę o `N8N_INSTANT_WEBHOOK_URL` (adres webhooka n8n wywoływanego natychmiast po dodaniu wiadomości do kolejki).

## 2. `/api/booking/request-code`

Bezpośrednio po pomyślnym wstawieniu wiersza `booking_code` do `messages_log`:

- `POST` na adres z sekretu, bez treści,
- timeout 3 s (`AbortSignal.timeout(3000)`),
- brak `await` blokującego odpowiedź / błąd wyciszony `catch` — endpoint zawsze zwraca to samo `{ok:true}`,
- gdy sekret nie jest ustawiony, wywołanie jest pomijane.

Pomocnik: `pingInstantWebhook()` w `src/lib/booking.server.ts` (plik server-only), używany przez endpoint.

## 3. Wiadomości `confirmation` — punkt pominięty

Wiadomości `confirmation` (oraz przypomnienia i odwołania) powstają **w bazie danych**, w triggerze `appointments_after_insert_messages` → funkcja `enqueue_visit_messages`. To jest trigger bazodanowy, więc zgodnie z Twoim poleceniem **pomijam ten punkt** i nie dodaję tam wywołania webhooka.

Do ewentualnego osobnego kroku (nie robię tego teraz): sygnał można wysyłać z aplikacji po zapisie wizyty (`src/lib/store.ts`) albo rozszerzeniem bazy o `pg_net`/`pg_cron`.

## Szczegóły techniczne

- Zmieniane pliki: `src/lib/booking.server.ts` (nowy helper), `src/routes/api/booking/request-code.ts` (jedno wywołanie).
- `process.env['N8N_INSTANT_WEBHOOK_URL']` czytany wewnątrz handlera.
- Brak zmian w bazie danych, UI i pozostałych endpointach.
