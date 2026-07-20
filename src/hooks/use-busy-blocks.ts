import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export interface BusyBlock {
  starts_at: string;
  ends_at: string;
}

/**
 * Pobiera anonimowe bloki zajętości dla roli `family` (RPC get_busy_blocks).
 * Dla `therapist` zwraca [].
 */
export function useBusyBlocks(fromISO: string | null, toISO: string | null) {
  const role = useStore((s) => s.role);
  const [blocks, setBlocks] = useState<BusyBlock[]>([]);
  const toastedRef = useRef(false);

  useEffect(() => {
    if (!(role === "family" || role === "admin") || !fromISO || !toISO) {
      setBlocks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_busy_blocks", {
        _from: fromISO,
        _to: toISO,
      });
      if (cancelled) return;
      if (error) {
        if (!toastedRef.current) {
          toastedRef.current = true;
          toast.error("Nie udało się pobrać zajętości.");
        }
        return;
      }
      setBlocks(
        (data ?? []).map((r) => ({ starts_at: r.starts_at, ends_at: r.ends_at })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [role, fromISO, toISO]);

  return blocks;
}
