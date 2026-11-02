import { BillingStatusBanner } from "@/common/components/billing/billing-status-banner";
import { FailedRenewalBanner } from "@/common/components/billing/failed-renewal-banner";
import {
  useParams,
  useNavigate,
  useLocation,
  useRouter,
  useRouterState,
  trimPathRight,
  Outlet,
} from "@tanstack/react-router";
import { SidebarProvider } from "@/common/components/ui/sidebar.tsx";
import { SIDEBAR_ROW_DIRECTION } from "@/common/components/ui/sidebar-row";
import { ErrorBoundary } from "@/common/components/error-boundary";
import { SkipToContentLink } from "@/common/components/skip-to-content";
import { MAIN_CONTENT_ID } from "@/common/lib/main-content";
import { parseLedgerFilterSearch } from "@/common/lib/ledger-search-params/parse";
import { ReportLoadingState } from "@/common/components/state-components";
import { LedgerLayoutError } from "./ledger-layout-error";
import { LedgerLayoutLoading } from "./ledger-layout-loading";
import { useQuery } from "@apollo/client/react";
import { GetLedgerDocument } from "@/graphql/definitions.ts";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import { createLedgerId } from "@/common/lib/utils/encode.ts";
import { LedgerLayoutBackgroundQueries } from "./ledger-layout-background-queries";
import { LedgerProvider } from "@/common/providers/ledger-provider";
import { LedgerSidebar } from "./ledger-sidebar";
import { cn } from "@/common/lib/utils/utils.ts";
import { useIsMobile } from "@/common/hooks/use-mobile.ts";
import { LayoutHeader } from "./layout-header";
import { isReactNative } from "@/common/providers/react-native-bridge-provider/react-native-bridge";
import { useRefreshFailedToast } from "@/common/hooks/use-refresh-failed-toast";
import { useState } from "react";

const COMMIT_DETAIL_PATH = /\/commit\/[^/]+\/?$/;

/**
 * Ledger layout component
 * Provides consistent sidebar and header layout for all ledger pages
 */
export function LedgerLayout() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const navigate = useNavigate();
  const location = useLocation();
  const router = useRouter();
  // Only hide an outlet whose data scope is changing. Local list/query URL
  // edits must preserve its input focus and in-flight work. Comparing matches
  // uses the same pathname encoding and also covers the first SSR navigation.
  const isRoutePending = useRouterState({
    select: (state) => {
      if (!state.isLoading) return false;
      const current = state.matches.at(-1);
      const next = state.pendingMatches?.at(-1);
      if (!current || !next) return true;
      // Choosing another commit in Version History keeps the workspace and
      // its loaded history pages; it shows its own pending detail (w4/246).
      if (
        current.routeId === next.routeId &&
        COMMIT_DETAIL_PATH.test(current.pathname) &&
        COMMIT_DETAIL_PATH.test(next.pathname)
      ) {
        return false;
      }
      if (
        current.routeId !== next.routeId ||
        trimPathRight(current.pathname) !== trimPathRight(next.pathname)
      ) {
        return true;
      }
      const before = parseLedgerFilterSearch(current.search);
      const after = parseLedgerFilterSearch(next.search);
      return (
        before.account !== after.account ||
        before.filter !== after.filter ||
        before.time !== after.time
      );
    },
  });

  const { data, previousData, error, refetch, loading } = useQuery(
    GetLedgerDocument,
    {
      variables: {
        ledgerId: ledgerId,
      },
      fetchPolicy: "cache-first",
    },
  );

  // A cache clear (a write, or Out of date → Refresh) refetches this query
  // with the old ledger still in `data`, and keeps it there if the refetch
  // fails. A page this layout already showed for the same ledger stays
  // mounted through both, so an unsaved file or BQL draft and the reader's
  // focus survive (w4/238, w4/m46); a failure is reported with Try again. A
  // first mount still waits for the access read (Smart Import / Upload
  // Receipt access), and a failed one still shows the error page. Apollo's
  // previousData is only reused for this same ledger.
  const ledgerKey = ledgerId.toLowerCase();
  const previousLedger = previousData?.getLedger;
  const currentLedger =
    data?.getLedger ??
    (previousLedger?.fullName.toLowerCase() === ledgerKey
      ? previousLedger
      : undefined);
  const [shownLedger, setShownLedger] = useState<string | null>(null);
  const keepShown = shownLedger === ledgerKey && currentLedger !== undefined;

  const handleBackToDashboard = () => {
    void navigate({ to: "/ledger" });
  };

  const handleRetry = () => {
    void refetch();
  };
  useRefreshFailedToast(keepShown ? error : undefined, handleRetry);

  const isMobile = useIsMobile();
  const isCommitWorkspace = /\/(?:commits|commit\/[^/]+)\/?$/.test(
    location.pathname,
  );

  if (error && !keepShown) {
    return (
      <LedgerLayoutError
        onBackToDashboard={handleBackToDashboard}
        onRetry={handleRetry}
        error={error}
      />
    );
  }

  // If no data yet, show loading skeleton
  // This ensures server and client render the same thing during initial load
  if (!currentLedger || (loading && data?.getLedger && !keepShown)) {
    return <LedgerLayoutLoading />;
  }
  if (shownLedger !== ledgerKey) setShownLedger(ledgerKey);

  return (
    <LedgerProvider
      ledgerData={currentLedger}
      ledgerName={ledgerName}
      ledgerOwner={ledgerOwner}
    >
      <LedgerSearchParamsProvider>
        <LedgerLayoutBackgroundQueries ledgerId={ledgerId} />
        <SidebarProvider>
          <div
            className={cn(
              "flex h-(--visual-viewport-height,100vh) w-full",
              SIDEBAR_ROW_DIRECTION,
            )}
          >
            <SkipToContentLink />
            <LedgerSidebar
              ledgerId={ledgerId}
              currentPath={location.pathname}
            />
            <main
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              aria-busy={isRoutePending || undefined}
              className="flex flex-1 flex-col min-w-0 w-full outline-none"
            >
              {!isReactNative() && (
                <LayoutHeader ledgerId={ledgerId} isCompact={isMobile} />
              )}
              <BillingStatusBanner />
              <FailedRenewalBanner />
              <div
                data-scroll-restoration-id="ledger-content"
                className={cn(
                  "relative flex min-h-0 flex-1 flex-col",
                  isCommitWorkspace ? "overflow-hidden" : "overflow-auto",
                  isMobile ? "p-2" : "p-4 sm:p-6",
                )}
              >
                <div className="max-w-full flex-1 flex flex-col min-h-0">
                  {isRoutePending ? (
                    <ReportLoadingState />
                  ) : (
                    // Key by ledger so a switch never keeps the previous
                    // ledger's mounted page body under the new URL.
                    // Try Again reruns the failed child loader (a commit or
                    // file read), not only this boundary (w4/264).
                    <ErrorBoundary
                      key={ledgerId}
                      resetKey={location.pathname}
                      onRetry={() => router.invalidate()}
                    >
                      <Outlet />
                    </ErrorBoundary>
                  )}
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </LedgerSearchParamsProvider>
    </LedgerProvider>
  );
}
