import { AlertCircle, BarChart3, BookOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Loading state component for journal tables
 * Displays skeleton loading animation for journal entries
 */
export function JournalLoadingState() {
  return (
    <div className="journal flex flex-col">
      {/* Header skeleton */}
      <div className="head border-b border-border bg-muted/40">
        <div className="flex items-center">
          <div className="mx-2 h-4 w-16 animate-pulse rounded bg-muted-foreground/15 sm:w-20"></div>
          <div className="mx-2 h-4 w-8 animate-pulse rounded bg-muted-foreground/15 sm:w-16"></div>
          <div className="mx-2 h-4 flex-1 animate-pulse rounded bg-muted-foreground/15"></div>
          <div className="h-4 w-8 animate-pulse rounded bg-muted-foreground/15 sm:hidden"></div>
          <div className="hidden h-8 w-24 animate-pulse rounded bg-muted sm:block"></div>
        </div>
      </div>

      {/* Entry skeletons */}
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border-b border-border/50">
          <div className="flex items-start py-2">
            {/* Date skeleton */}
            <div className="w-20 sm:w-24 h-6 bg-muted animate-pulse rounded mx-1"></div>

            {/* Flag skeleton */}
            <div className="w-12 sm:w-24 h-6 bg-muted animate-pulse rounded mx-1"></div>

            {/* Description skeleton */}
            <div className="flex-1 px-1 sm:px-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
              </div>
              <div className="flex gap-1">
                <div className="h-3 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
              </div>
            </div>

            {/* Postings column skeleton - hidden on mobile */}
            <div className="hidden h-6 w-24 animate-pulse rounded bg-muted sm:block"></div>
          </div>

          {/* Postings skeleton (randomly show for some entries) */}
          {index % 3 === 0 && (
            <div className="bg-muted/50 text-sm">
              <div className="flex items-center py-1 border-b border-border/50">
                <div className="w-32 sm:w-48 h-4 bg-muted animate-pulse rounded mx-2"></div>
                <div className="flex-1 h-4 bg-muted animate-pulse rounded mx-2"></div>
                <div className="w-20 sm:w-32 h-4 bg-muted animate-pulse rounded hidden sm:block"></div>
                <div className="w-20 sm:w-32 h-4 bg-muted animate-pulse rounded hidden sm:block"></div>
                <div className="w-20 sm:w-32 h-4 bg-muted animate-pulse rounded hidden sm:block"></div>
              </div>
            </div>
          )}

          {/* Metadata skeleton (randomly show for some entries) */}
          {index % 4 === 0 && (
            <div className="bg-muted/50 text-sm">
              <div className="flex items-center py-1 border-b border-border/50">
                <div className="w-32 sm:w-48 h-4 bg-muted animate-pulse rounded mx-2"></div>
                <div className="flex-1 h-4 bg-muted animate-pulse rounded mx-2"></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Error state component for journal operations
 * Displays error message with consistent styling
 */
export function JournalErrorState({ message }: { message: string }) {
  const { t } = useTranslations();

  return (
    <Alert variant="destructive">
      <AlertDescription>
        {t("journal.errorLoadingJournalEntries")}: {message}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Empty state component for journal tables
 * Displays when no journal entries are found
 */
export function JournalEmptyState() {
  const { t } = useTranslations();

  return (
    <div className="flex items-center justify-center px-4 py-16 text-center">
      <div>
        <BookOpen className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {t("journal.noJournalEntriesFound")}
        </p>
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
 * For pages with headers and card layouts
 */
export function PageErrorState({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Page-level empty state component
 * For pages with headers and card layouts
 */
export function PageEmptyState({
  title,
  subtitle,
  description,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
}) {
  const { t } = useTranslations();
  const emptyTitle = title || t("component.emptyState.title");
  const emptySubtitle = subtitle || t("component.emptyState.title");
  const emptyDescription = description || t("common.noDataFound");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold leading-none flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {emptySubtitle}
        </h2>
        <p className="text-muted-foreground text-sm mt-1.5">{emptySubtitle}</p>
      </div>
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {emptyTitle}
              </h3>
              <p className="text-muted-foreground">{emptyDescription}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
