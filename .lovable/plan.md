## Cel
Licznik zużycia SMS: kolumna `parts` w `messages_log`, RPC agregujący po miesiącach, cena netto w ustawieniach, karta na ekranie Wiadomości.

## 1. Baza (migracja)
- `ALTER TABLE public.messages_log ADD COLUMN parts smallint NOT NULL DEFAULT 1 CHECK (parts BETWEEN 1 AND 10);`
- `ALTER TABLE public.app_settings ADD COLUMN sms_price_net_gr integer NOT NULL DEFAULT 10 CHECK (sms_price_net_gr >= 0);`
- RPC `public.get_sms_monthly_stats(_months int DEFAULT 12)`:
  - `RETURNS TABLE(month date, messages_count bigint, parts_total bigint)`
  - `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`
  - Wewnątrz: `IF NOT public.has_role(auth.uid(),'therapist') THEN RAISE EXCEPTION 'forbidden'; END IF;`
  - Grupowanie po `date_trunc('month', coalesce(sent_at, created_at) AT TIME ZONE 'Europe/Warsaw')::date`, filtr `status IN ('sent','delivered','undelivered')`, zakres ostatnie `_months` miesięcy (włącznie z bieżącym), sort DESC, uzupełnianie brakujących miesięcy pustymi wierszami (0/0).
  - `GRANT EXECUTE ... TO authenticated;`

## 2. Endpoint PATCH `/api/public/messages-log/:id/result`
Plik: `src/routes/api/public/messages-log/$id.result.ts`
- W `ResultSchema` dodać `parts: z.number().int().min(1).max(10).optional()`.
- W bloku `if (payload.status === "sent")` zapisać `update.parts = payload.parts ?? 1` (dla statusu `failed` nie dotykamy).

## 3. Ustawienia terapeuty
Plik: `src/routes/_layout.ustawienia.tsx`, sekcja szablonów SMS (lub nowa mała sekcja "SMS — cena") — pole liczbowo w groszach.
- Rozszerzyć `AppSettings` w `src/lib/types.ts` o `sms_price_net_gr: number`.
- W `src/lib/store.ts` — mapowanie odczytu i `updateSettings` (już generyczne przez merge; sprawdzić SELECT/UPDATE payload).
- UI: `Input type="number" min=0 step=1` z etykietą "Cena netto za część SMS (gr)". Zapis natychmiastowy jak inne pola.

## 4. UI — ekran Wiadomości
Plik: `src/routes/_layout.wiadomosci.tsx`. Nad `<Tabs>` dodać nowy komponent lokalny `SmsUsageCard`:
- Wywołanie: `supabase.rpc("get_sms_monthly_stats", { _months: 12 })` w `useEffect`.
- Bieżący miesiąc = pierwszy wiersz (lub match po `date-fns startOfMonth`): pokaż `parts_total` części i koszt `parts_total * sms_price_net_gr / 100` sformatowany jak `"12,40 zł netto"` (`Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`).
- `<Collapsible>` "Poprzednie miesiące" (domyślnie zwinięte): lista pozostałych miesięcy — nazwa miesiąca po polsku (`format(date, "LLLL yyyy", { locale: pl })` z capitalize), liczba części, koszt.
- Dopisek `<p className="text-xs text-muted-foreground mt-2">Liczone wg części SMS; statusy wysłane i niedoręczone.</p>`
- Cena netto czytana z `useStore(s => s.settings.sms_price_net_gr)`.

## Poza zakresem
Eksport, wykresy, limity/alerty, zmiany w kolejce/triggerach.
