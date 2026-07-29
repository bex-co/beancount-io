import { Skeleton } from "@/common/components/ui/skeleton.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/common/components/ui/sidebar.tsx";

/**
 * Loading skeleton for ledger sidebar
 */
function LedgerSidebarSkeleton() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: 10 }).map((_, index) => (
                <SidebarMenuItem key={index}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Loading skeleton header component
 */
function LoadingHeader() {
  const { state, isMobile, openMobile } = useSidebar();

  // Only show trigger when sidebar is hidden
  const showTrigger = isMobile ? !openMobile : state === "collapsed";

  return (
    <header className="hidden sm:block h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showTrigger && <SidebarTrigger className="-ml-1" />}
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-9 w-80" />
        </div>
      </div>
      <div className="lg:hidden border-t bg-muted/30 px-4 py-2">
        <Skeleton className="h-9 w-full" />
      </div>
    </header>
  );
}

/**
 * Loading component for the entire ledger layout
 */
export function LedgerLayoutLoading() {
  return (
    <SidebarProvider>
      <div className="flex h-[var(--visual-viewport-height,100vh)] w-full">
        <LedgerSidebarSkeleton />
        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <LoadingHeader />
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
