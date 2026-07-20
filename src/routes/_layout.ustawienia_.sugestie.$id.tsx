import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "new" | "seen" | "done";

interface Feedback {
  id: string;
  screen: string;
  body: string;
  photo_path: string | null;
  status: Status;
  created_at: string;
  created_by: string;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
}

const STATUS_LABEL: Record<Status, string> = {
  new: "Nowe",
  seen: "Przejrzane",
  done: "Zrobione",
};

export const Route = createFileRoute("/_layout/ustawienia_/sugestie/$id")({
  head: () => ({
    meta: [{ title: "Sugestia — FizjoPlan" }],
  }),
  component: FeedbackThreadPage,
});

function FeedbackThreadPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const userId = useStore((s) => s.userId);
  const role = useStore((s) => s.role);

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const canComment = useMemo(() => {
    if (!feedback || !userId) return false;
    return (
      feedback.created_by === userId ||
      role === "therapist" ||
      role === "admin"
    );
  }, [feedback, userId, role]);

  async function markRead() {
    if (!userId) return;
    await supabase.from("feedback_reads").upsert(
      { feedback_id: id, user_id: userId, read_at: new Date().toISOString() },
      { onConflict: "feedback_id,user_id" },
    );
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    const { data: fb, error: fbErr } = await supabase
      .from("feedback")
      .select(
        "id, screen, body, photo_path, status, created_at, created_by",
      )
      .eq("id", id)
      .maybeSingle();
    if (fbErr || !fb) {
      setError(fbErr?.message ?? "Nie znaleziono sugestii.");
      setLoading(false);
      return;
    }
    setFeedback(fb as Feedback);

    const { data: cs } = await supabase
      .from("feedback_comments")
      .select("id, body, created_at, created_by")
      .eq("feedback_id", id)
      .order("created_at", { ascending: true });
    const list = (cs ?? []) as Comment[];
    setComments(list);

    const uids = Array.from(
      new Set([fb.created_by, ...list.map((c) => c.created_by)]),
    );
    if (uids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", uids);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.user_id] = p.display_name ?? "—";
      setNames(map);
      setAuthorName(map[fb.created_by] ?? null);
    }

    if (fb.photo_path) {
      const { data: signed } = await supabase.storage
        .from("feedback-photos")
        .createSignedUrl(fb.photo_path, 120);
      setPhotoUrl(signed?.signedUrl ?? null);
    } else {
      setPhotoUrl(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadAll();
      if (cancelled) return;
      await markRead();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  async function submitComment() {
    const trimmed = body.trim();
    if (!trimmed || !userId) return;
    setSending(true);
    const { data, error: insErr } = await supabase
      .from("feedback_comments")
      .insert({ feedback_id: id, created_by: userId, body: trimmed })
      .select("id, body, created_at, created_by")
      .single();
    setSending(false);
    if (insErr || !data) {
      toast.error(insErr?.message ?? "Nie udało się dodać komentarza.");
      return;
    }
    setComments((prev) => [...prev, data as Comment]);
    setBody("");
    setNames((prev) =>
      prev[userId] ? prev : { ...prev, [userId]: useStore.getState().displayName ?? "—" },
    );
    // Own comment must not stay newer than read_at
    await markRead();
  }

  async function changeStatus(next: Status) {
    if (!feedback) return;
    setSavingStatus(true);
    const prev = feedback.status;
    setFeedback({ ...feedback, status: next });
    const { error: upErr } = await supabase
      .from("feedback")
      .update({ status: next })
      .eq("id", feedback.id);
    setSavingStatus(false);
    if (upErr) {
      setFeedback({ ...feedback, status: prev });
      toast.error("Nie udało się zmienić statusu.");
    }
  }

  return (
    <>
      <AppHeader
        title="Sugestia"
        right={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Wróć do Ustawień"
            onClick={() => navigate({ to: "/ustawienia" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
      />
      <PageContainer className="space-y-4">
        {loading ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Wczytywanie…
          </p>
        ) : error || !feedback ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-destructive bg-card p-4 text-sm text-destructive">
              {error ?? "Brak dostępu do tej sugestii."}
            </p>
            <Link
              to="/ustawienia"
              className="inline-flex items-center gap-1 text-sm text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Wróć
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {format(new Date(feedback.created_at), "dd.MM.yyyy HH:mm")} ·{" "}
                {feedback.screen}
                {authorName ? <> · {authorName}</> : null}
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {feedback.body}
              </p>
              {photoUrl ? (
                <a
                  href={photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={photoUrl}
                    alt="Załączone zdjęcie"
                    className="max-h-64 w-full object-contain"
                  />
                </a>
              ) : null}
            </div>

            {role === "therapist" || role === "admin" ? (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <span className="text-sm font-medium text-foreground">
                  Status
                </span>
                <Select
                  value={feedback.status}
                  onValueChange={(v) => changeStatus(v as Status)}
                  disabled={savingStatus}
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">{STATUS_LABEL.new}</SelectItem>
                    <SelectItem value="seen">{STATUS_LABEL.seen}</SelectItem>
                    <SelectItem value="done">{STATUS_LABEL.done}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
                Status: {STATUS_LABEL[feedback.status]}
              </p>
            )}

            <section className="space-y-2">
              <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Komentarze
              </h2>
              {comments.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Brak komentarzy.
                </p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c) => {
                    const mine = c.created_by === userId;
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          "flex",
                          mine ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl border px-3 py-2",
                            mine
                              ? "border-primary/30 bg-primary/10"
                              : "border-border bg-card",
                          )}
                        >
                          <p className="mb-1 text-[11px] text-muted-foreground">
                            {names[c.created_by] ?? "—"} ·{" "}
                            {format(new Date(c.created_at), "dd.MM.yyyy HH:mm")}
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-foreground/90">
                            {c.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {canComment ? (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  placeholder="Dodaj komentarz…"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {body.length}/2000
                  </span>
                  <Button
                    onClick={submitComment}
                    disabled={sending || !body.trim()}
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Wyślij
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </PageContainer>
    </>
  );
}
