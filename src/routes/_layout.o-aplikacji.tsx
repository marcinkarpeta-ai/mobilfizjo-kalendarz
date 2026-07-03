import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Share2 } from "lucide-react";
import { AppHeader, PageContainer } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { PoweredByFooter } from "@/components/powered-by-footer";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/o-aplikacji")({
  head: () => ({
    meta: [
      { title: "O aplikacji — FizjoPlan" },
      { name: "description", content: "O aplikacji FizjoPlan i jej twórcy." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  async function share() {
    const url = "https://simplefast.ai";
    const data = {
      title: "FizjoPlan — Simple Fast AI",
      text: "Sprawdź FizjoPlan — aplikację dla fizjoterapeuty od Simple Fast AI.",
      url,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // fallthrough
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano link do schowka.");
    } catch {
      toast("Udostępnij: " + url);
    }
  }

  return (
    <>
      <AppHeader
        title="O aplikacji"
        right={
          <Button asChild variant="ghost" size="icon" aria-label="Wróć">
            <Link to="/ustawienia">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        }
      />
      <PageContainer className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">FizjoPlan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Wersja 0.1 · iteracja 1 (szkielet UI)</p>
          <p className="mt-3 text-sm text-foreground/90">
            Mobilna aplikacja dla fizjoterapeuty: kalendarz wizyt i wydarzeń
            rodzinnych, kartoteka pacjentów z historią, automatyczne SMS-y (przez
            zewnętrzny n8n) i marketing zatwierdzany ręcznie.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground">Twórca</h3>
          <p className="mt-1 text-sm text-muted-foreground">Simple Fast AI</p>
          <p className="mt-3 text-sm text-foreground/90">
            Budujemy proste aplikacje z AI dla małych firm i profesjonalistów.
          </p>
          <Button className="mt-4 w-full" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" />
            Udostępnij twórcę
          </Button>
        </div>

        <PoweredByFooter />
      </PageContainer>
    </>
  );
}
