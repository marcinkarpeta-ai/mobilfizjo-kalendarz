import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { AppointmentCard } from "@/components/appointment-card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { fmtDateLong, isSameLocalDay } from "@/lib/format";
import { parseISO } from "date-fns";

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

function TodayPage() {
  const today = new Date();
  const appointments = useStore((s) => s.appointments);
  const patients = useStore((s) => s.patients);
  const labels = useStore((s) => s.labels);

  const patientById = new Map(patients.map((p) => [p.id, p]));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  const items = appointments
    .filter((a) => isSameLocalDay(a.starts_at, today))
    .sort(
      (a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime(),
    );

  const now = new Date();
  const nextUp = items.find(
    (a) => a.status === "scheduled" && parseISO(a.ends_at) > now,
  );

  return (
    <>
      <AppHeader
        title="Dzisiaj"
        subtitle={capitalize(fmtDateLong(today))}
      />
      <PageContainer>
        {nextUp ? (
          <section aria-labelledby="next-up" className="mb-6">
            <h2
              id="next-up"
              className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Następna wizyta
            </h2>
            <AppointmentCard
              appt={nextUp}
              patient={nextUp.patient_id ? patientById.get(nextUp.patient_id) : undefined}
              label={nextUp.visit_label_id ? labelById.get(nextUp.visit_label_id) : undefined}
            />
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
              {items.map((a) => (
                <li key={a.id}>
                  <AppointmentCard
                    appt={a}
                    patient={a.patient_id ? patientById.get(a.patient_id) : undefined}
                    label={a.visit_label_id ? labelById.get(a.visit_label_id) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
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
    </>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
