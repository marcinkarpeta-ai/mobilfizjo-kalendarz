## Zakres
Podgląd (dolny arkusz) i edycja wpisu kalendarza. Frontend + jedna metoda store'a. Bez zmian w RLS/migracjach.

## 1) Store — `src/lib/store.ts`

- Dodać `updateAppointment(id: string, patch: Partial<Pick<Appointment, "starts_at" | "ends_at" | "visit_label_id" | "title">>) => void`. Optymistyczna aktualizacja lokalna + `supabase.from("appointments").update({ ... }).eq("id", id)`; rollback do poprzedniego stanu przy błędzie (jak `renameLabel`). Null-owanie: `visit_label_id ?? null`, `title ?? null`.
- Dodać `deleteAppointment(id: string) => void` (dla wydarzeń rodzinnych). Optymistyczny remove + `.delete().eq("id", id)`; rollback (re-insert do lokalnego stanu) przy błędzie. Interfejs `StoreState` uzupełnić o obie metody.

## 2) `src/components/appointment-details-sheet.tsx` (nowy)

Komponent oparty o `Sheet` z `side="bottom"`.
Props: `appt: Appointment | null`, `onOpenChange(v)`, `onEdit(appt)`.
Wewnątrz czyta `patients`, `labels` ze store'u. `role = useStore(s => s.role)`.

Zawartość:
- Nagłówek: dla wizyty `${first_name} ${last_name}` (lub "Pacjent"), dla wydarzenia `appt.title ?? "Wydarzenie rodzinne"`.
- Metadane: data (`format(..., "EEEE, d MMMM yyyy", { locale: pl })`), godziny `HH:mm–HH:mm`, dla wizyty: etykieta zabiegu, status (`Zaplanowana | Odwołana | Zakończona`).
- Akcje (przyciski w stacku):
  - Wizyta niezakończona/nieodwołana (therapist): `Karta pacjenta` (Link do `/pacjenci/$id`), `Edytuj` → `onEdit(appt); onOpenChange(false)`, `Odwołaj wizytę` (destructive) w `AlertDialog` z potwierdzeniem `"Odwołać tę wizytę?"` → `cancelAppointment(id)`.
  - Wizyta odwołana: tylko `Karta pacjenta`. Zakończona: `Karta pacjenta` (brak edit/cancel).
  - Wydarzenie rodzinne: `Edytuj` + `Usuń` (AlertDialog "Usunąć wydarzenie?") → `deleteAppointment(id)`.
  - Rola `family` widzi tylko akcje wydarzeń rodzinnych (dla wizyty arkusz i tak nigdy nie wystartuje — patrz niżej).

## 3) `src/components/add-appointment-dialog.tsx` — tryb edycji

- Nowy prop `editing?: Appointment | null`. Gdy niepusty i `open`, dialog działa w trybie edycji.
- W `useEffect` przy `open` hydratować pola z `editing`: `type`, `date = format(parseISO(starts_at), "yyyy-MM-dd")`, `start/end` = godziny, `patientId`, `labelId`, `title`. Bez `editing` — dotychczasowe defaulty.
- Tytuł dialogu: "Edytuj wpis" vs "Nowy wpis". Opis dopasowany.
- Ukryć `Tabs` przełącznika typu w edycji (typ nieedytowalny).
- Pacjent w edycji (wizyta): zamiast Popovera renderować statyczny wiersz `Input readOnly` z `"${last_name} ${first_name} — ${phone}"` + drobny tekst pod polem: `"Pomyłka w pacjencie? Odwołaj wizytę i umów nową."`. Bez skrótu "Dodaj pacjenta".
- Etykieta zabiegu / data / godziny — bez zmian, `AvailabilityStrip` i ostrzeżenie o kolizji działają jak dziś. `overlapping` w edycji: pomijać w wykrywaniu sam edytowany wpis (`a.id !== editing.id`).
- `submit`: gdy `editing`, wywołać `updateAppointment(editing.id, { starts_at, ends_at, visit_label_id: type === "patient_visit" ? labelId || undefined : undefined, title: type === "family_event" ? (title || "Wydarzenie rodzinne") : undefined })` zamiast `addAppointment`. Toast "Wpis zapisany."
- Gdy `editing`, `patient_id` walidacja pomijana (bo readonly z istniejącej wartości).

## 4) `src/components/appointment-card.tsx`

- Usunąć wewnętrzny `<Link>` do karty pacjenta.
- Nowy prop `onSelect?: (appt: Appointment) => void`. Owijka: `button type="button"` z `onClick={() => onSelect?.(appt)}`, `className="block w-full text-left"`; gdy brak `onSelect` (albo `familyView && isPatient`) — nadal renderować `div` (bez interakcji).
- Cancelled: nadal klikalny → arkusz pokaże akcje read-only (Karta pacjenta).

## 5) `src/components/day-timeline.tsx`

- Nowy prop `onSelectAppointment?: (appt: Appointment) => void`.
- Zastąpić wewnętrzny `<Link>` w bloku wizyty przyciskiem `<button type="button" onClick={() => onSelectAppointment?.(appt)} className="absolute inset-0 pl-2 text-left">`. Dotyczy również wizyt anulowanych (klik otwiera arkusz, ale sam blok pozostaje wizualnie wygaszony — usunąć `pointer-events-none` dla cancelled i pozostawić tylko `opacity-40`). Family view + wizyta pacjenta: nadal bez `onClick` (blok "Zajęte", nieklikalny). Bloki `busyBlocks` — bez zmian, nieklikalne.
- `family_event`: także klikalny przez `<button>`.

## 6) Strony — `_layout.kalendarz.tsx` i `_layout.index.tsx`

- Stan: `const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);` `const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);`.
- Przekazać `onSelectAppointment={setDetailsAppt}` do `DayTimeline`; `renderItem` / mapa kart → `onSelect={setDetailsAppt}` do `AppointmentCard`.
- Family (`isFamily`): przekazywać `onSelectAppointment` tylko dla `family_event` (w `_layout.index.tsx` już filtruje pacjentów; w `DayTimeline` wrapper otrzyma callback opakowany: `(a) => { if (isFamily && a.type !== "family_event") return; setDetailsAppt(a); }`).
- Renderować `<AppointmentDetailsSheet appt={detailsAppt} onOpenChange={(v) => !v && setDetailsAppt(null)} onEdit={(a) => { setDetailsAppt(null); setEditingAppt(a); }} />`.
- Wykorzystać istniejący `<AddAppointmentDialog>`: albo dodać drugą instancję dla edycji (`open={!!editingAppt}`, `onOpenChange={(v) => !v && setEditingAppt(null)}`, `editing={editingAppt}`, `mode={editingAppt?.type === "family_event" ? "family_only" : "full"}`), albo współdzielić — czytelniej druga instancja.

## Poza zakresem
Notatki, SMS/zdarzenia, siatka miesiąca, zmiany polityk RLS, edycja pacjenta z arkusza.
