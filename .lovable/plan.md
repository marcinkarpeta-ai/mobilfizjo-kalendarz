
# FizjoPlan — iteracja 1: szkielet UI bez backendu

## Zakres
Pełny szkielet aplikacji mobile-first w języku polskim, na mockach (dane w pamięci / localStorage). Bez Supabase, bez auth, bez webhooków — te dochodzą w kolejnych iteracjach. Wszystkie 5 ekranów nawigowalne, wyglądają docelowo.

## Design
- **Paleta Warm Sand**: `#faf8f5` (tło), `#f0ebe3` (karty/muted), `#c9b99a` (akcent/border), `#8b7355` (primary/foreground brązowy). Ciepła, przyjazna, nie-kliniczna.
- **Font**: Figtree (wąski, wysoki, pełne polskie znaki, czytelny na mobile). Załadowany przez `@fontsource-variable/figtree`. Ustawiony jako `--font-sans` w `@theme`.
- **Layout**: single-column, karty z zaokrągleniami, dużo oddechu, mobile-first (bazowo 375–430px, responsywnie do desktop).
- Wszystkie kolory jako tokeny w `src/styles.css` (light + dark). Zero hardcoded klas kolorów.

## Nawigacja
Dolny tab bar (mobile) z 5 sekcjami: **Dzisiaj / Kalendarz / Pacjenci / Wiadomości / Ustawienia**. Ikony z lucide-react. Aktywna zakładka podświetlona akcentem.

Routing TanStack (file-based) w `src/routes/`:
```
__root.tsx        → shell + <link> Figtree + <Outlet/>
_layout.tsx       → layout z bottom tab barem (public na razie)
_layout.index.tsx → /  Dzisiaj
_layout.kalendarz.tsx
_layout.pacjenci.tsx
_layout.pacjenci.$id.tsx  → karta pacjenta z zakładkami
_layout.wiadomosci.tsx
_layout.ustawienia.tsx
_layout.o-aplikacji.tsx
```
Każda trasa ma własne `head()` z polskim tytułem i meta description. Root ustawia globalny tytuł "FizjoPlan — kalendarz fizjoterapeuty".

## Ekrany (mocki)

### Dzisiaj (`/`)
- Nagłówek: dzisiejsza data po polsku ("piątek, 3 lipca 2026").
- Sekcja "Następna wizyta" — duża karta.
- Lista dzisiejszych wpisów chronologicznie: wizyty pacjentów + wydarzenia rodzinne, każde jako karta z godziną od–do, imieniem/etykietą, statusem.
- Wizyty odwołane wyszarzone z tagiem "Odwołana".
- Empty state gdy brak: "Dziś nic nie zaplanowano".
- FAB "+ Dodaj wpis" → dialog z wyborem typu (wizyta/wydarzenie rodzinne).

### Kalendarz
- Widok miesiąca (grid 7×n) + przełącznik miesiąca. Kropki na dniach z wpisami (kolor: wizyta vs rodzinne).
- Kliknięcie w dzień → lista wpisów tego dnia poniżej.
- Przycisk "+ Dodaj". Formularz z typem, datą, czasem od–do, pacjentem (jeśli wizyta), etykietą zabiegu (select z edytowalnej listy). Ostrzeżenie o nakładaniu (nie blokada).

### Pacjenci
- Lista z wyszukiwaniem po imieniu/telefonie. Karta pacjenta: imię, salutation, telefon, znaczniki zgód (obsługowa/marketingowa).
- Przycisk "+ Dodaj pacjenta" → formularz z walidacją zod (telefon wymagany, format PL, unikalny w mocku), salutation, data ur., dwie zgody z datami.
- Detal `/pacjenci/$id` z zakładkami: **Dane**, **Historia wizyt**, **Notatki i zdjęcia**.
  - Notatka powizytowa: textarea + placeholder na zdjęcia (uploader wyłączony w tej iteracji z tooltipem "Dostępne po włączeniu Cloud").
  - Baner ostrzegawczy gdy brak zgody obsługowej: "Brak zgody obsługowej — SMS-y nie będą wysyłane".

### Wiadomości
- Dwie zakładki: **Dziennik** i **Propozycje marketingowe**.
- Dziennik: lista wpisów `messages_log` (mock) — pacjent, typ (przypomnienie/potwierdzenie/marketing), status (pending/sent/failed), timestamp.
- Propozycje: karty z pacjentem, powodem (rocznica pierwszej wizyty / urodziny), podgląd treści z szablonu, przyciski **Zatwierdź** / **Odrzuć**.

### Ustawienia
- Sekcje: **Profil**, **Etykiety zabiegów** (CRUD listy w localStorage), **Szablony wiadomości** (edycja tekstu, placeholdery {salutation}, {data}, {godzina}), **Konto rodzinne** (przycisk "Zaproś żonę e-mailem" — na razie disabled z etykietą "Wymaga Cloud"), **O aplikacji** (link).
- Stopka: "Powered by Simple Fast AI".

### O aplikacji
- Krótki opis, wersja, przycisk **Udostępnij twórcę** (Web Share API / kopiuj link).
- Stopka "Powered by Simple Fast AI".

## Ekran logowania (atrapa)
`/auth` — formularz e-mail+hasło (nieaktywny, przycisk "Zaloguj" → przechodzi do `/`). Stopka "Powered by Simple Fast AI". Włączymy realny auth przy Cloud.

## Dane (mock)
- `src/lib/mock-data.ts` — kilka pacjentów, wizyt (w tym odwołane), wydarzeń rodzinnych, wpisów dziennika, propozycji marketingowych, szablonów.
- `src/lib/store.ts` — cienki store (Zustand albo React context + useReducer) z persystencją do localStorage, żeby CRUD "działał" wizualnie.
- Typy TS zgodne z docelowym modelem (03): `Patient`, `Appointment`, `VisitLabel`, `VisitNote`, `MessageLog`, `MarketingProposal`, `MessageTemplate` — dzięki temu przejście na Supabase w iteracji 2 to podmiana warstwy dostępu.

## Walidacja i i18n
- Zod na wszystkich formularzach, polskie komunikaty błędów.
- Wszystkie stringi UI po polsku, `date-fns` z locale `pl` do formatowania dat.

## Szczegóły techniczne
- Instalacje: `@fontsource-variable/figtree`, `date-fns`, `zod`, `react-hook-form`, `zustand` (jeśli nie ma).
- Zmiana tokenów w `src/styles.css` (light + dark), rejestracja `--font-sans: "Figtree Variable"`.
- `__root.tsx`: aktualny tytuł/meta na "FizjoPlan", `lang="pl"`.
- Trasy publiczne (brak `_authenticated`) — auth wejdzie w iteracji Cloud.
- Zero placeholder-src z `blank-app-v1.svg` — zastępujemy prawdziwym ekranem Dzisiaj.

## Poza zakresem tej iteracji (do kolejnych)
- Supabase: schemat DB (03), RLS dla ról therapist/family, auth e-mail, storage `patient-photos`, zaproszenia rodzinne.
- Webhooki n8n + HMAC (na razie zapis do `messages_log` ze statusem `pending`).
- Realny upload zdjęć i podpisane URL-e.
- Wysyłka SMS / marketing (po zatwierdzeniu → emisja zdarzenia).
