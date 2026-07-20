import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

const MAX_BODY = 2000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function FeedbackSheet({
  open,
  onOpenChange,
  screen,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  screen: string;
}) {
  const userId = useStore((s) => s.userId);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setBody("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > MAX_PHOTO_BYTES) {
      toast.error("Zdjęcie jest za duże (max 5 MB).");
      e.target.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Wpisz treść sugestii.");
      return;
    }
    if (!userId) {
      toast.error("Brak sesji użytkownika.");
      return;
    }
    setSending(true);
    try {
      let photo_path: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("feedback-photos")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        photo_path = path;
      }

      const { error } = await supabase.from("feedback").insert({
        created_by: userId,
        screen,
        body: trimmed,
        photo_path,
      });
      if (error) throw error;

      toast.success("Dziękujemy! Sugestia zapisana.");
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się zapisać sugestii.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Zgłoś sugestię</SheetTitle>
          <SheetDescription>
            Ekran: <span className="font-medium text-foreground">{screen}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            placeholder="Co poprawić lub dodać?"
            rows={5}
            autoFocus
          />
          <div className="text-right text-xs text-muted-foreground">
            {body.length}/{MAX_BODY}
          </div>

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={previewUrl}
                alt="Podgląd zdjęcia"
                className="max-h-64 w-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={removePhoto}
                aria-label="Usuń zdjęcie"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Dodaj zdjęcie (opcjonalnie)
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFile}
          />

          <Button
            className="w-full"
            onClick={submit}
            disabled={sending || !body.trim()}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Wyślij
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
