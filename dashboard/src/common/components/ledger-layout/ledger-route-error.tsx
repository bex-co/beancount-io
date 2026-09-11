import { useEffect } from "react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { isUnauthenticatedError } from "@/common/apollo/links/auth-error-link";
import { LedgerLayoutError } from "./ledger-layout-error";
import { NOINDEX_ROBOTS_CONTENT } from "@/common/lib/seo/indexability";

/**
 * Keeps errors thrown by the ledger route loader inside the ledger error
 * experience. Without a route-level component these errors escape to the root
 * fallback before LedgerLayout can mount.
 */
export function LedgerRouteError({ error, reset }: ErrorComponentProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const unauthenticated = isUnauthenticatedError(error);

  useEffect(() => {
    if (!unauthenticated) return;

    void navigate({
      to: "/auth/login",
      search: { next: pathname },
    });
  }, [navigate, pathname, unauthenticated]);

  const handleBackToDashboard = () => {
    void navigate({ to: "/ledger" });
  };

  // CatchBoundary.reset() only clears React error state; the match still
  // retains the loader error and rethrows. Invalidate clears that state and
  // reruns loaders so Try Again actually retries GetLedger.
  const handleRetry = () => {
    void router.invalidate().finally(() => {
      reset();
    });
  };

  return (
    <>
      <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      <LedgerLayoutError
        error={error}
        onBackToDashboard={handleBackToDashboard}
        onRetry={handleRetry}
      />
    </>
  );
}
