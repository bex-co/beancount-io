import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  Database,
  FileSpreadsheet,
  Folder,
  MessageSquare,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/common/components/ui/sidebar.tsx";
import { decodeLedgerId } from "@/common/lib/utils/encode.ts";
import { getUpcomingEventsDays } from "@/common/lib/fava-options";
import { useLedger } from "@/common/hooks/use-ledger.ts";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { LedgerSwitcher } from "./ledger-switcher";
import { Authenticated } from "../authenticated";
import { AccountCombobox } from "./go-to-account.tsx";
import { AddDirectiveButton } from "./add-directive-button.tsx";
import { DirectiveUsageIndicator } from "./directive-usage-indicator.tsx";
import { LedgerGroupFlyout } from "./ledger-group-flyout.tsx";
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
  badge?: number;
  destructiveBadge?: boolean;
}

interface LedgerSidebarProps {
  ledgerId: string;
  currentPath: string;
}

function countUpcomingEvents(
  events: Array<{ date: string }>,
  upcomingEventsDays: number,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + upcomingEventsDays);

  const todayString = today.toISOString().slice(0, 10);
  const endDateString = endDate.toISOString().slice(0, 10);

  return events.filter(
    (event) => event.date >= todayString && event.date <= endDateString,
  ).length;
}

/**
 * Ledger navigation organized around common user jobs. Specialist destinations
 * remain reachable through grouped disclosure while primary workflows stay at
 * the first level.
 */
export function LedgerSidebar({ ledgerId, currentPath }: LedgerSidebarProps) {
  const { setOpenMobile, isMobile, state } = useSidebar();
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
  const { ledgerData } = useLedger();
  const { t } = useTranslations();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

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
          <SidebarMenuBadge className="bg-destructive text-white">
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

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = currentPath === item.path;

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
          <Link to={item.path} onClick={handleNavigate}>
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

    // Collapsed to the icon rail: the inline submenu is hidden, so surface the
    // group's destinations through a hover/click flyout instead of a dead icon.
    if (state === "collapsed" && !isMobile) {
      return (
        <LedgerGroupFlyout
          key={group.id}
          label={group.label}
          icon={group.icon}
          items={visibleItems}
          currentPath={currentPath}
          isActive={hasActiveItem}
          onNavigate={handleNavigate}
        />
      );
    }

    const isOpen = hasActiveItem || openGroups.has(group.id);
    const Icon = group.icon;
    const submenuId = `ledger-sidebar-${group.id}`;

    return (
      <SidebarMenuItem key={group.id}>
        <SidebarMenuButton
          onClick={() => toggleGroup(group.id)}
          isActive={hasActiveItem}
          tooltip={group.label}
          aria-expanded={isOpen}
          aria-controls={submenuId}
        >
          <Icon className="h-4 w-4" />
          <span>{group.label}</span>
          {group.badge ? (
            <span
              className={
                group.destructiveBadge
                  ? "ml-auto rounded-md bg-destructive px-1.5 text-xs font-medium text-white tabular-nums"
                  : "ml-auto text-xs font-medium tabular-nums"
              }
            >
              {group.badge}
            </span>
          ) : (
            <span className="ml-auto" />
          )}
          <ChevronDown
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </SidebarMenuButton>
        {isOpen && (
          <SidebarMenuSub id={submenuId}>
            {visibleItems.map((item) => (
              <SidebarMenuSubItem key={item.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={currentPath === item.path}
                >
                  <Link to={item.path} onClick={handleNavigate}>
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
                {item.rightContent}
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex flex-row items-center p-2">
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
        </SidebarMenu>
        {/* Usage card can't shrink to the icon rail; hide it when collapsed. */}
        <div className="group-data-[collapsible=icon]:hidden">
          <LedgerOwnerPermission>
            <DirectiveUsageIndicator ledgerId={ledgerId} />
          </LedgerOwnerPermission>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
