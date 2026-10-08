import { ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { ErrorDetails } from "@/common/components/error-details";
import { isChunkLoadError } from "@/common/lib/errors/chunk-load-error";

interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

/**
 * Default ErrorBoundary fallback: localized and panel-sized. The failure
 * itself stays behind a collapsed disclosure the reader can copy to support.
 *
 * A chunk that failed to load means the page predates the current deploy.
 * Retrying cannot help — the router keeps the failed import — so that case
 * offers a full reload instead.
 */
export function ErrorBoundaryFallback({
  error,
  errorInfo,
  onRetry,
}: ErrorBoundaryFallbackProps) {
  const { t } = useTranslations();
  const staleBuild = isChunkLoadError(error);

  return (
    <Card className="overflow-hidden">
      <CardContent>
        <div
          className="flex items-center justify-center py-12 sm:py-16 animate-in fade-in duration-300"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center space-y-4 max-w-sm mx-auto px-4">
            <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle
                className="h-6 w-6 sm:h-7 sm:w-7 text-destructive"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {staleBuild
                ? t("common.errorBoundary.updateTitle")
                : t("common.errorBoundary.title")}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {staleBuild
                ? t("common.errorBoundary.updateDescription")
                : t("common.errorBoundary.description")}
            </p>
            {staleBuild ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {t("common.reloadPage")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t("common.tryAgain")}
              </Button>
            )}
            {error && (
              <ErrorDetails
                error={error}
                componentStack={errorInfo?.componentStack}
                className="mt-4"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
