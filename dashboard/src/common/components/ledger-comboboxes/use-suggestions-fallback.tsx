import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { NetworkStatus } from "@apollo/client";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

interface SuggestionsQuery {
  error?: unknown;
  networkStatus: NetworkStatus;
  refetch: () => Promise<unknown>;
}

/**
 * A suggestions read only offers options; the value belongs to the parent
 * form (w4/m35). When the read fails the field stays mounted and editable,
 * its options are withheld rather than shown stale, and a notice under it
 * offers an in-place retry. The skeleton is for the first load only, so a
 * retry never remounts the field or drops its focus.
 */
export function useSuggestionsFallback(
  { error, networkStatus, refetch }: SuggestionsQuery,
  hasData: boolean,
  describedBy: string | undefined,
): {
  initialLoading: boolean;
  failed: boolean;
  describedBy: string | undefined;
  notice: ReactNode;
} {
  const { t } = useTranslations();
  const noticeId = useId();
  const retrying = networkStatus === NetworkStatus.refetch;
  const failed = Boolean(error) || (retrying && !hasData);

  // Keyboard recovery keeps its place (w4/m35 t003). The retry stays
  // focusable while it runs (a disabled button drops focus to the dialog),
  // so a failed attempt leaves focus on it; a successful one removes it, and
  // focus goes to the field it was offered for, unless the reader moved on.
  const retryButton = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const field = returnTo.current;
    if (failed || !field) return;
    returnTo.current = null;
    const active = document.activeElement;
    const lost = !active || active === document.body || active.contains(field);
    if (lost && field.isConnected) field.focus();
  }, [failed]);

  const retry = () => {
    if (retrying) return;
    returnTo.current =
      document.activeElement === retryButton.current
        ? document.querySelector<HTMLElement>(
            `[aria-describedby~="${noticeId}"]`,
          )
        : null;
    void refetch().catch(() => undefined);
  };

  return {
    initialLoading:
      networkStatus === NetworkStatus.loading ||
      networkStatus === NetworkStatus.setVariables,
    failed,
    describedBy: failed
      ? [describedBy, noticeId].filter(Boolean).join(" ")
      : describedBy,
    notice: failed ? (
      <p
        id={noticeId}
        className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"
      >
        {t("component.suggestions.unavailable")}
        <Button
          ref={retryButton}
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          aria-disabled={retrying || undefined}
          aria-busy={retrying || undefined}
          onClick={retry}
        >
          {t("common.tryAgain")}
          {retrying && (
            <span
              aria-hidden="true"
              className="size-3 rounded-full border-2 border-current/30 border-t-current animate-spin [animation-duration:0.6s]"
            />
          )}
        </Button>
      </p>
    ) : undefined,
  };
}
