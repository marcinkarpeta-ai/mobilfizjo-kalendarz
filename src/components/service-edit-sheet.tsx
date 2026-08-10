import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import type { VisitLabel } from "@/lib/types";
import { toast } from "sonner";

export function ServiceEditSheet({
  open,
  service,
  onOpenChange,
}: {
  open: boolean;
  /** null = dodawanie nowej usługi */
  service: VisitLabel | null;
  onOpenChange: (open: boolean) => void;
}) {
  const addLabel = useStore((s) => s.addLabel);
  const updateLabel = useStore((s) => s.updateLabel);
  const removeLabel = useStore((s) => s.removeLabel);

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [bookable, setBookable] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setDuration(String(service?.duration_minutes ?? 60));
    setPrice(
      service?.price_pln === null || service?.price_pln === undefined
        ? ""
        : String(service.price_pln),
    );
    setDescription(service?.description ?? "");
    setBookable(service?.bookable ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Podaj nazwę usługi.");
      return;
    }
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
    const patch = {
      name: trimmed,
      duration_minutes: Math.max(5, Math.floor(Number(duration) || 60)),
      price_pln:
        parsedPrice === null || Number.isNaN(parsedPrice) ? null : parsedPrice,
      description: description.trim() || null,
      bookable,
    };
    if (service) {
      updateLabel(service.id, patch);
    } else {
      addLabel(patch);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{service ? "Edytuj usługę" : "Nowa usługa"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">Nazwa</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="np. Masaż leczniczy"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-duration">Czas trwania (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Cena (zł)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="opcjonalnie"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-desc">Opis</Label>
            <Textarea
              id="svc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Krótki opis usługi (opcjonalnie)"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="svc-bookable" className="text-sm font-normal">
              Dostępna w rezerwacjach online
            </Label>
            <Switch
              id="svc-bookable"
              checked={bookable}
              onCheckedChange={setBookable}
              aria-label="Dostępna w rezerwacjach online"
            />
          </div>

          <div className="flex gap-2 pb-4">
            <Button className="flex-1" onClick={handleSave}>
              Zapisz
            </Button>
            {service ? (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  removeLabel(service.id);
                  toast("Usługa usunięta.");
                  onOpenChange(false);
                }}
              >
                Usuń
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
