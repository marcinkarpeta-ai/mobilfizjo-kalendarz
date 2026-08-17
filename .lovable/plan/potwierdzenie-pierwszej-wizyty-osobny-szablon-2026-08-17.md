# Potwierdzenie pierwszej wizyty (osobny szablon)

Gdy pacjent nie ma żadnej innej wizyty (poza właśnie tworzoną) ze statusem `scheduled` lub `completed`, potwierdzenie SMS ma korzystać z nowego szablonu „Potwierdzenie — pierwsza wizyta”, edytowalnego w Ustawieniach jak każdy inny.

## Co się zmieni

1. Nowy rodzaj wiadomości `confirmation_first` w słowniku rodzajów.
2. Nowy wpis w szablonach wiadomości: treść jak dotychczasowe potwierdzenie plus drugie zdanie z adresem gabinetu, wpisanym na stałe w treści (bez placeholdera `{{address}}`) — Dawid edytuje adres w Ustawieniach.
3. Logika kolejkowania SMS przy tworzeniu wizyty: sprawdzenie, czy pacjent ma inną wizytę `scheduled`/`completed`; jeśli nie — użyty zostaje szablon pierwszej wizyty.
4. Ustawienia → Szablony wiadomości: nowa pozycja podpisana „Potwierdzenie — pierwsza wizyta”; licznik znaków i koszt działają automatycznie.
5. Ekran Wiadomości: dziennik pokazuje etykietę „Potwierdzenie — pierwsza wizyta”; filtr rodzaju „Potwierdzenie” obejmuje oba rodzaje potwierdzeń.

## Szczegóły techniczne

- Migracja A: `ALTER TYPE public.message_kind ADD VALUE 'confirmation_first';` (musi być osobną migracją — nowej wartości enuma nie da się użyć w tej samej transakcji).
- Migracja B:
  - `INSERT INTO public.message_templates(kind, body)` dla `confirmation_first` (treść wzorowana na obecnym `confirmation` + zdanie z adresem).
  - `CREATE OR REPLACE FUNCTION public.enqueue_visit_messages(...)`: przed wstawieniem potwierdzenia liczone jest
    `EXISTS (SELECT 1 FROM appointments WHERE patient_id = a.patient_id AND id <> a.id AND type = 'patient_visit' AND status IN ('scheduled','completed'))`;
    wynik decyduje, czy `kind` i `render_message_body` używają `confirmation` czy `confirmation_first`.
  - Przypomnienia i odwołania bez zmian.
- `src/lib/types.ts`: dodanie `"confirmation_first"` do `MessageKind`.
- `src/routes/_layout.ustawienia.tsx` i `src/routes/_layout.wiadomosci.tsx`: etykieta w `KIND_LABEL`; w `KIND_FILTERS` filtr „Potwierdzenie” = `["confirmation", "confirmation_first"]`.

## Poza zakresem

Zmiany w n8n, marketing, RLS, karta zużycia SMS.
