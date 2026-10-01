# SMS o zmianie terminu wizyty

Po przesunięciu godziny/daty zaplanowanej wizyty pacjent (ze zgodą obsługową) dostaje SMS „Zmiana terminu”. Jeśli potwierdzenie umówienia jeszcze nie wyszło (status oczekuje), tylko odświeżana jest jego treść, bez dodatkowego SMS-a.

## Co się zmieni

1. Nowy rodzaj wiadomości `reschedule`.
2. Nowy szablon: „{{salutation}}, zmiana terminu- zapraszam {{date}} o {{time}}.”, edytowalny w Ustawieniach.
3. Przy zmianie terminu wizyty: SMS o zmianie terminu, chyba że potwierdzenie nadal czeka w kolejce. Przypomnienia przeliczane jak dotąd.
4. Ustawienia → Szablony: pozycja „Zmiana terminu” z licznikiem znaków.
5. Wiadomości: etykieta „Zmiana terminu” w dzienniku i osobna pozycja „Zmiana terminu” w filtrze rodzaju.

## Szczegóły techniczne

- Migracja A (osobna): `ALTER TYPE public.message_kind ADD VALUE IF NOT EXISTS 'reschedule';`
- Migracja B (tylko dodająca):
  - `INSERT INTO public.message_templates(kind, body) SELECT 'reschedule', '...' WHERE NOT EXISTS (...)`.
  - `CREATE OR REPLACE FUNCTION public.tg_appointments_after_update_messages()` — kopia obecnej funkcji; w gałęzi `NEW.status='scheduled' AND starts_at zmienione`, po istniejących UPDATE-ach:
    `IF has_consent AND NOT EXISTS (SELECT 1 FROM messages_log WHERE appointment_id=NEW.id AND status='pending' AND kind IN ('confirmation','confirmation_first')) THEN INSERT ... kind 'reschedule', status 'pending', scheduled_at now(), body render_message_body('reschedule', NEW.patient_id, NEW.starts_at)`.
  - Ważne: sprawdzenie EXISTS musi odbyć się zanim cokolwiek zmieni status potwierdzenia (istniejący re-render nie zmienia statusu, więc kolejność jest bezpieczna).
- `src/lib/types.ts`: `"reschedule"` w `MessageKind`.
- `src/routes/_layout.wiadomosci.tsx`: `KIND_LABEL.reschedule = "Zmiana terminu"`; nowy wpis w `KIND_FILTERS` `{ value: "reschedule", label: "Zmiana terminu", kinds: ["reschedule"] }`.
- `src/routes/_layout.ustawienia.tsx`: etykieta w mapie szablonów (licznik działa automatycznie).
- Natychmiastowa wysyłka: istniejący sygnał ping-dispatch po aktualizacji wizyty już obejmuje nową wiadomość.

## Poza zakresem

Przypomnienia, odwołania, n8n, zmiany tabel/kolumn.
