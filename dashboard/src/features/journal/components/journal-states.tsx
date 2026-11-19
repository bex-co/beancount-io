import { AlertCircle, BarChart3, BookOpen, XIcon } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * The journal's own shape while it loads: day headings over two-line entries
 * with an amount at the right, as tall as a screen. Shorter than the loaded
 * page, it let 60 arriving rows push everything under it down the screen.
 */
export function JournalLoadingState({
  density = "compact",
}: {
  /** The layout the entries will arrive in. */
  density?: "compact" | "comfortable";
} = {}) {
  if (density === "compact") {
    // One line per entry under a header row, as the compact list draws them.
    return (
      <div
        aria-hidden="true"
        className="journal @container/journal flex min-h-[100svh] flex-col"
      >
        {/* The header row's names, where the list will put them. */}
        <div className="head flex h-8 items-center gap-3 border-b border-border/60 bg-muted ps-3 pe-3 sm:ps-5">
          <div className="h-3 w-10 shrink-0 animate-pulse rounded bg-muted-foreground/15 motion-reduce:animate-none sm:w-20" />
          <div className="h-3 w-12 animate-pulse rounded bg-muted-foreground/15 motion-reduce:animate-none" />
          <div className="ms-[18%] hidden h-3 w-16 animate-pulse rounded bg-muted-foreground/15 motion-reduce:animate-none @4xl/journal:block" />
          <div className="ms-auto h-3 w-14 shrink-0 animate-pulse rounded bg-muted-foreground/15 motion-reduce:animate-none" />
        </div>
        {Array.from({ length: 14 }).map((_, row) => (
          <div
            key={row}
            className="flex h-[5.25rem] items-start gap-3 border-b border-border/50 pe-3 ps-3 pt-2.5 sm:h-14 sm:ps-5 @4xl/journal:h-9 @4xl/journal:items-center @4xl/journal:pt-0 pointer-coarse:@4xl/journal:h-11"
          >
            <div className="h-3 w-10 shrink-0 animate-pulse rounded bg-muted/70 motion-reduce:animate-none md:w-20" />
            {/* The entry's name, and beneath it where a line wraps to two or
                three, its narration and accounts. */}
            <div className="w-40 max-w-[50%] space-y-2">
              <div className="h-3.5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted/70 motion-reduce:animate-none @4xl/journal:hidden" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-muted/70 motion-reduce:animate-none sm:hidden" />
            </div>
            <div className="ms-[8%] hidden h-3 w-56 animate-pulse rounded bg-muted/70 motion-reduce:animate-none @4xl/journal:block" />
            <div className="ms-auto h-3.5 w-20 shrink-0 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="journal flex min-h-[100svh] flex-col">
      {Array.from({ length: 3 }).map((_, day) => (
        <div key={day}>
          <div className="head border-b border-border/50 bg-muted/30 px-4 py-2 sm:px-5">
            <div className="h-3 w-28 animate-pulse motion-reduce:animate-none rounded bg-muted-foreground/15" />
          </div>
          {Array.from({ length: day === 0 ? 3 : 4 }).map((_, row) => (
            <div
              key={row}
              // As tall as a loaded entry, so the list does not grow when the
              // entries arrive.
              className="flex items-start gap-3 border-b border-border/50 py-4 pr-4 pl-4 sm:py-3.5 sm:pl-5"
            >
              <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
                <div className="h-5 w-36 animate-pulse motion-reduce:animate-none rounded bg-muted sm:h-4 sm:w-44" />
                <div className="h-4 w-48 max-w-full animate-pulse motion-reduce:animate-none rounded bg-muted/70 sm:h-3.5 sm:w-64" />
              </div>
              <div className="h-4 w-20 shrink-0 animate-pulse motion-reduce:animate-none rounded bg-muted sm:w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component for journal operations
 * Displays error message with consistent styling, and a Try Again that
 * re-runs the failed read in place (w4/1037)
 */
export function JournalErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const { t } = useTranslations();

  // Laid out as the empty result is, in the list's place: what happened,
  // why, and the one thing to do about it.
  return (
    <div role="alert" className="flex justify-center px-4 py-16 text-center">
      <div className="max-w-sm">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto mb-3 size-8 text-destructive/80"
        />
        <p className="text-sm font-medium text-foreground">
          {t("journal.errorLoadingJournalEntries")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          className="mt-4 pointer-coarse:h-11"
        >
          {t("common.tryAgain")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Empty state component for journal tables
 * Displays when no journal entries are found
 */
export function JournalEmptyState({
  onClearFilters,
}: {
  /** Offered when the page's time, account or tag/payee filter hid entries. */
  onClearFilters?: () => void;
} = {}) {
  const { t } = useTranslations();

  return (
    <div className="flex items-center justify-center px-4 py-16 text-center">
      <div>
        <BookOpen
          aria-hidden="true"
          className="mx-auto mb-3 size-8 text-muted-foreground/50"
        />
        <p className="text-sm font-medium text-foreground">
          {t("journal.noJournalEntriesFound")}
        </p>
        {onClearFilters && (
          // The way back, where the reader is looking: on a phone the
          // header's own Clear all sits behind the Filters sheet.
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            // Narrower, the filters row above already offers Clear all.
            className="mt-4 gap-1.5 @max-[49rem]/journal-page:hidden pointer-coarse:h-11"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
            {t("component.searchControls.clearAll")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Simple loading spinner component
 * Generic loading state for various contexts
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Page-level loading state component
 * For pages with headers and card layouts
 */
export function PageLoadingState({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { t } = useTranslations();
  const loadingTitle = title || t("common.loading");
  const loadingSubtitle = subtitle || t("common.loadingData");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-none flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {loadingTitle}
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5">
          {loadingSubtitle}
        </p>
      </div>
      <Card>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Page-level error state component
 * For pages with headers and card layouts. `onRetry` adds a Try Again that
 * re-runs the failed read in place, busy while `retrying` (w4/1045).
 */
export function PageErrorState({
  title,
  subtitle,
  onRetry,
  retrying = false,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { t } = useTranslations();
  const errorTitle = title || t("common.error");
  const errorSubtitle = subtitle || t("component.errorState.title");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-none flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {errorTitle}
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5">{errorSubtitle}</p>
      </div>
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-red-500 mb-2">{errorSubtitle}</div>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  loading={retrying}
                  className="mt-2"
                >
                  {t("common.tryAgain")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
