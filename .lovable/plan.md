## Cel
Przebudować kartę pacjenta na liście `/pacjenci` na pionowy układ mobile-first. Zmiany wyłącznie w `src/routes/_layout.pacjenci.index.tsx` (prezentacja). Bez zmian logiki store'a, walidacji, RLS ani innych ekranów.

## Nowy układ karty (od góry do dołu)

1. **Wiersz 1 — Imię i nazwisko**: pełna szerokość, `text-base font-semibold`, `break-words`, `line-clamp-2` (bez `truncate`, bez wielokropka jednoliniowego). Dozwolone zawinięcie do dwóch linii.
2. **Wiersz 2 — Kontekst**: pełna szerokość, `text-sm text-muted-foreground`, `break-words`. Format: `{salutation || "—"} · {phone}`. Bez `truncate`.
3. **Wiersz 3 — Plakietki statusów** (`flex flex-wrap gap-1 justify-start`):
   - Kolejność: **Brak zgody** (destructive, jeśli `!service_consent_at` i nie zarchiwizowany) → **Obsługowa** (secondary, jeśli `service_consent_at`) → **Marketing** (outline, jeśli `marketing_consent_at`) → **Zarchiwizowany** (outline, jeśli dotyczy).
   - Zbiorcza plakietka **Uzupełnij braki (N)** (outline amber) — pokazywana gdy `N > 0`, gdzie N liczy: brak imienia+nazwiska (`isPatientNameIncomplete`) jako 1 brak, brak `salutation` jako 1 brak. Kliknięcie: `onClick` z `e.preventDefault(); e.stopPropagation();` otwiera `setEditingPatient(p)`. `role="button"`, `tabIndex={0}`, obsługa Enter/Space.
4. **Akcje (ikony)** — w prawym górnym rogu karty, absolutnie pozycjonowane (`absolute top-2 right-2`), aby nie konkurowały z treścią wierszy 1–2:
   - `Pencil` — `aria-label="Edytuj pacjenta"`, `h-8 w-8` icon button (`variant="ghost" size="icon"`).
   - `Archive` — `aria-label="Archiwizuj pacjenta"`, analogicznie; ukryty gdy zarchiwizowany.
   - `RotateCcw` — `aria-label="Przywróć pacjenta"`, tylko dla zarchiwizowanych, zastępuje ikonę Archiwizuj.
   - Każdy przycisk: `onClick` z `e.preventDefault(); e.stopPropagation();`.

## Klikalność karty

Cała karta staje się linkiem do `/pacjenci/$id`:
- Owinąć całą treść karty w `<Link to="/pacjenci/$id" params={{ id: p.id }}>` z klasami karty (rounded-2xl, border, bg-card, padding, hover).
- Przyciski ikon i plakietka „Uzupełnij braki" pozostają wewnątrz linku, ale zatrzymują nawigację przez `preventDefault + stopPropagation`.
- Zachować `opacity-70` dla zarchiwizowanych.

## Szkic JSX (uproszczony)

```tsx
<li key={p.id}>
  <Link
    to="/pacjenci/$id"
    params={{ id: p.id }}
    className="relative block rounded-2xl border border-border bg-card p-4 pr-20 hover:border-accent ..."
  >
    {/* akcje w prawym górnym rogu */}
    <div className="absolute right-2 top-2 flex gap-1">
      <Button size="icon" variant="ghost" aria-label="Edytuj pacjenta"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingPatient(p); }}>
        <Pencil className="h-4 w-4" />
      </Button>
      {archived ? (
        <Button ... aria-label="Przywróć pacjenta" onClick={... restorePatient(p.id)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : (
        <Button ... aria-label="Archiwizuj pacjenta" onClick={... setArchivingPatient(p)}>
          <Archive className="h-4 w-4" />
        </Button>
      )}
    </div>

    {/* 1. imię i nazwisko */}
    <h3 className="text-base font-semibold text-foreground break-words line-clamp-2">
      {formatPatientName(p)}
    </h3>

    {/* 2. forma zwrotu · telefon */}
    <p className="mt-1 text-sm text-muted-foreground break-words">
      {p.salutation?.trim() || "—"} · {p.phone}
    </p>

    {/* 3. plakietki */}
    <div className="mt-2 flex flex-wrap gap-1">
      {!archived && !p.service_consent_at && <Badge variant="destructive">Brak zgody</Badge>}
      {!archived && p.service_consent_at && <Badge variant="secondary">Obsługowa</Badge>}
      {!archived && p.marketing_consent_at && <Badge variant="outline">Marketing</Badge>}
      {archived && <Badge variant="outline">Zarchiwizowany</Badge>}
      {!archived && missingCount > 0 && (
        <Badge variant="outline"
          role="button" tabIndex={0}
          className="cursor-pointer border-amber-500/50 text-amber-600 dark:text-amber-400"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingPatient(p); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditingPatient(p); } }}
        >
          Uzupełnij braki ({missingCount})
        </Badge>
      )}
    </div>
  </Link>
</li>
```

`missingCount = (isPatientNameIncomplete(p) ? 1 : 0) + (!p.salutation?.trim() ? 1 : 0)`.

## Poza zakresem
- Karta szczegółowa `/pacjenci/$id`.
- Logika archiwizacji, edycji, walidacji, zgód.
- Inne ekrany, filtry, wyszukiwarka, FAB, dialogi.
