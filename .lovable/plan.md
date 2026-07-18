## Cel

Nowy publiczny endpoint dla n8n zwracający dzienne podsumowanie (wizyty + wydarzenia rodzinne) dla wskazanego dnia w strefie Europe/Warsaw.

## Zakres

Jeden nowy plik route, bez zmian w RLS, UI, typach ani innych endpointach.

- Nowy plik: `src/routes/api/public/daily-digest.ts`
- Autoryzacja: `verifyN8nBearer` z `@/lib/n8n-auth.server` (identycznie jak w `messages-log/*`)
- Dostęp do danych: `supabaseAdmin` z `@/integrations/supabase/client.server` ładowany dynamicznie wewnątrz handlera (route pliki są w client-graph)

## Kontrakt

`GET /api/public/daily-digest?date=YYYY-MM-DD`

- Nagłówek: `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
- `date` opcjonalny; brak parametru → jutro wg `Europe/Warsaw`
- Walidacja formatu daty (regex `^\d{4}-\d{2}-\d{2}$`); zły format → 400
- Zły/brak nagłówka → 401 (przez helper)

Odpowiedź 200 JSON:

```json
{
  "date": "2026-07-19",
  "visits": [
    { "starts_at": "...", "ends_at": "...", "patient_name": "Jan Kowalski", "phone": "+48...", "salutation": "Pan Jan", "label": "Terapia manualna" }
  ],
  "family_events": [
    { "starts_at": "...", "ends_at": "...", "title": "..." }
  ]
}
```

## Logika

1. Weryfikuj bearer → jeśli błąd, zwróć 401 z helpera.
2. Wyznacz granice dnia w Europe/Warsaw:
   - Zakres `[startUtc, endUtc)` obliczony jako `YYYY-MM-DDT00:00:00+02:00`/`+01:00` z uwzględnieniem DST. Realizacja: użyć `Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', timeZoneName: 'longOffset' })` do wyznaczenia offsetu dla wskazanej daty, następnie zbudować ISO z offsetem, `+1 day` na koniec.
   - Domyślne "jutro": bieżąca data w Europe/Warsaw + 1 dzień.
3. Zapytania przez `supabaseAdmin` (bez RLS):
   - `appointments` gdzie `status = 'scheduled'`, `starts_at >= start`, `starts_at < end`, kolejność `starts_at asc`, z joinem `patients(first_name,last_name,salutation,phone)` i `visit_labels(name)`.
   - Filtr po `type`: `patient_visit` → `visits`, `family_event` → `family_events`.
4. Mapowanie:
   - `patient_name` = `formatPatientName` (lub inline: `first_name + last_name`, oba mogą być null); telefon i salutacja bez zmian.
   - `label` = `visit_labels.name` lub `null`.
   - `title` dla `family_events` = `appointments.title` lub `null`.
5. `Response.json({ date, visits, family_events })`.

## Bez zmian

- Brak migracji, brak zmian w RLS, w UI, w typach, w istniejących endpointach.
- Sekret `N8N_WEBHOOK_SECRET` już skonfigurowany.
