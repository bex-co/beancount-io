import {
  useParams,
  useNavigate,
  useLocation,
  Outlet,
} from "@tanstack/react-router";
import { SidebarProvider } from "@/common/components/ui/sidebar.tsx";
import { ErrorBoundary } from "@/common/components/error-boundary";
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

  const { data, error, refetch, loading } = useQuery(GetLedgerDocument, {
    variables: {
      ledgerId: ledgerId,
    },
    fetchPolicy: "cache-first",
  });

  const currentLedger = data?.getLedger;

  const handleBackToDashboard = () => {
    void navigate({ to: "/ledger" });
  };

  const handleRetry = () => {
    void refetch();
  };

  const isMobile = useIsMobile();
  const isCommitWorkspace = /\/(?:commits|commit\/[^/]+)\/?$/.test(
    location.pathname,
  );

  if (error) {
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
  if (loading || !currentLedger) {
    return <LedgerLayoutLoading />;
  }

  return (
    <LedgerProvider
      ledgerData={data.getLedger}
      ledgerName={ledgerName}
      ledgerOwner={ledgerOwner}
    >
      <LedgerSearchParamsProvider>
        <LedgerLayoutBackgroundQueries ledgerId={ledgerId} />
        <SidebarProvider>
          <div className="flex h-(--visual-viewport-height,100vh) w-full">
            <LedgerSidebar
              ledgerId={ledgerId}
              currentPath={location.pathname}
            />
            <main className="flex flex-1 flex-col min-w-0 w-full">
              {!isReactNative() && (
                <LayoutHeader ledgerId={ledgerId} isCompact={isMobile} />
              )}
              <div
                className={cn(
                  "relative flex min-h-0 flex-1 flex-col",
                  isCommitWorkspace ? "overflow-hidden" : "overflow-auto",
                  isMobile ? "p-2" : "p-4 sm:p-6",
                )}
              >
                <div className="max-w-full flex-1 flex flex-col min-h-0">
                  {/* Keyed by pathname so a caught error clears on navigation */}
                  <ErrorBoundary key={location.pathname}>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </LedgerSearchParamsProvider>
    </LedgerProvider>
  );
}
