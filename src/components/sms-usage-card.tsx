import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Row = { month: string; messages_count: number; parts_total: number };

const priceFmt = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCost(parts: number, priceGr: number): string {
  return `${priceFmt.format((parts * priceGr) / 100)} zł netto`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function SmsUsageCard() {
  const priceGr = useStore((s) => s.settings.sms_price_net_gr);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_sms_monthly_stats", {
        _months: 12,
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Wczytywanie…
      </div>
    );
  }

  const currentMonthKey = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const current =
    rows.find((r) => r.month === currentMonthKey) ??
    ({ month: currentMonthKey, messages_count: 0, parts_total: 0 } as Row);
  const previous = rows.filter((r) => r.month !== currentMonthKey);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Zużycie SMS · bieżący miesiąc
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {current.parts_total}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {current.parts_total === 1 ? "część" : "części"}
            </span>
          </p>
          <p className="text-sm text-foreground/90">
            {formatCost(current.parts_total, priceGr)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {capitalize(format(new Date(current.month), "LLLL yyyy", { locale: pl }))}
        </p>
      </div>

      {previous.length > 0 ? (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground hover:bg-card">
            <span>Poprzednie miesiące</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                "group-data-[state=open]:rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border/60">
              {previous.map((r) => (
                <li
                  key={r.month}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    {capitalize(
                      format(new Date(r.month), "LLLL yyyy", { locale: pl }),
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {r.parts_total}{" "}
                    {r.parts_total === 1 ? "część" : "części"} ·{" "}
                    {formatCost(r.parts_total, priceGr)}
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Liczone wg części SMS; statusy wysłane i niedoręczone.
      </p>
    </div>
  );
}
