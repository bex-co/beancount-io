import { useLocation, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  Github,
  LogIn,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
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
import { LedgerSearchControls } from "@/common/components/ledger-search-controls";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { cn } from "@/common/lib/utils/utils";
import { Authenticated } from "../authenticated";
import { UserNav } from "../user-nav.tsx";
import { ImportDropdown } from "./import-dropdown.tsx";
import { LedgerOutOfDateIndicator } from "./ledger-out-of-date-indicator";
import { LedgerWritePermission } from "../ledger-permission/write.tsx";

export function LayoutHeader({
  ledgerId,
  isCompact = false,
}: {
  ledgerId: string;
  isCompact?: boolean;
}) {
  const { isMobile, openMobile } = useSidebar();
  const location = useLocation();
  const { t } = useTranslations();

  // On desktop the sidebar now collapses to an icon rail (not fully off), so
  // keep the toggle always visible to make collapsing discoverable. On mobile
  // it opens the off-canvas sheet, so only show it while the sheet is closed.
  const showTrigger = isMobile ? !openMobile : true;

  const isIndexRoute = /^\/ledger\/[^/]+\/[^/]+\/?$/.test(location.pathname);
  const shouldShowFilters =
    isIndexRoute ||
    location.pathname.includes("/journal") ||
    location.pathname.includes("/income-statement") ||
    location.pathname.includes("/balance-sheet") ||
    location.pathname.includes("/trial-balance") ||
    location.pathname.includes("/account/") ||
    location.pathname.includes("/events") ||
    location.pathname.includes("/statistics");

  return (
    <header
      className={cn(
        "shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        isCompact ? "h-12" : "h-16",
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showTrigger && <SidebarTrigger className="-ml-1" />}
        </div>
        <div className="flex items-center gap-2">
          {shouldShowFilters && (
            <div className="hidden lg:block">
              <LedgerSearchControls ledgerId={ledgerId} />
            </div>
          )}
          <Authenticated
            fallback={
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("auth.login")}
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
                    href="https://beancount.io/docs/help-center"
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
