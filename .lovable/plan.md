## Zmiany w `src/routes/auth.tsx`

1. Placeholder pola nazwy użytkownika: `"np. magda"` → `"Wpisz nazwę użytkownika"`.
2. Usunąć przełącznik trybu i całą gałąź rejestracji:
   - usunąć stan `mode`/`setMode`,
   - usunąć w `submit` gałąź `else` (`supabase.auth.signUp`), zostawić tylko `signInWithPassword`,
   - w podtytule zostawić `"Zaloguj się do swojego gabinetu"`,
   - w `autoComplete` hasła zostawić `"current-password"`,
   - przycisk submit: `"Zaloguj"` (i `"Chwileczkę…"` w `busy`),
   - usunąć `<button>` "Nie masz konta? Zarejestruj się".

Bez zmian w auth/backend/migracjach.
