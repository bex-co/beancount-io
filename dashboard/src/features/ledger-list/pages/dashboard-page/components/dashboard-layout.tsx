import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/common/components/ui/sidebar.tsx";
import { SIDEBAR_ROW_DIRECTION } from "@/common/components/ui/sidebar-row";
import { Authenticated } from "@/common/components/authenticated";
import { cn } from "@/common/lib/utils/utils";
import { SkipToContentLink } from "@/common/components/skip-to-content";
import { MAIN_CONTENT_ID } from "@/common/lib/main-content";
import { UserNav } from "@/common/components/user-nav.tsx";
import { DashboardSidebar } from "./dashboard-sidebar";

/**
 * Header component for dashboard page
 */
function DashboardHeader() {
  const { state, isMobile, openMobile } = useSidebar();

  // Only show trigger when sidebar is hidden
  const showTrigger = isMobile ? !openMobile : state === "collapsed";

  return (
    <header className="sticky top-0 z-50 h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showTrigger && <SidebarTrigger className="-ml-1" />}
        </div>
        <Authenticated>
          <UserNav />
        </Authenticated>
      </div>
    </header>
  );
}

/**
 * Dashboard layout component
 * Provides consistent sidebar and header layout for the dashboard page
 */
export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div
        className={cn(
          "flex h-(--visual-viewport-height,100vh) w-full",
          SIDEBAR_ROW_DIRECTION,
        )}
      >
        <SkipToContentLink />
        <DashboardSidebar />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex flex-1 flex-col min-w-0 w-full outline-none"
        >
          <DashboardHeader />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
