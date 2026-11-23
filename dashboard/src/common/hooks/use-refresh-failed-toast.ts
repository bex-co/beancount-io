import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isDraftSessionError } from "@/common/apollo/links/auth-error-link";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

const REFRESH_FAILED_TOAST = "ledger-refresh-failed";

/**
 * Report a failed refetch of content a view keeps showing, with Try again.
 * The ledger page and its open file can both fail on one Out of date →
 * Refresh; each keeps what it already shows rather than an error page, and
 * they share one toast (w4/m46).
 */
export function useRefreshFailedToast(error: unknown, retry: () => void) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  // The latest label and retry, without re-raising the toast every render.
  const latest = useRef({ retry, label: t("common.tryAgain") });
  useEffect(() => {
    latest.current = { retry, label: t("common.tryAgain") };
  });
  useEffect(() => {
    if (!error || isDraftSessionError(error)) return;
    toast.error(formatError(error), {
      id: REFRESH_FAILED_TOAST,
      action: {
        label: latest.current.label,
        onClick: () => latest.current.retry(),
      },
    });
  }, [error, formatError]);
}
