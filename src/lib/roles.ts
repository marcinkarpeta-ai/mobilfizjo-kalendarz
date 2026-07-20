import type { UserRole } from "./types";

// Role o ograniczonym widoku kalendarza: family i admin widzą tylko
// wydarzenia rodzinne i anonimowe bloki „Zajęte".
export function isRestrictedCalendarRole(role: UserRole | null | undefined): boolean {
  return role === "family" || role === "admin";
}

// Kto może zarządzać modułem sugestii (widzieć wszystkie wątki,
// komentować pod każdym, zmieniać status): therapist i admin.
export function canManageFeedback(role: UserRole | null | undefined): boolean {
  return role === "therapist" || role === "admin";
}
