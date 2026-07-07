import { Clock } from "lucide-react";
import { fmtTime } from "@/lib/format";

export function BusyBlockCard({
  starts_at,
  ends_at,
}: {
  starts_at: string;
  ends_at: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-muted" />
      <div className="pl-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <span>
            {fmtTime(starts_at)}–{fmtTime(ends_at)}
          </span>
        </div>
        <h3 className="mt-1 truncate text-base font-semibold text-muted-foreground">
          Zajęte
        </h3>
      </div>
    </article>
  );
}
