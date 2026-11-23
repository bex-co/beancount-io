import { type RefObject, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { EXACT_PAGE_LINK } from "@/common/lib/navigation/active-options";
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Database,
  FileSpreadsheet,
  Folder,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Search,
  Settings,
  Sheet,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/common/components/ui/sidebar.tsx";
import { SidebarNavigation } from "@/common/components/sidebar-navigation";
import { decodeLedgerId } from "@/common/lib/utils/encode.ts";
import { getUpcomingEventsDays } from "@/common/lib/fava-options";
import { countUpcomingEvents } from "@/common/lib/events/upcoming-events";
import { useLedger } from "@/common/hooks/use-ledger.ts";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { LedgerSwitcher } from "./ledger-switcher";
import { Authenticated } from "../authenticated";
import { AccountCombobox } from "./go-to-account.tsx";
import { AddDirectiveButton } from "./add-directive-button.tsx";
import { DirectiveUsageIndicator } from "./directive-usage-indicator.tsx";
import { LedgerSidebarGroup } from "./ledger-sidebar-group";
import { LedgerOwnerPermission } from "@/common/components/ledger-permission/owner";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerErrorsDocument,
  GetLedgerEventsDocument,
} from "@/graphql/definitions.ts";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  rightContent?: React.ReactNode;
  hidden?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  /**
   * Where the group's own label navigates. Only a group with one obvious first
   * read declares it; the rest keep a label that just discloses their items.
   */
  landingPath?: string;
  badge?: number;
  destructiveBadge?: boolean;
}

interface LedgerSidebarProps {
  ledgerId: string;
  currentPath: string;
}

const NO_GROUPS: ReadonlySet<string> = new Set();

/**
 * Ledger navigation organized around common user jobs. Specialist destinations
 * remain reachable through grouped disclosure while primary workflows stay at
 * the first level.
 */
/**
 * Collapse and expand, on the sidebar itself: from a tablet up the sidebar is
 * always on screen, so its control lives with it, not in the page header
 * (only a phone's drawer needs that). On a tablet it opens the sidebar over
 * the page; Ctrl+B and, on a desktop, the sidebar's edge do the same.
 */
