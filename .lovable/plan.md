## 1. Baza
Migracja: do `public.app_settings` dodać
- `sms_balance_full integer`
- `sms_balance_pln numeric(10,2)`
- `sms_balance_updated_at timestamptz`

Wszystkie NULL-owalne (brak danych = wiersz ukryty). Bez zmian w RLS — tabela już ma politykę tylko dla terapeuty; zapis z endpointu idzie kluczem serwisowym.

## 2. Endpoint
Nowy plik `src/routes/api/public/sms-balance.ts` (`createFileRoute`, handler `POST`):
- autoryzacja `verifyN8nBearer` z `src/lib/n8n-auth.server.ts` (jak pozostałe endpointy),
- walidacja Zod: `{ full: int >= 0, balance_pln: number >= 0 }`,
- `supabaseAdmin` (import dynamiczny w handlerze) → update jedynego wiersza `app_settings`: `sms_balance_full`, `sms_balance_pln`, `sms_balance_updated_at = now()`,
- odpowiedź `{ ok: true }`; błąd walidacji → 400, brak wiersza ustawień → 500 z krótkim komunikatem.

## 3. UI
- `src/lib/types.ts`: `AppSettings` + `sms_balance_full: number | null`, `sms_balance_pln: number | null`, `sms_balance_updated_at: string | null`.
- `src/lib/store.ts`, `src/components/data-sync.tsx`: dopisać te pola do wartości domyślnych i hydracji z `app_settings` (bez zmian w zapisie ustawień z UI).
- `src/components/sms-usage-card.tsx`: pod blokiem bieżącego miesiąca, gdy `sms_balance_updated_at` i `sms_balance_full` istnieją:
  - `Pozostało na koncie: {full} SMS-ów ({balance_pln} zł)` (format `pl-PL`, 2 miejsca),
  - pod spodem `text-xs`: `stan na {dd.MM.yyyy, HH:mm}`,
  - gdy starsze niż 48 h: dopisek na żółto (`text-yellow-700 dark:text-yellow-300`) `stan może być nieaktualny`.
  Karta jest już widoczna tylko na ekranie Wiadomości (rola therapist), więc dodatkowe warunki roli nie są potrzebne.

## Poza zakresem
Alerty, wykresy, zmiany w liczeniu zużycia i cenie SMS.
