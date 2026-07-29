import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { FileSpreadsheet, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { cn } from "@/common/lib/utils/utils";
import { Button } from "@/common/components/ui/button";

interface ReportLoadingStateProps {
  /** Custom loading message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

interface ReportErrorStateProps {
  /** Error title */
  title?: string;
  /** Error description message (overrides `error` mapping when provided) */
  message?: string;
  /**
   * The caught error. Mapped to a localized, user-safe message via
   * getErrorMessageKey — the raw error.message is never rendered.
   */
  error?: unknown;
  /** Optional retry callback - shows retry button when provided */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface ReportEmptyStateProps {
  /** Empty state title */
  title?: string;
  /** Empty state description message */
  message?: string;
  /** Custom icon component */
  Icon?: LucideIcon;
  /** Additional CSS classes */
  className?: string;
  /** Optional feature-owned guidance or actions */
  children?: ReactNode;
}

/**
 * Generic loading state for report cards
 * Features a modern animated spinner with smooth fade-in animation
 * Fully accessible with proper ARIA attributes
 */
export function ReportLoadingState({
  message,
  className,
}: ReportLoadingStateProps = {}) {
  const { t } = useTranslations();
  const displayMessage = message || t("common.loadingData");

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="overflow-hidden">
        <CardContent>
          <div
            className="flex items-center justify-center py-12 sm:py-16 animate-in fade-in duration-300"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="text-center space-y-4">
              {/* Modern animated spinner */}
              <div className="mx-auto h-8 w-8 rounded-full border-b-2 border-primary animate-spin" />
              <p className="text-sm sm:text-base text-muted-foreground">
                {displayMessage}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generic error state for report cards
 * Features accessible error icon, alert-style presentation, and optional retry
 * Fully accessible with proper ARIA attributes
 */
export function ReportErrorState({
  title,
  message,
  error,
  onRetry,
  className,
}: ReportErrorStateProps = {}) {
  const { t } = useTranslations();
  const errorTitle = title || t("component.errorState.title");
  const errorMessage =
    message ||
    (error !== undefined
      ? t(getErrorMessageKey(error))
      : t("component.errorState.retry"));

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="overflow-hidden">
        <CardContent>
          <div
            className="flex items-center justify-center py-12 sm:py-16 animate-in fade-in duration-300"
            role="alert"
            aria-live="assertive"
          >
            <div className="text-center space-y-4 max-w-sm mx-auto px-4">
              {/* Error icon with subtle background */}
              <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-destructive/10 animate-in zoom-in-50 duration-300">
                <AlertCircle
                  className="h-6 w-6 sm:h-7 sm:w-7 text-destructive"
                  aria-hidden="true"
                />
              </div>
              {/* Error title */}
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                {errorTitle}
              </h3>
              {/* Error message */}
              <p className="text-sm sm:text-base text-muted-foreground">
                {errorMessage}
              </p>
              {/* Optional retry button */}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200"
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

/**
 * Generic empty state for report cards
 * Features refined icon presentation with smooth animations
 * Fully accessible with proper semantic structure
 */
export function ReportEmptyState({
  title,
  message,
  Icon = FileSpreadsheet,
  className,
  children,
}: ReportEmptyStateProps = {}) {
  const { t } = useTranslations();
  const emptyTitle = title || t("component.emptyState.title");
  const emptyMessage = message || t("component.emptyState.noDataForFilters");

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="overflow-hidden">
        <CardContent>
          <div className="flex items-center justify-center py-12 sm:py-16 animate-in fade-in duration-300">
            <div className="text-center space-y-4 max-w-sm mx-auto px-4">
              {/* Icon with subtle muted background */}
              <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted animate-in zoom-in-50 duration-300">
                <Icon
                  className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              {/* Empty state title */}
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                {emptyTitle}
              </h3>
              {/* Empty state message */}
              <p className="text-sm sm:text-base text-muted-foreground">
                {emptyMessage}
              </p>
              {children ? <div className="pt-2">{children}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
