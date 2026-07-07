## Zmiany

### 1) `src/components/add-appointment-dialog.tsx` — combobox pacjenta
Zamień `Select` pacjenta na Popover + Command (shadcn).

- Nowe importy: `Popover, PopoverContent, PopoverTrigger`, `Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem`, `ChevronsUpDown, Check` z `lucide-react`, `AddPatientDialog`.
- Nowy stan: `patientPickerOpen`, `patientQuery`, `addPatientOpen`.
- Trigger: `PopoverTrigger` z `Button variant="outline"` pełnej szerokości, `role="combobox"`, pokazuje "Wybierz pacjenta" lub `${last_name} ${first_name} — ${phone}`.
- `PopoverContent` z `className="p-0 w-[--radix-popover-trigger-width]"` — Command wewnątrz.
- `CommandInput` (autofocus domyślny w Command) z placeholderem "Szukaj pacjenta…", kontrolowany przez `patientQuery`.
- Filtrowanie własne (nie polegać na domyślnym `Command`, bo nie znormalizuje diakrytyków):
  - helper `normalize(s) = s.toLocaleLowerCase("pl").normalize("NFD").replace(/\p{Diacritic}/gu, "")`.
  - lista `filtered = patients.filter(p => { const q = normalize(query.trim()); if (!q) return true; return normalize(`${p.first_name} ${p.last_name} ${p.phone ?? ""}`).includes(q); })`.
  - `<Command shouldFilter={false}>` żeby wyłączyć wbudowane filtrowanie.
- `CommandList` z `className="max-h-64 overflow-y-auto"`.
- Każdy `CommandItem` z `value={p.id}` i `onSelect={() => { setPatientId(p.id); setPatientPickerOpen(false); setPatientQuery(""); }}`, treść: `{p.last_name} {p.first_name} — {p.phone}`, `Check` z `opacity-100/0` przy wybranym.
- `CommandEmpty`: tekst "Brak pacjentów" + `Button variant="outline" size="sm"` "Dodaj nowego pacjenta" → `setPatientPickerOpen(false); setAddPatientOpen(true);`.
- Renderowany `<AddPatientDialog open={addPatientOpen} onOpenChange={setAddPatientOpen} onCreated={(p) => { setPatientId(p.id); setAddPatientOpen(false); }} />` obok głównego Dialog.
- Etykieta zabiegu, tryb "family_only", walidacje, submit — bez zmian.

### 2) `src/components/add-patient-dialog.tsx` — callback po utworzeniu
- Dodać opcjonalny prop `onCreated?: (patient: Patient) => void`.
- W `submit`: `const created = addPatient(commonPatch); onCreated?.(created);` przed `onOpenChange(false)` (tylko w gałęzi tworzenia, nie edycji). Sygnatura `addPatient` już zwraca `Patient`.

### Poza zakresem
Etykieta zabiegu, tryb family_only, AvailabilityStrip, walidacje, RLS.