function SidebarCollapseToggle({
  navigationId,
  toggleRef,
  focusFirstLink,
}: {
  navigationId: string;
  toggleRef: RefObject<HTMLButtonElement | null>;
  focusFirstLink: () => void;
}) {
  const { isTablet, state, toggleSidebar } = useSidebar();
  const { t } = useTranslations();
  const expanded = state === "expanded";
  const label = expanded
    ? t("common.collapseSidebar")
    : t("common.expandSidebar");
  const Icon = expanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        ref={toggleRef}
        aria-expanded={expanded}
        aria-controls={navigationId}
        onClick={() => {
          toggleSidebar();
          if (isTablet) {
            if (expanded) toggleRef.current?.focus();
            else focusFirstLink();
          }
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Icon className="rtl:-scale-x-100" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function LedgerSidebar({ ledgerId, currentPath }: LedgerSidebarProps) {
  const { setOpenMobile, isMobile, state } = useSidebar();
  const navigationId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const overviewLinkRef = useRef<HTMLAnchorElement>(null);
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
  const { ledgerData } = useLedger();
  const { t } = useTranslations();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  // The page's own group opens on arrival, but the reader may still close it:
  // that choice holds on this page, and arriving on another page reveals its
  // group again (w4/300).
  const [closedGroups, setClosedGroups] = useState(() => ({
    path: currentPath,
    ids: new Set<string>(),
  }));
  const closedHere =
    closedGroups.path === currentPath ? closedGroups.ids : NO_GROUPS;

  const { data: errorsData } = useQuery(GetLedgerErrorsDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });
  const { data: eventsData } = useQuery(GetLedgerEventsDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  const errorCount = errorsData?.getLedgerErrors?.length ?? 0;
  const upcomingEventCount = countUpcomingEvents(
    eventsData?.getLedgerEvents ?? [],
    getUpcomingEventsDays(ledgerData),
  );

  const ledgerPath = `/ledger/${ledgerOwner}/${ledgerName}`;

  const primaryMenuItems: MenuItem[] = [
    {
      id: "overview",
      label: t("common.overview"),
      icon: BarChart3,
      path: ledgerPath,
    },
    {
      id: "journal",
      label: t("journal.journal"),
      icon: Sheet,
      path: `${ledgerPath}/journal`,
      rightContent: (
        <Authenticated>
          <AddDirectiveButton ledgerId={ledgerId} />
        </Authenticated>
      ),
    },
    {
      id: "accounts",
      label: t("page.accounts.accounts"),
      icon: BookOpen,
      path: `${ledgerPath}/accounts`,
      rightContent: (
        <AccountCombobox>
          <SidebarMenuAction
            onClick={(event) => event.stopPropagation()}
            aria-label={t("page.accounts.searchAccounts")}
          >
            <Search className="h-4 w-4" />
          </SidebarMenuAction>
        </AccountCombobox>
      ),
    },
    {
      id: "budget",
      label: t("page.budget.budget"),
      icon: Wallet,
      path: `${ledgerPath}/budget`,
    },
  ];

  const reportMenuItems: MenuItem[] = [
    {
      id: "income-statement",
      label: t("common.incomeStatement"),
      icon: FileSpreadsheet,
      path: `${ledgerPath}/income-statement`,
    },
    {
      id: "balance-sheet",
      label: t("common.balanceSheet"),
      icon: FileSpreadsheet,
      path: `${ledgerPath}/balance-sheet`,
    },
    {
      id: "cash-flow",
      label: t("common.cashFlow"),
      icon: ArrowLeftRight,
      path: `${ledgerPath}/cash-flow`,
    },
    {
      id: "trial-balance",
      label: t("common.trialBalance"),
      icon: FileSpreadsheet,
      path: `${ledgerPath}/trial-balance`,
    },
    {
      id: "holdings",
      label: t("page.holdings.holdings"),
      icon: FileSpreadsheet,
      path: `${ledgerPath}/holdings`,
    },
    {
      id: "statistics",
      label: t("page.statistics.statistics"),
      icon: FileSpreadsheet,
      path: `${ledgerPath}/statistics`,
    },
  ];

  const importMenuItems: MenuItem[] = [
    {
      id: "smart-import",
      label: t("common.smartImport"),
      icon: Sparkles,
      path: `${ledgerPath}/import`,
    },
    {
      id: "upload-receipt",
      label: t("common.uploadReceipt"),
      icon: ScanLine,
      path: `${ledgerPath}/receipt`,
    },
    {
      id: "bank",
      label: t("plaid.sidebar.label"),
      icon: Sparkles,
      path: `${ledgerPath}/link`,
    },
  ];

  const advancedMenuItems: MenuItem[] = [
    {
      id: "query",
      label: t("page.bql.query"),
      icon: Database,
      path: `${ledgerPath}/query`,
    },
    {
      id: "commodities",
      label: t("page.commodities.commodities"),
      icon: Database,
      path: `${ledgerPath}/commodities`,
    },
    {
      id: "documents",
      label: t("page.documents.documents"),
      icon: Database,
      path: `${ledgerPath}/documents`,
    },
  ];

  const statusMenuItems: MenuItem[] = [
    {
      id: "errors",
      label: t("page.errors.errors"),
      icon: AlertCircle,
      path: `${ledgerPath}/errors`,
      hidden: errorCount === 0 && currentPath !== `${ledgerPath}/errors`,
      rightContent:
        errorCount > 0 ? (
          <SidebarMenuBadge className="bg-destructive text-white peer-hover/menu-button:text-white peer-data-[active=true]/menu-button:text-white">
            {errorCount}
          </SidebarMenuBadge>
        ) : null,
    },
    {
      id: "events",
      label: t("page.events.events"),
      icon: AlertCircle,
      path: `${ledgerPath}/events`,
      hidden:
        upcomingEventCount === 0 && currentPath !== `${ledgerPath}/events`,
      rightContent:
        upcomingEventCount > 0 ? (
          <SidebarMenuBadge>{upcomingEventCount}</SidebarMenuBadge>
        ) : null,
    },
  ];
  const visibleStatusMenuItems = statusMenuItems.filter((item) => !item.hidden);

  const menuGroups: MenuGroup[] = [
    {
      id: "reports",
      label: t("common.reports"),
      icon: FileSpreadsheet,
      items: reportMenuItems,
      landingPath: `${ledgerPath}/income-statement`,
    },
    {
      id: "import",
      label: t("common.import"),
      icon: Sparkles,
      items: importMenuItems,
    },
    {
      id: "advanced",
      label: t("common.advanced"),
      icon: Database,
      items: advancedMenuItems,
    },
    ...(visibleStatusMenuItems.length > 1
      ? [
          {
            id: "status",
            label: t("common.status"),
            icon: AlertCircle,
            items: visibleStatusMenuItems,
            badge: errorCount + upcomingEventCount,
            destructiveBadge: errorCount > 0,
          },
        ]
      : []),
  ];

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleGroup = (groupId: string, open: boolean) => {
    const without = (ids: ReadonlySet<string>) =>
      new Set([...ids].filter((id) => id !== groupId));
    setOpenGroups((current) =>
      open ? without(current) : new Set(current).add(groupId),
    );
    setClosedGroups({
      path: currentPath,
      ids: open ? new Set(closedHere).add(groupId) : without(closedHere),
    });
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = currentPath === item.path;

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
          <Link
            ref={item.id === "overview" ? overviewLinkRef : undefined}
            to={item.path}
            onClick={handleNavigate}
            {...EXACT_PAGE_LINK}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {item.rightContent}
      </SidebarMenuItem>
    );
  };

  const renderMenuGroup = (group: MenuGroup) => {
    const visibleItems = group.items.filter((item) => !item.hidden);
    const hasActiveItem = visibleItems.some(
      (item) => item.path === currentPath,
    );

    const isOpen =
      (hasActiveItem && !closedHere.has(group.id)) || openGroups.has(group.id);
    return (
      <LedgerSidebarGroup
        key={group.id}
        label={group.label}
        icon={group.icon}
        items={visibleItems}
        currentPath={currentPath}
        isActive={hasActiveItem}
        onNavigate={handleNavigate}
        landingPath={group.landingPath}
        inRail={state === "collapsed" && !isMobile}
        inlineOpen={isOpen}
        onInlineToggle={() => toggleGroup(group.id, isOpen)}
        badge={group.badge}
        destructiveBadge={group.destructiveBadge}
      >
        {visibleItems.map((item) => (
          <SidebarMenuSubItem key={item.id}>
            <SidebarMenuSubButton asChild isActive={currentPath === item.path}>
              <Link
                to={item.path}
                onClick={handleNavigate}
                {...EXACT_PAGE_LINK}
              >
                <span>{item.label}</span>
              </Link>
            </SidebarMenuSubButton>
            {item.rightContent}
          </SidebarMenuSubItem>
        ))}
      </LedgerSidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" tabletToggleRef={toggleRef}>
      <SidebarNavigation id={navigationId} label={t("common.ledgerNavigation")}>
        <SidebarHeader className="h-12 md:h-14 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex flex-row items-center p-2">
          <LedgerSwitcher
            currentLedgerId={ledgerId}
            currentLedgerName={ledgerName}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryMenuItems.map(renderMenuItem)}
                {menuGroups.slice(0, 2).map(renderMenuGroup)}
                {renderMenuItem({
                  id: "files",
                  label: t("ledgerEditor.files"),
                  icon: Folder,
                  path: `${ledgerPath}/files/tree/main`,
                })}
                {menuGroups.slice(2).map(renderMenuGroup)}
                {visibleStatusMenuItems.length === 1
                  ? renderMenuItem(visibleStatusMenuItems[0])
                  : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {renderMenuItem({
              id: "agent",
              label: t("aiAgent.title"),
              icon: MessageSquare,
              path: `${ledgerPath}/agent`,
            })}
            {renderMenuItem({
              id: "settings",
              label: t("common.ledgerSettings"),
              icon: Settings,
              path: `${ledgerPath}/settings`,
            })}
            {!isMobile && (
              <SidebarCollapseToggle
                navigationId={navigationId}
                toggleRef={toggleRef}
                focusFirstLink={() => overviewLinkRef.current?.focus()}
              />
            )}
          </SidebarMenu>
          {/* Usage card can't shrink to the icon rail; hide it when collapsed. */}
          <div className="rail:hidden">
            <LedgerOwnerPermission>
              <DirectiveUsageIndicator ledgerId={ledgerId} />
            </LedgerOwnerPermission>
          </div>
        </SidebarFooter>
      </SidebarNavigation>
      <SidebarRail />
    </Sidebar>
  );
}
