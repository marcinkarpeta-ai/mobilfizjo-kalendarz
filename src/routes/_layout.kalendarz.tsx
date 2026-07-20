import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { DayTimeline } from "@/components/day-timeline";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import { AppointmentDetailsSheet } from "@/components/appointment-details-sheet";
import type { Appointment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { useBusyBlocks } from "@/hooks/use-busy-blocks";

export const Route = createFileRoute("/_layout/kalendarz")({
  head: () => ({
    meta: [
      { title: "Kalendarz — FizjoPlan" },
      { name: "description", content: "Miesięczny kalendarz wizyt i wydarzeń rodzinnych." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const mounted = useMounted();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<{ start: string; end: string } | null>(null);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);


  const appointments = useStore((s) => s.appointments);
  const patients = useStore((s) => s.patients);
  const labels = useStore((s) => s.labels);
  const role = useStore((s) => s.role);
  const isFamily = role === "family" || role === "admin";

  const patientById = new Map(patients.map((p) => [p.id, p]));
  const labelById = new Map(labels.map((l) => [l.id, l]));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { locale: pl, weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { locale: pl, weekStartsOn: 1 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
      arr.push(d);
    }
    return arr;
  }, [cursor]);

  const monthFromISO = useMemo(
    () => (isFamily ? days[0].toISOString() : null),
    [isFamily, days],
  );
  const monthToISO = useMemo(
    () => (isFamily ? new Date(days[days.length - 1].getTime() + 86400000).toISOString() : null),
    [isFamily, days],
  );
  const monthBusy = useBusyBlocks(monthFromISO, monthToISO);

  const busyByDay = useMemo(() => {
    const map = new Map<string, { starts_at: string; ends_at: string }[]>();
    for (const b of monthBusy) {
      const key = format(parseISO(b.starts_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [monthBusy]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    for (const a of appointments) {
      const key = format(parseISO(a.starts_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appointments]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedItems = (byDay.get(selectedKey) ?? []).sort(
    (a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime(),
  );
  const selectedBusy = busyByDay.get(selectedKey) ?? [];

  const weekdayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  return (
    <>
      <AppHeader
        title="Kalendarz"
        subtitle={capitalize(format(cursor, "LLLL yyyy", { locale: pl }))}
        feedbackScreen="Kalendarz"
        right={
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Poprzedni miesiąc"
              onClick={() => setCursor((c) => subMonths(c, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Następny miesiąc"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        }
      />
      <PageContainer>
        {!mounted ? (
          <div className="min-h-[60vh]" aria-hidden />
        ) : (
          <>
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {weekdayLabels.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const items = byDay.get(key) ?? [];
            const hasVisit = items.some(
              (a) => a.type === "patient_visit" && a.status !== "cancelled",
            );
            const hasFamily = items.some((a) => a.type === "family_event");
            const hasBusy = (busyByDay.get(key) ?? []).length > 0;
            const inMonth = isSameMonth(d, cursor);
            const isSelected = isSameDay(d, selected);
            const isToday = isSameDay(d, new Date());

            return (
              <button
                key={key}
                onClick={() => setSelected(d)}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  inMonth ? "text-foreground" : "text-muted-foreground/50",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary",
                  isToday && !isSelected && "ring-1 ring-primary/50",
                )}
                aria-label={format(d, "d MMMM yyyy", { locale: pl })}
                aria-pressed={isSelected}
              >
                <span>{format(d, "d")}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {isFamily
                    ? hasBusy && (
                        <span
                          aria-hidden
                          className={cn(
                            "h-1 w-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-muted-foreground/60",
                          )}
                        />
                      )
                    : hasVisit && (
                        <span
                          aria-hidden
                          className={cn(
                            "h-1 w-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      )}
                  {hasFamily ? (
                    <span
                      aria-hidden
                      className={cn(
                        "h-1 w-1 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-accent",
                      )}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <section className="mt-6" aria-labelledby="day-list">
          <h2
            id="day-list"
            className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {capitalize(format(selected, "EEEE, d MMMM", { locale: pl }))}
          </h2>
          <DayTimeline
            date={selected}
            appointments={selectedItems}
            patientById={patientById}
            labelById={labelById}
            familyView={isFamily}
            busyBlocks={selectedBusy}
            onGapClick={(start, end) => {
              setPreset({ start, end });
              setOpen(true);
            }}
            onSelectAppointment={(a) => {
              if (isFamily && a.type !== "family_event") return;
              setDetailsAppt(a);
            }}
          />
        </section>
          </>
        )}
      </PageContainer>

      <Button
        size="lg"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg"
        aria-label="Dodaj wpis"
        onClick={() => {
          setPreset(null);
          setOpen(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddAppointmentDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={selected}
        defaultStart={preset?.start}
        defaultEnd={preset?.end}
        mode={isFamily ? "family_only" : "full"}
        extraBusy={isFamily ? selectedBusy : undefined}
      />

      <AddAppointmentDialog
        open={!!editingAppt}
        onOpenChange={(v) => !v && setEditingAppt(null)}
        editing={editingAppt}
        mode={editingAppt?.type === "family_event" ? "family_only" : "full"}
        extraBusy={isFamily ? selectedBusy : undefined}
      />

      <AppointmentDetailsSheet
        appt={detailsAppt}
        onOpenChange={(v) => !v && setDetailsAppt(null)}
        onEdit={(a) => {
          setDetailsAppt(null);
          setEditingAppt(a);
        }}
      />
    </>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
