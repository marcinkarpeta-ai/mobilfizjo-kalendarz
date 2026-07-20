Odczep trasę wątku sugestii od layoutu Ustawień, aby przestała być traktowana jako dziecko `/ustawienia` (które nie renderuje `<Outlet />`).

## Kroki

1. Zmień nazwę pliku:
   - z `src/routes/_layout.ustawienia.sugestie.$id.tsx`
   - na `src/routes/_layout.ustawienia_.sugestie.$id.tsx`
   (podkreślnik po `ustawienia` w TanStack Router wyłącza zagnieżdżanie w rodzicu, zachowując URL `/ustawienia/sugestie/:id`).

2. W przemianowanym pliku zaktualizuj wywołanie:
   ```ts
   createFileRoute("/_layout/ustawienia_/sugestie/$id")
   ```

3. `src/routeTree.gen.ts` regeneruje się automatycznie — nie edytujemy go ręcznie.

## Poza zakresem

- Linki `<Link to="/ustawienia/sugestie/$id">` w `feedback-threads-list.tsx` pozostają bez zmian (URL się nie zmienia).
- Zero zmian w innych plikach, komponentach, RLS ani stylach.
