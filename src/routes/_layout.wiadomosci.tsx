import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertTriangle, Ban, Check, CheckCheck, Clock, Loader2, X } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { fmtDate, formatPatientName } from "@/lib/format";
import type { MessageKind, MessageStatus, MarketingReason } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/wiadomosci")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!profile || profile.role === "family") {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Wiadomości — FizjoPlan" },
      {
        name: "description",
        content: "Dziennik wysłanych SMS-ów i propozycje marketingowe do zatwierdzenia.",
      },
    ],
  }),
  component: MessagesPage,
});

const KIND_LABEL: Record<MessageKind, string> = {
  reminder_24h: "Przypomnienie 24h",
  reminder_2h: "Przypomnienie 2h",
  confirmation: "Potwierdzenie",
  cancellation: "Odwołanie",
  marketing_anniversary: "Marketing · rocznica",
  marketing_birthday: "Marketing · urodziny",
};

const REASON_LABEL: Record<MarketingReason, string> = {
  anniversary: "Rocznica pierwszej wizyty",
  birthday: "Urodziny",
};

const STATUS_LABEL: Record<MessageStatus, string> = {
  pending: "Oczekuje",
  processing: "W trakcie",
  sent: "Wysłano",
  failed: "Błąd",
  cancelled: "Anulowana",
  delivered: "Doręczono",
  undelivered: "Niedoręczona",
};

function statusBadge(status: MessageStatus) {
  const label = STATUS_LABEL[status] ?? status;
  if (status === "delivered")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCheck className="h-3 w-3" /> {label}
      </Badge>
    );
  if (status === "sent")
    return (
      <Badge variant="secondary" className="gap-1">
        <Check className="h-3 w-3" /> {label}
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> {label}
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3" /> {label}
      </Badge>
    );
  if (status === "cancelled")
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Ban className="h-3 w-3" /> {label}
      </Badge>
    );
  if (status === "undelivered")
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {label}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <X className="h-3 w-3" /> {label}
    </Badge>
  );
}

function MessagesPage() {
  const messages = useStore((s) => s.messages);
  const proposals = useStore((s) => s.proposals);
  const patients = useStore((s) => s.patients);
  const approveProposal = useStore((s) => s.approveProposal);

  const patientById = new Map(patients.map((p) => [p.id, p]));

  return (
    <>
      <AppHeader title="Wiadomości" subtitle="Dziennik i propozycje marketingowe" feedbackScreen="Wiadomości" />
      <PageContainer>
        <Tabs defaultValue="log">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="log">Dziennik</TabsTrigger>
            <TabsTrigger value="marketing">
              Propozycje
              {proposals.filter((p) => p.approved === null).length > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {proposals.filter((p) => p.approved === null).length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-4">
            {messages.length === 0 ? (
              <EmptyBox text="Brak wpisów w dzienniku." />
            ) : (
              <ul className="space-y-3">
                {messages.map((m) => {
                  const p = patientById.get(m.patient_id);
                  return (
                    <li
                      key={m.id}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {p ? formatPatientName(p) : "—"}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {KIND_LABEL[m.kind]} · zaplanowana{" "}
                            {fmtDate(m.scheduled_at ?? m.created_at, "d MMM, HH:mm")}
                          </p>
                        </div>
                        {statusBadge(m.status)}
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">{m.body}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="marketing" className="mt-4">
            {proposals.length === 0 ? (
              <EmptyBox text="Brak propozycji marketingowych." />
            ) : (
              <ul className="space-y-3">
                {proposals.map((p) => {
                  const patient = patientById.get(p.patient_id);
                  return (
                    <li
                      key={p.id}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            {patient ? formatPatientName(patient) : "—"}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {REASON_LABEL[p.reason]}
                          </p>
                        </div>
                        {p.approved === true ? (
                          <Badge variant="secondary">Zatwierdzone</Badge>
                        ) : p.approved === false ? (
                          <Badge variant="outline">Odrzucone</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 rounded-lg bg-secondary/50 p-3 text-sm text-foreground/90">
                        {p.body}
                      </p>
                      {p.approved === null ? (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              approveProposal(p.id, true);
                              toast.success("Propozycja zatwierdzona.");
                            }}
                          >
                            Zatwierdź i wyślij
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              approveProposal(p.id, false);
                              toast("Propozycja odrzucona.");
                            }}
                          >
                            Odrzuć
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
