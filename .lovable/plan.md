# Natychmiastowy sygnał wysyłki SMS + świeże dane na ekranie Wiadomości

## 1. Endpoint sygnału dla zalogowanych

Nowa trasa serwerowa `POST /api/internal/ping-dispatch`:
- weryfikuje sesję użytkownika po tokenie z nagłówka `Authorization` (klient Supabase z tokenem, `auth.getUser()`),
- sprawdza rolę w `profiles`: dozwolone `therapist`, `family`, `admin`; brak sesji lub roli → 401,
- wywołuje `pingInstantWebhook()` z `src/lib/booking.server.ts` (import wewnątrz handlera),
- zwraca `{ ok: true }`.

## 2. Wywołanie z aplikacji terapeuty

W `src/lib/store.ts`, w akcjach `addAppointment`, `cancelAppointment`, `updateAppointment` — po pomyślnym zapisie do bazy (bez błędu) wywołanie pomocnika `pingDispatch()`:
- `fetch("/api/internal/ping-dispatch", { method: "POST", headers: { Authorization: Bearer <token z bieżącej sesji> } })`,
- fire-and-forget, wszystkie błędy wyciszone (`.catch(() => {})`), brak wpływu na UI i brak `await` blokującego akcję.

## 3. Rezerwacja online

W `src/routes/api/booking/create.ts`, po pomyślnym `book_online_appointment`, przed zwróceniem odpowiedzi: `await pingInstantWebhook()` (funkcja sama łyka błędy i ma 3 s timeout).

## 4. Świeże dane na ekranie Wiadomości

W `src/routes/_layout.wiadomosci.tsx`:
- wspólna funkcja odświeżająca pobiera ponownie `messages_log` (sortowanie jak w starcie aplikacji) oraz wiersz `app_settings` (saldo SMS, cena) i wpisuje wynik do store'a przez `_hydrate` (tylko te dwa fragmenty stanu, reszta bez zmian),
- uruchamiana przy każdym wejściu na ekran (`useEffect` przy montowaniu komponentu),
- dyskretny przycisk przy nagłówku dziennika: ikona odświeżania, `aria-label="Odśwież"`, wariant ghost, w trakcie pobierania ikona wiruje i przycisk jest wyłączony.

Bez realtime, bez cyklicznego odpytywania.

## Poza zakresem
n8n, szablony wiadomości, marketing, RLS, migracje bazy.
