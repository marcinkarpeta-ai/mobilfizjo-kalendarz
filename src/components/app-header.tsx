import { useState, type ReactNode } from "react";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FeedbackSheet } from "@/components/feedback-sheet";

export function AppHeader({
  title,
  subtitle,
  right,
  className,
  feedbackScreen,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  feedbackScreen?: string;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {right}
          {feedbackScreen ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zgłoś sugestię"
              onClick={() => setFeedbackOpen(true)}
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </div>
      {feedbackScreen ? (
        <FeedbackSheet
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          screen={feedbackScreen}
        />
      ) : null}
    </header>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-lg px-4 py-4", className)}>
      {children}
    </div>
  );
}
