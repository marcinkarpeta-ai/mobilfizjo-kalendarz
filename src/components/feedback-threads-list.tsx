import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Status = "new" | "seen" | "done";

interface Row {
  id: string;
  screen: string;
  body: string;
  status: Status;
  created_at: string;
  created_by: string;
  author_name: string | null;
  comments_total: number;
  latest_foreign_activity_at: string | null;
  read_at: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  new: "Nowe",
  seen: "Przejrzane",
  done: "Zrobione",
};

const STATUS_CLASS: Record<Status, string> = {
  new: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  seen: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  done: "bg-muted text-muted-foreground border-border",
};

export function FeedbackThreadsList() {
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.role);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: fb, error: fbErr } = await supabase
        .from("feedback")
        .select("id, screen, body, status, created_at, created_by")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (fbErr) {
        setError(fbErr.message);
        setRows([]);
        return;
      }
      const list = fb ?? [];
      const ids = list.map((r) => r.id);
      const authorIds = Array.from(new Set(list.map((r) => r.created_by)));

      const [commentsRes, readsRes, profilesRes] = await Promise.all([
        ids.length
          ? supabase
              .from("feedback_comments")
              .select("feedback_id, created_by, created_at")
              .in("feedback_id", ids)
          : Promise.resolve({ data: [], error: null } as const),
        supabase
          .from("feedback_reads")
          .select("feedback_id, read_at")
          .eq("user_id", userId),
        authorIds.length
          ? supabase
              .from("profiles")
              .select("user_id, display_name")
              .in("user_id", authorIds)
          : Promise.resolve({ data: [], error: null } as const),
      ]);
      if (cancelled) return;

      const comments = commentsRes.data ?? [];
      const reads = readsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      const readMap = new Map(reads.map((r) => [r.feedback_id, r.read_at]));
      const nameMap = new Map(
        profiles.map((p) => [p.user_id, p.display_name ?? null]),
      );

      const totalCount = new Map<string, number>();
      const latestForeign = new Map<string, string>();
      for (const c of comments) {
        totalCount.set(c.feedback_id, (totalCount.get(c.feedback_id) ?? 0) + 1);
        if (c.created_by !== userId) {
          const prev = latestForeign.get(c.feedback_id);
          if (!prev || c.created_at > prev)
            latestForeign.set(c.feedback_id, c.created_at);
        }
      }

      const mapped: Row[] = list.map((r) => ({
        id: r.id,
        screen: r.screen,
        body: r.body,
        status: r.status as Status,
        created_at: r.created_at,
        created_by: r.created_by,
        author_name: nameMap.get(r.created_by) ?? null,
        comments_total: totalCount.get(r.id) ?? 0,
        latest_foreign_activity_at: latestForeign.get(r.id) ?? null,
        read_at: readMap.get(r.id) ?? null,
      }));
      setRows(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function isUnread(r: Row): boolean {
    if (!userId) return false;
    const read = r.read_at ? new Date(r.read_at).getTime() : 0;
    if (r.created_by !== userId) {
      const created = new Date(r.created_at).getTime();
      if (created > read) return true;
    }
    if (r.latest_foreign_activity_at) {
      const t = new Date(r.latest_foreign_activity_at).getTime();
      if (t > read) return true;
    }
    return false;
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive bg-card p-4 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (rows === null) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Wczytywanie…
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Brak zgłoszeń.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const unread = isUnread(r);
        return (
          <li key={r.id}>
            <Link
              to="/ustawienia/sugestie/$id"
              params={{ id: r.id }}
              className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {unread ? (
                      <span
                        aria-label="Nieprzeczytana aktywność"
                        className="h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    ) : null}
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd.MM.yyyy HH:mm")} ·{" "}
                      {r.screen}
                      {role === "therapist" && r.author_name ? (
                        <> · {r.author_name}</>
                      ) : null}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/90">
                    {r.body}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    STATUS_CLASS[r.status],
                  )}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {r.comments_total}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function useFeedbackUnreadCount(): number {
  const userId = useStore((s) => s.userId);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: fb } = await supabase
        .from("feedback")
        .select("id, created_at, created_by");
      if (cancelled || !fb) return;
      const ids = fb.map((r) => r.id);
      const [commentsRes, readsRes] = await Promise.all([
        ids.length
          ? supabase
              .from("feedback_comments")
              .select("feedback_id, created_by, created_at")
              .in("feedback_id", ids)
          : Promise.resolve({ data: [] as { feedback_id: string; created_by: string; created_at: string }[] }),
        supabase
          .from("feedback_reads")
          .select("feedback_id, read_at")
          .eq("user_id", userId),
      ]);
      if (cancelled) return;
      const readMap = new Map(
        (readsRes.data ?? []).map((r) => [r.feedback_id, r.read_at]),
      );
      const latestForeign = new Map<string, string>();
      for (const c of commentsRes.data ?? []) {
        if (c.created_by === userId) continue;
        const prev = latestForeign.get(c.feedback_id);
        if (!prev || c.created_at > prev)
          latestForeign.set(c.feedback_id, c.created_at);
      }
      let n = 0;
      for (const r of fb) {
        const read = readMap.get(r.id)
          ? new Date(readMap.get(r.id)!).getTime()
          : 0;
        let unread = false;
        if (r.created_by !== userId && new Date(r.created_at).getTime() > read)
          unread = true;
        const lf = latestForeign.get(r.id);
        if (lf && new Date(lf).getTime() > read) unread = true;
        if (unread) n++;
      }
      setCount(n);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return count;
}
