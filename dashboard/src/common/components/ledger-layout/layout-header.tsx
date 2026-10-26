import { useContext, useRef, useState } from "react";
import { useHydrated, useLocation, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  Github,
  ListFilter,
  LogIn,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
import { useSafeReturnPath } from "@/common/hooks/use-safe-return-path";
import { SidebarTrigger, useSidebar } from "@/common/components/ui/sidebar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet.tsx";
import { Badge } from "@/common/components/ui/badge.tsx";
import { LedgerSearchControls } from "@/common/components/ledger-search-controls";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { docsUrl } from "@/common/lib/docs-url";
import { cn } from "@/common/lib/utils/utils";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider";
import { Authenticated } from "../authenticated";
import { UserNav } from "../user-nav.tsx";
import { ImportDropdown } from "./import-dropdown.tsx";
import { LedgerOutOfDateIndicator } from "./ledger-out-of-date-indicator";
import { LedgerWritePermission } from "../ledger-permission/write.tsx";

function shouldShowLedgerFilters(pathname: string): boolean {
  return (
    /^\/ledger\/[^/]+\/[^/]+\/?$/.test(pathname) ||
    pathname.includes("/journal") ||
    pathname.includes("/income-statement") ||
    pathname.includes("/balance-sheet") ||
    pathname.includes("/trial-balance") ||
    pathname.includes("/account/") ||
    pathname.includes("/events") ||
    pathname.includes("/statistics") ||
    pathname.includes("/cash-flow")
  );
}

export function LayoutHeader({
  ledgerId,
  isCompact = false,
}: {
  ledgerId: string;
  isCompact?: boolean;
}) {
  const { isMobile, openMobile } = useSidebar();
  const location = useLocation();
  const { t, i18n } = useTranslations();
  const returnPath = useSafeReturnPath();
  const { searchParams } = useContext(LedgerSearchParamsContext);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The sheet opens from client state, so a click before hydration does
  // nothing and is not replayed; the trigger waits until it can (w4/1101).
  const hydrated = useHydrated();
  const filtersOpenerRef = useRef<HTMLButtonElement>(null);
  const inlineFiltersRef = useRef<HTMLDivElement>(null);
  // The header can change layout while the filter sheet is open (a wider
  // window, the sidebar collapsing): its Filters button hides and the inline
  // fields show. Closing returns to whichever of the two is shown (w4/991).
  const returnFromFilters = (event: Event) => {
    const shown = (element: Element | null | undefined) =>
      !!element && element.getClientRects().length > 0;
    if (shown(filtersOpenerRef.current)) return;
    // Its first field (Time), not the Clear all that leads the row.
    const inlineFilters = inlineFiltersRef.current;
    const inline =
      inlineFilters?.querySelector<HTMLElement>("input") ??
      inlineFilters?.querySelector<HTMLElement>("button");
    if (!shown(inline)) return;
    event.preventDefault();
    inline!.focus();
  };

  // On desktop the sidebar now collapses to an icon rail (not fully off), so
  // keep the toggle always visible to make collapsing discoverable. On mobile
  // it opens the off-canvas sheet, so only show it while the sheet is closed.
  const showTrigger = isMobile ? !openMobile : true;
  const shouldShowFilters = shouldShowLedgerFilters(location.pathname);
  const activeFilterCount = Object.values(searchParams).filter(
    (value) => value !== "",
  ).length;

  return (
    <header
      className={cn(
        "@container/ledger-header shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        isCompact ? "h-12" : "h-16",
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showTrigger && <SidebarTrigger className="-ml-1" />}
        </div>
        <div className="flex items-center gap-2">
          {shouldShowFilters && (
            <>
              <div
                ref={inlineFiltersRef}
                className="hidden @min-[52rem]/ledger-header:block"
              >
                <LedgerSearchControls ledgerId={ledgerId} layout="inline" />
              </div>
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    ref={filtersOpenerRef}
                    variant="outline"
                    size="sm"
                    className="@min-[52rem]/ledger-header:hidden"
                    aria-label={t("component.searchControls.filters")}
                    disabled={!hydrated}
                  >
                    <ListFilter className="h-4 w-4" />
                    <span className="ml-1.5 hidden xs:inline">
                      {t("component.searchControls.filters")}
                    </span>
                    {activeFilterCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 h-5 min-w-5 px-1"
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[85vh] gap-0 overflow-y-auto"
                  onCloseAutoFocus={returnFromFilters}
                >
                  <SheetHeader className="text-left">
                    <SheetTitle>
                      {t("component.searchControls.filtersTitle")}
                    </SheetTitle>
                    <SheetDescription>
                      {t("component.searchControls.filtersDescription")}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-6 pt-2">
                    <LedgerSearchControls ledgerId={ledgerId} layout="stack" />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
          <Authenticated
            fallback={
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/auth/login"
                  // Come back to this page, its filters and fragment (w4/237).
                  search={{ next: returnPath }}
                  aria-label={t("auth.login")}
                >
                  <LogIn className="h-4 w-4 xs:mr-2" />
                  <span className="hidden xs:inline">{t("auth.login")}</span>
                </Link>
              </Button>
            }
          >
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-accent data-[state=open]:bg-accent"
                      aria-label={t("common.helpAndSupport")}
                    >
                      <CircleHelp className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t("common.helpAndSupport")}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem asChild>
                  <a
                    // In the reader's language; English is at the root (w4/330).
                    href={docsUrl(i18n.language, "help-center")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="items-start"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4" />
                    <div className="flex flex-1 flex-col">
                      <span>{t("common.helpCenter")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("common.helpCenterDescription")}
                      </span>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://t.me/beancount"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="items-start"
                  >
                    <MessageCircle className="mt-0.5 h-4 w-4" />
                    <div className="flex flex-1 flex-col">
                      <span>{t("common.communitySupport")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("common.communitySupportDescription")}
                      </span>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://github.com/bex-co/beancount-io/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="items-start"
                  >
                    <Github className="mt-0.5 h-4 w-4" />
                    <div className="flex flex-1 flex-col">
                      <span>{t("common.requestFeature")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("common.requestFeatureDescription")}
                      </span>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <LedgerWritePermission>
              <ImportDropdown />
            </LedgerWritePermission>
            <LedgerOutOfDateIndicator ledgerId={ledgerId} />
            <UserNav />
          </Authenticated>
        </div>
      </div>
    </header>
  );
}
