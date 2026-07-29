import { ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

/**
 * Default ErrorBoundary fallback: localized, panel-sized, and safe for end
 * users — stack traces are only rendered in dev builds.
 */
export function ErrorBoundaryFallback({
  error,
  errorInfo,
  onRetry,
}: ErrorBoundaryFallbackProps) {
  const { t } = useTranslations();

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
              {t("common.errorBoundary.title")}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("common.errorBoundary.description")}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("common.tryAgain")}
            </Button>
            {import.meta.env.DEV && error && (
              <details className="text-left whitespace-pre-wrap mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  {t("common.errorDetails")}
                </summary>
                <pre className="text-xs overflow-auto mt-2">
                  {error.stack || error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
