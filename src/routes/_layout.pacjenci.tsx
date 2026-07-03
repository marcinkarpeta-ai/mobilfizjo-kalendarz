import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ShieldAlert } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddPatientDialog } from "@/components/add-patient-dialog";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_layout/pacjenci")({
  head: () => ({
    meta: [
      { title: "Pacjenci — FizjoPlan" },
      { name: "description", content: "Kartoteka pacjentów: dane, historia wizyt i zgody." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const patients = useStore((s) => s.patients);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.phone}`.toLowerCase().includes(query),
    );
  }, [patients, q]);

  return (
    <>
      <AppHeader title="Pacjenci" subtitle={`${patients.length} osób w kartotece`} />
      <PageContainer>
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po imieniu lub telefonie"
            className="pl-9"
            aria-label="Szukaj pacjenta"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Brak pacjentów pasujących do wyszukiwania.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  to="/pacjenci/$id"
                  params={{ id: p.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {p.first_name} {p.last_name}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {p.salutation} · {p.phone}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!p.service_consent_at ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> Brak zgody
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Obsługowa</Badge>
                      )}
                      {p.marketing_consent_at ? (
                        <Badge variant="outline">Marketing</Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <Button
        size="lg"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full p-0 shadow-lg"
        aria-label="Dodaj pacjenta"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddPatientDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
