import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";
import { formatErrorReport } from "@/common/lib/errors/error-report";

interface ErrorDetailsProps {
  error: unknown;
  componentStack?: string | null;
  className?: string;
}

/**
 * Collapsed disclosure holding a copyable report of a failure, so a reader can
 * send support exactly what went wrong instead of a screenshot of the
 * fallback. Shown in production too: the report describes the app's own
 * failure to the person who hit it.
 */
export function ErrorDetails({
  error,
  componentStack,
  className,
}: ErrorDetailsProps) {
  const { t } = useTranslations();

  // Built once per mount: the time and URL are those of the failure, not of
  // a later re-render.
  const [report] = useState(() =>
    formatErrorReport({
      error,
      componentStack,
      url: typeof window === "undefined" ? "" : window.location.href,
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      time: new Date(),
    }),
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success(t("common.copiedToClipboard"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
  };

  return (
    <details className={cn("text-left", className)}>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        {t("common.errorDetails")}
      </summary>
      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
        {report}
      </pre>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => void handleCopy()}
      >
        {t("common.copy")}
      </Button>
    </details>
  );
}
