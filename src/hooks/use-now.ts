import { useEffect, useState } from "react";

/**
 * Re-renders the caller every `intervalMs` (default 60s) so time-based
 * UI (np. wpis "zakończony" vs "trwa teraz") odświeża się bez F5.
 */
export function useNow(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
