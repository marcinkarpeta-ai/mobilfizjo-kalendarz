import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { buildImportPreview, type ImportPreview } from "@/lib/import-patients";

export function ImportPatientsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const patients = useStore((s) => s.patients);
  const bulkAddPatients = useStore((s) => s.bulkAddPatients);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);

  function reset() {
    setPreview(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const p = buildImportPreview(text, patients);
      setPreview(p);
      setFileName(file.name);
    } catch (e) {
      toast.error("Nie udało się wczytać pliku.");
      console.error(e);
    }
  }

  async function doImport() {
    if (!preview) return;
    const toInsert = preview.rows.filter((r) => r.status === "new");
    if (toInsert.length === 0) {
      toast.error("Brak nowych pacjentów do zaimportowania.");
      return;
    }
    setImporting(true);
    const res = await bulkAddPatients(
      toInsert.map((r) => ({
        first_name: r.data.first_name,
        last_name: r.data.last_name,
        phone: r.data.phone,
        salutation: r.data.salutation,
        birth_date: r.data.birth_date ?? undefined,
        general_note: r.data.general_note ?? undefined,
      })),
    );
    setImporting(false);
    if (res.inserted > 0) {
      toast.success(`Zaimportowano ${res.inserted} pacjentów.`);
      handleClose(false);
    } else {
      toast.error("Nie udało się zaimportować pacjentów.");
    }
  }

  const counts = preview
    ? {
        newCount: preview.rows.filter((r) => r.status === "new").length,
        dup: preview.rows.filter((r) => r.status === "duplicate").length,
        err: preview.rows.filter((r) => r.status === "error").length,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importuj pacjentów z CSV</DialogTitle>
          <DialogDescription>
            Wymagane kolumny: Imię, Nazwisko, Telefon. Opcjonalne: Forma
            grzecznościowa, Data urodzenia, Notatka.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">
              Wybierz plik .csv (separator zostanie wykryty automatycznie).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              Wybierz plik
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Nowi: {counts!.newCount}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Copy className="h-3 w-3" /> Duplikaty: {counts!.dup}
              </Badge>
              {counts!.err > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> Błędy: {counts!.err}
                </Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 px-2 text-xs"
                onClick={reset}
              >
                Wybierz inny plik
              </Button>
            </div>

            {preview.missingRequired.length > 0 ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
              >
                Brak wymaganych kolumn: {preview.missingRequired.join(", ")}.
              </div>
            ) : null}

            <div className="max-h-[50vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-secondary/80 text-left">
                  <tr>
                    <th className="p-2">Status</th>
                    <th className="p-2">Imię i nazwisko</th>
                    <th className="p-2">Telefon</th>
                    <th className="p-2">Uwagi</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2">
                        {r.status === "new" ? (
                          <Badge variant="secondary">Nowy</Badge>
                        ) : r.status === "duplicate" ? (
                          <Badge variant="outline">Duplikat</Badge>
                        ) : (
                          <Badge variant="destructive">Błąd</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        {[r.data.first_name, r.data.last_name]
                          .map((v) => (v ?? "").trim())
                          .filter(Boolean)
                          .join(" ") || "(bez nazwiska)"}
                      </td>
                      <td className="p-2 tabular-nums">{r.data.phone}</td>
                      <td className="p-2 text-muted-foreground">
                        {r.error
                          ? r.error
                          : [
                              r.warning,
                              r.duplicateOf ? `Już istnieje: ${r.duplicateOf.name}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Anuluj
          </Button>
          <Button
            onClick={doImport}
            disabled={!preview || importing || (counts?.newCount ?? 0) === 0}
          >
            {importing ? "Importowanie…" : `Importuj ${counts?.newCount ?? 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
