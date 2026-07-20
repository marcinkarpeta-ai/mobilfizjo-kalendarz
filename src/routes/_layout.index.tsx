import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { AppHeader, PageContainer } from "@/components/app-header";
import { AppointmentCard } from "@/components/appointment-card";
import { BusyBlockCard } from "@/components/busy-block-card";
import { AppointmentDetailsSheet } from "@/components/appointment-details-sheet";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { fmtDateLong, isSameLocalDay } from "@/lib/format";
import { useMounted } from "@/hooks/use-mounted";
import { useBusyBlocks } from "@/hooks/use-busy-blocks";
import type { Appointment } from "@/lib/types";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { title: "Dzisiaj — FizjoPlan" },
      {
        name: "description",
        content: "Dzisiejsze wizyty i wydarzenia rodzinne w jednym miejscu.",
      },
    ],
  }),
  component: TodayPage,
});

type TimelineItem =
  | { kind: "appt"; id: string; starts_at: string; ends_at: string; appt: import("@/lib/types").Appointment }
  | { kind: "busy"; id: string; starts_at: string; ends_at: string };

function TodayPage() {
  const mounted = useMounted();
  const today = useMemo(() => new Date(), []);
  const appointments = useStore((s) => s.appointments);
  const patients = useStore((s) => s.patients);
  const labels = useStore((s) => s.labels);
  const role = useStore((s) => s.role);
  const isFamily = role === "family";

  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  const patientById = new Map(patients.map((p) => [p.id, p]));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  const dayFromISO = useMemo(() => startOfDay(today).toISOString(), [today]);
  const dayToISO = useMemo(() => endOfDay(today).toISOString(), [today]);
  const busyBlocks = useBusyBlocks(isFamily ? dayFromISO : null, isFamily ? dayToISO : null);

  const dayAppts = appointments
    .filter((a) => isSameLocalDay(a.starts_at, today))
    .filter((a) => a.status !== "cancelled")
    .filter((a) => (isFamily ? a.type === "family_event" : true));

  const items: TimelineItem[] = [
    ...dayAppts.map<TimelineItem>((a) => ({
      kind: "appt",
      id: a.id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      appt: a,
    })),
    ...(isFamily
      ? busyBlocks.map<TimelineItem>((b, i) => ({
          kind: "busy",
          id: `busy-${i}-${b.starts_at}`,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
        }))
      : []),
  ].sort(
    (a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime(),
  );

  const now = new Date();
  const nextUp = items.find((it) => {
    if (parseISO(it.ends_at) <= now) return false;
    if (it.kind === "appt") return it.appt.status === "scheduled";
    return true;
  });

  return (
    <>
      <AppHeader
        title="Dzisiaj"
        subtitle={mounted ? capitalize(fmtDateLong(today)) : ""}
        feedbackScreen="Dzisiaj"
      />
      <PageContainer>
        {!mounted ? (
          <div className="min-h-[60vh]" aria-hidden />
        ) : (
          <>
            {nextUp ? (
              <section aria-labelledby="next-up" className="mb-6">
                <h2
                  id="next-up"
                  className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Następna wizyta
                </h2>
                {renderItem(nextUp, patientById, labelById, setDetailsAppt)}
              </section>
            ) : null}

            <section aria-labelledby="today-list">
              <h2
                id="today-list"
                className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Plan dnia
              </h2>

              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Dziś nic nie zaplanowano.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/kalendarz">Otwórz kalendarz</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <li key={it.id}>{renderItem(it, patientById, labelById, setDetailsAppt)}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </PageContainer>

      <Button
        asChild
        size="lg"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg"
        aria-label="Dodaj nowy wpis"
      >
        <Link to="/kalendarz">
          <Plus className="h-6 w-6" />
        </Link>
      </Button>

      <AppointmentDetailsSheet
        appt={detailsAppt}
        onOpenChange={(v) => !v && setDetailsAppt(null)}
        onEdit={(a) => {
          setDetailsAppt(null);
          setEditingAppt(a);
        }}
      />

      <AddAppointmentDialog
        open={!!editingAppt}
        onOpenChange={(v) => !v && setEditingAppt(null)}
        editing={editingAppt}
        mode={editingAppt?.type === "family_event" ? "family_only" : "full"}
      />
    </>
  );
}

function renderItem(
  it: TimelineItem,
  patientById: Map<string, import("@/lib/types").Patient>,
  labelById: Map<string, import("@/lib/types").VisitLabel>,
  onSelect: (a: Appointment) => void,
) {
  if (it.kind === "busy") {
    return <BusyBlockCard starts_at={it.starts_at} ends_at={it.ends_at} />;
  }
  const a = it.appt;
  return (
    <AppointmentCard
      appt={a}
      patient={a.patient_id ? patientById.get(a.patient_id) : undefined}
      label={a.visit_label_id ? labelById.get(a.visit_label_id) : undefined}
      onSelect={onSelect}
    />
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
