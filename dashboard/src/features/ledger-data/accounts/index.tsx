import {
  Fragment,
  useState,
  useMemo,
  useRef,
  useContext,
  type ReactNode,
} from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  Link,
  useHydrated,
  useParams,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { GetLedgerAccountDirectivesDocument } from "@/graphql/definitions";
import { createLedgerId } from "@/common/lib/utils/encode";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider";
import { useLedger } from "@/common/hooks/use-ledger";
import { OpenAccountDialog } from "@/features/ledger-data/accounts/open-account-dialog";
import { useLedgerWriteRefresh } from "@/common/hooks/use-apollo-cache";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Input } from "@/common/components/ui/input";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Info,
  Ellipsis,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AccountDirective } from "./types";
import { CloseAccountDialog } from "./close-account-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { QueryView } from "@/common/components/query-view";
import { Skeleton } from "@/common/components/ui/skeleton";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { cn } from "@/common/lib/utils/utils";
import { AccountPrefixNavigation } from "./account-prefix-navigation";
import { AccountPath } from "@/common/components/account-name";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import {
  ACCOUNT_TYPE_ALL,
  OPEN_ACCOUNT_ACTION,
  OPEN_ACCOUNT_ACTION_SEARCH,
} from "@/common/lib/ledger-action-search";
import { normalizeListSearchText } from "@/common/lib/list-search-params";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { useFormatCount } from "@/common/hooks/use-format-count";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { filterChip } from "@/common/components/filter-chip";
import { RelatedLinks } from "@/common/components/related-links";
import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { sumDecimalNumbers } from "@/common/lib/beancount/decimal-number";

function getAccountType(account: string, accountTypes: string[]): string {
  return (
    accountTypes.find(
      (accountType) =>
        account === accountType || account.startsWith(`${accountType}:`),
    ) ?? "Other"
  );
}

/**
 * True only for a computed balance with no nonzero units. The API returns
 * `null` for accounts whose balance it does not compute (everything outside the
 * asset and liability roots), which is "unknown", never "emptied".
 */
function isBalanceEmpty(balance?: Record<string, unknown> | null): boolean {
  if (balance == null) return false;
  return Object.values(balance).every((v) => Number(v) === 0);
}

interface AccountGroup {
  type: string;
  accounts: AccountDirective[];
}

function compareAccountPaths(left: string, right: string): number {
  const leftParts = left.split(":");
  const rightParts = right.split(":");
  for (const [index, part] of leftParts.entries()) {
    const other = rightParts[index];
    if (other === undefined) return 1;
    if (part !== other) return part < other ? -1 : 1;
  }
  return leftParts.length - rightParts.length;
}

/**
 * The chart of accounts: one group per root in the ledger's own order
 * (Assets, Liabilities, Equity, Income, Expenses). Compare path components so
 * a sibling like Bank-Reserve follows the whole Bank subtree.
 */
function groupByType(
  accounts: AccountDirective[],
  accountTypes: string[],
): AccountGroup[] {
  const groups = new Map<string, AccountDirective[]>();
  for (const type of [...accountTypes, "Other"]) groups.set(type, []);
  for (const account of accounts) {
    groups.get(getAccountType(account.account, accountTypes))!.push(account);
  }
  return [...groups]
    .filter(([, members]) => members.length > 0)
    .map(([type, members]) => ({
      type,
      accounts: members.sort((a, b) =>
        compareAccountPaths(a.account, b.account),
      ),
    }));
}

/**
 * For a parent that holds nothing itself, what its sub-accounts hold
 * together, per currency, summed exactly from the balances already listed.
 */
function subAccountTotals(
  accounts: AccountDirective[],
): Map<string, Record<string, string>> {
  const totals = new Map<string, Record<string, string>>();
  for (const parent of accounts) {
    const own = parent.balance;
    if (own == null || Object.keys(own).length > 0) continue;
    const amounts = new Map<string, string[]>();
    for (const child of accounts) {
      if (!child.account.startsWith(`${parent.account}:`)) continue;
      for (const [currency, amount] of Object.entries(child.balance ?? {})) {
        amounts.set(currency, [
          ...(amounts.get(currency) ?? []),
          String(amount),
        ]);
      }
    }
    if (amounts.size === 0) continue;
    totals.set(
      parent.account,
      Object.fromEntries(
        [...amounts].map(([currency, values]) => [
          currency,
          sumDecimalNumbers(values),
        ]),
      ),
    );
  }
  return totals;
}

function EmptyState({
  onClear,
  query,
}: {
  onClear?: () => void;
  query?: string;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="font-medium mb-1">{t("page.accounts.noAccountsFound")}</p>
        <p className="text-muted-foreground text-sm [overflow-wrap:anywhere]">
          {query
            ? t("page.accounts.noMatchFor", { query })
            : t("page.accounts.noAccountsMatchFilters")}
        </p>
        {onClear && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 pointer-coarse:h-11"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            {t("common.clearInput")}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * What the account holds now, the row's strongest figure. An account the
 * API does not compute a balance for (outside the asset and liability roots)
 * shows nothing here; its group says why, once. A computed balance with no
 * units is zero, and says so.
 */
function BalanceCell({
  balance,
  subtotal,
}: {
  balance?: Record<string, unknown> | null;
  subtotal?: Record<string, string>;
}) {
  const { t } = useTranslations();
  if (balance == null) {
    return (
      <span className="sr-only">{t("page.accounts.balanceNotComputed")}</span>
    );
  }
  if (Object.keys(balance).length === 0 && subtotal) {
    // A parent with nothing of its own: what its sub-accounts hold, quieter
    // than an account's own balance and saying so.
    return (
      <div className="flex flex-col items-end gap-0.5 text-muted-foreground">
        {Object.entries(subtotal).map(([currency, amount]) => (
          <span key={currency} className="tabular-nums sm:whitespace-nowrap">
            <LedgerAmount number={amount} currency={currency} />
          </span>
        ))}
        <span className="text-xs">{t("page.accounts.withSubAccounts")}</span>
      </div>
    );
  }
  if (Object.keys(balance).length === 0) {
    return <span className="text-muted-foreground tabular-nums">0</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {Object.entries(balance).map(([currency, amount]) => (
        <span
          key={currency}
          className="font-medium tabular-nums sm:whitespace-nowrap"
        >
          <LedgerAmount
            number={amount as string | number}
            currency={currency}
          />
        </span>
      ))}
    </div>
  );
}

interface AccountRowProps {
  account: AccountDirective;
  /** What the account's sub-accounts hold, for a parent holding none itself. */
  subtotal?: Record<string, string>;
  onAccountClick: (accountName: string) => void;
  onDelete: (account: AccountDirective, returnFocusTo: HTMLElement) => void;
  onClose: (account: AccountDirective, returnFocusTo: HTMLElement) => void;
}

/** Open is the norm and goes unsaid; a closed account says when it closed. */
function ClosedMark({ closedAt }: { closedAt: string }) {
  const { t } = useTranslations();
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <Badge
        variant="outline"
        className="border-border bg-muted/50 px-1.5 py-0 text-muted-foreground"
      >
        {t("page.accounts.closed")}
      </Badge>
      <span className="tabular-nums">{closedAt}</span>
    </span>
  );
}

function AccountActions({
  account,
  onAccountClick,
  onDelete,
  onClose,
}: Pick<
  AccountRowProps,
  "account" | "onAccountClick" | "onDelete" | "onClose"
>) {
  const { t } = useTranslations();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isClosed = account.closedAt !== null;
  const canDelete = account.entryCount === 0;
  const canClose = !isClosed && isBalanceEmpty(account.balance);
  // An action this account cannot take stays in the menu, greyed, with the
  // reason, rather than vanishing from some rows and not others.
  const unavailable =
    "data-[disabled]:opacity-100 data-[disabled]:text-muted-foreground";

  return (
    <LedgerWritePermission>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground pointer-coarse:size-11"
            data-account-actions={account.account}
          >
            <Ellipsis className="h-4 w-4" />
            <span className="sr-only">
              {t("page.accounts.actionsForAccount", {
                account: account.account,
              })}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 [&_[role=menuitem]]:pointer-coarse:min-h-11"
        >
          <DropdownMenuItem onSelect={() => onAccountClick(account.account)}>
            <BookOpen className="h-4 w-4" />
            {t("page.accounts.openRegister")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isClosed && (
            <DropdownMenuItem
              disabled={!canClose}
              className={cn(
                canClose ? "items-center" : "items-start",
                unavailable,
              )}
              onSelect={() => {
                if (triggerRef.current) onClose(account, triggerRef.current);
              }}
            >
              <Archive className={cn("h-4 w-4", !canClose && "mt-0.5")} />
              <span className="flex flex-col gap-0.5">
                {t("page.accounts.closeAccount")}
                {!canClose && (
                  <span className="text-xs text-muted-foreground">
                    {t("page.accounts.closeNeedsZeroBalance")}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          )}
          {!isClosed && <DropdownMenuSeparator />}
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            className={cn(
              canDelete ? "items-center" : "items-start",
              unavailable,
            )}
            onSelect={() => {
              if (triggerRef.current) onDelete(account, triggerRef.current);
            }}
          >
            <Trash2 className={cn("h-4 w-4", !canDelete && "mt-0.5")} />
            <span className="flex flex-col gap-0.5">
              {t("common.delete")}
              {!canDelete && (
                <span className="text-xs text-muted-foreground">
                  {t("page.accounts.deleteNeedsNoPostings")}
                </span>
              )}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </LedgerWritePermission>
  );
}

export function AccountRow({
  account,
  subtotal,
  onAccountClick,
  onDelete,
  onClose,
}: AccountRowProps) {
  const formatCount = useFormatCount();
  const isClosed = account.closedAt !== null;
  const parentPath = account.account.slice(
    0,
    Math.max(0, account.account.lastIndexOf(":")),
  );

  return (
    <TableRow
      {...getClickableRowProps<HTMLTableRowElement>(
        () => onAccountClick(account.account),
        {
          className: cn(
            "group hover:bg-primary/[0.04] active:bg-primary/[0.07] has-[[data-state=open]]:bg-primary/[0.06]",
            isClosed && "bg-muted/30",
          ),
          preserveTableSemantics: true,
        },
      )}
    >
      <TableCell className="py-1.5 ps-4 align-top whitespace-normal @max-lg:py-2.5">
        {/* Narrow, the name's last part and what the account holds share
            the first line, the parent path quiet under them. */}
        <div className="@max-lg:grid @max-lg:grid-cols-[minmax(0,1fr)_auto] @max-lg:gap-x-3">
          <div className="min-w-0">
            <AccountPrefixNavigation
              accountName={account.account}
              isClosed={isClosed}
              onAccountClick={onAccountClick}
            />
          </div>
          {account.balance != null && (
            <div className="text-end text-base leading-snug @lg:hidden">
              <BalanceCell balance={account.balance} subtotal={subtotal} />
            </div>
          )}
          {parentPath && (
            // The parent path takes the row's whole width and wraps only
            // after a colon; the name's last part already says it all to
            // assistive technology.
            <div
              aria-hidden="true"
              className="col-span-2 text-sm leading-snug text-muted-foreground [overflow-wrap:break-word] @lg:hidden"
            >
              <AccountPath account={parentPath} />
            </div>
          )}
          {account.closedAt && (
            <div className="col-span-2">
              <ClosedMark closedAt={account.closedAt} />
            </div>
          )}
        </div>
      </TableCell>
      {/* Narrow, these columns keep their cells at no width: a hidden cell
          would leave the grid and pull the next one into its column. */}
      <TableCell className="overflow-hidden px-0 py-1.5 align-top text-sm leading-6 text-muted-foreground tabular-nums @2xl:px-2">
        <span className="hidden @2xl:inline">{account.openedAt}</span>
      </TableCell>
      <TableCell className="overflow-hidden px-0 py-1.5 text-end align-top text-sm leading-6 text-muted-foreground tabular-nums @4xl:px-2">
        <span className="hidden @4xl:inline">
          {formatCount(account.entryCount)}
        </span>
      </TableCell>
      <TableCell className="overflow-hidden px-0 py-1.5 text-end align-top text-base leading-snug whitespace-normal sm:text-sm sm:leading-6 @lg:px-2">
        <div className="hidden @lg:block">
          <BalanceCell balance={account.balance} subtotal={subtotal} />
        </div>
      </TableCell>
      <TableCell
        className="py-0.5 pe-1 ps-0 text-end align-top @max-lg:py-1.5 pointer-coarse:py-0.5"
        onClick={(event) => event.stopPropagation()}
      >
        <AccountActions
          account={account}
          onAccountClick={onAccountClick}
          onDelete={onDelete}
          onClose={onClose}
        />
      </TableCell>
    </TableRow>
  );
}

/** The column widths, shared by the list and its loading skeleton. */
function AccountColumns() {
  return (
    <colgroup>
      <col />
      <col className="w-0 @2xl:w-32" />
      <col className="w-0 @4xl:w-24" />
      <col className="w-0 @lg:w-44 @5xl:w-56" />
      <col className="w-10 pointer-coarse:w-12" />
    </colgroup>
  );
}

/**
 * A type's heading inside the list: its name and count, and for a type the
 * API keeps no balance for, where its totals are instead.
 */
function GroupHeading({
  type,
  count,
  hasBalances,
  elsewhere,
  note,
}: {
  type: string;
  count: number;
  hasBalances: boolean;
  elsewhere?: ReactNode;
  note?: string;
}) {
  const { t } = useTranslations();
  const formatCount = useFormatCount();
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead
        scope="colgroup"
        colSpan={5}
        // Pinned under the app bar while its accounts scroll by, so a long
        // list always says which type it is in.
        // Borders drawn as shadows: a collapsed table border belongs to the
        // table, so a pinned cell's border would let rows show through.
        className="sticky -top-4 z-[1] h-auto bg-card py-2 ps-4 pe-3 whitespace-normal shadow-[inset_0_1px_0_var(--border),inset_0_-1px_0_var(--border)] md:-top-6 @lg:top-4 md:@lg:top-2"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span className="text-sm font-semibold text-foreground">
            {type === "Other" ? t("page.accounts.otherType") : type}
            <span className="ms-2 font-normal text-muted-foreground tabular-nums">
              {formatCount(count)}
            </span>
          </span>
          {(note || !hasBalances) && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              {hasBalances
                ? note
                : (elsewhere ?? t("page.accounts.balancesNotComputed"))}
            </span>
          )}
        </div>
      </TableHead>
    </TableRow>
  );
}

function AccountsHeading({
  count,
  action,
}: {
  count?: number;
  action?: ReactNode;
}) {
  const { t } = useTranslations();
  const formatCount = useFormatCount();
  const { ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/accounts",
  });
  const { ledgerName: ledgerDisplayName } = useLedger();
  return (
    <LedgerPageHeading
      title={t("page.accounts.accounts")}
      context={ledgerDisplayName ?? ledgerName}
      meta={
        count === undefined
          ? undefined
          : t("page.accounts.accountCount", {
              count,
              shown: formatCount(count),
            })
      }
      actions={action}
    />
  );
}

export default function LedgerAccountsPage() {
  const { t } = useTranslations();
  const formatCount = useFormatCount();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/accounts",
  });
  const actionSearch = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/accounts",
  });
  const navigate = useNavigate({
    from: "/ledger/$ledgerOwner/$ledgerName/accounts",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerData } = useLedger();
  const { canWrite } = useLedgerPermission();
  const accountTypes = useMemo(
    () =>
      [
        ledgerData.options.nameAssets,
        ledgerData.options.nameLiabilities,
        ledgerData.options.nameEquity,
        ledgerData.options.nameIncome,
        ledgerData.options.nameExpenses,
      ].filter((accountType): accountType is string => Boolean(accountType)),
    [ledgerData.options],
  );

  const handleAccountClick = (accountName: string) => {
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
      params: { ledgerOwner, ledgerName, accountName },
    });
  };

  // Search and type live in the URL so a drill-down plus browser Back (or a
  // shared link, or a reload) rebuilds the same filtered list. Edits replace
  // the entry, matching the shared ledger-filter convention, so typing does
  // not bury the previous page under one history entry per keystroke.
  //
  // The values are re-coerced here because the router still surfaces raw URL
  // values the route schema omitted (an array `?search=["x"]` arrives as an
  // array), and the root names come from per-ledger options the schema cannot
  // see: an unknown type means "all".
  const search = normalizeListSearchText(actionSearch.search) ?? "";
  // Update the controlled input in the input event, before replace-navigation
  // commits. Waiting for the URL would reset a mid-string edit's caret.
  // A changed URL still restores the draft on Back, reload, or Clear all.
  const [searchInput, setSearchInput] = useState({
    fromUrl: search,
    value: search,
  });
  if (searchInput.fromUrl !== search) {
    setSearchInput({ fromUrl: search, value: search });
  }
  const requestedType =
    normalizeListSearchText(actionSearch.type) ?? ACCOUNT_TYPE_ALL;
  const typeFilter = accountTypes.includes(requestedType)
    ? requestedType
    : ACCOUNT_TYPE_ALL;

  const setListSearch = (next: { search?: string; type?: string }): void => {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, ...next }),
      replace: true,
    });
  };

  const setSearch = (value: string) => {
    const nextSearch = normalizeListSearchText(value) ?? "";
    setSearchInput({ fromUrl: search, value: nextSearch });
    setListSearch({ search: nextSearch || undefined });
  };

  const setTypeFilter = (value: string) =>
    setListSearch({ type: value === ACCOUNT_TYPE_ALL ? undefined : value });

  const [deleteTarget, setDeleteTarget] = useState<AccountDirective | null>(
    null,
  );
  const [closeTarget, setCloseTarget] = useState<AccountDirective | null>(null);
  const openAccountTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // Typing before hydration attaches onChange is wiped when React takes over
  // the controlled field, so it waits until it can keep what is typed
  // (w4/1099, as Gallery does). The type pills and header Clear share the
  // gate: a click before onClick attaches is otherwise lost (w4/1108).
  const hydrated = useHydrated();
  const rowActionReturnFocusRef = useRef<HTMLElement | null>(null);
  const clearCache = useLedgerWriteRefresh();
  const client = useApolloClient();

  /**
   * After a successful write the directory reloads and its rows remount, so
   * the control the dialog would return to may be gone (w4/238). Wait for the
   * reload, point the dialog's return target at the settled control, and
   * focus it if focus fell to the page body meanwhile — whichever of this and
   * the dialog's own close restore runs first, both land on it.
   */
  const refreshAndRefocus = async (settledTarget: () => HTMLElement | null) => {
    clearCache();
    try {
      await client.refetchQueries({
        include: [GetLedgerAccountDirectivesDocument],
      });
    } catch {
      // The page shows the read's own error state.
    }
    requestAnimationFrame(() => {
      const target = settledTarget();
      rowActionReturnFocusRef.current = target;
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      (target ?? searchInputRef.current)?.focus();
    });
  };
  const rowActions = (account: string) =>
    document.querySelector<HTMLElement>(
      `[data-account-actions="${CSS.escape(account)}"]`,
    );

  const openCloseDialog = (
    account: AccountDirective,
    returnFocusTo: HTMLElement,
  ) => {
    rowActionReturnFocusRef.current = returnFocusTo;
    setCloseTarget(account);
  };

  const openDeleteDialog = (
    account: AccountDirective,
    returnFocusTo: HTMLElement,
  ) => {
    rowActionReturnFocusRef.current = returnFocusTo;
    setDeleteTarget(account);
  };

  // The directory is all-time; a Time filter carried over from another page
  // (filters persist across navigation) does not apply here, so say so.
  const timeFilter = useContext(LedgerSearchParamsContext)?.searchParams.time;

  const { data, loading, error, refetch } = useQuery(
    GetLedgerAccountDirectivesDocument,
    {
      variables: { ledgerId },
      skip: !ledgerId,
      fetchPolicy: "cache-and-network",
    },
  );

  const accounts = useMemo(
    () => data?.getLedgerAccountDirectives ?? [],
    [data],
  );
  const accountGroups = useMemo(
    () => groupByType(accounts, accountTypes),
    [accountTypes, accounts],
  );

  // A pasted name often carries a space at either end; match on the name
  // alone, while the field and URL keep exactly what was typed (w2/108).
  const query = search.trim().toLowerCase();
  const matchingGroups = useMemo(
    () =>
      accountGroups.map((group) => ({
        type: group.type,
        accounts: group.accounts.filter((account) =>
          account.account.toLowerCase().includes(query),
        ),
      })),
    [accountGroups, query],
  );
  const groups = matchingGroups.filter(
    (group) =>
      group.accounts.length > 0 &&
      (typeFilter === ACCOUNT_TYPE_ALL || group.type === typeFilter),
  );
  const filteredCount = groups.reduce(
    (count, group) => count + group.accounts.length,
    0,
  );
  const hasActiveFilters = query.length > 0 || typeFilter !== ACCOUNT_TYPE_ALL;

  // Each type chip counts what the search leaves of that type.
  const typeCounts = new Map(
    matchingGroups.map((group) => [group.type, group.accounts.length]),
  );
  const searchMatches = [...typeCounts.values()].reduce((a, b) => a + b, 0);

  const subtotals = useMemo(() => subAccountTotals(accounts), [accounts]);

  // The empty state's Clear leaves with its results; hand focus to the
  // search, as the field's own clear icon does, for the next query (w4/340).
  const clearFilters = () => {
    setListSearch({ search: undefined, type: undefined });
    searchInputRef.current?.focus();
  };

  const reportLink =
    "inline-flex min-h-6 items-center gap-1 font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground";
  const incomeStatement = (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName/income-statement"
      params={{ ledgerOwner, ledgerName }}
      className={reportLink}
    >
      {t("common.incomeStatement")}
      <ArrowRight className="size-3.5 rtl:rotate-180" />
    </Link>
  );
  const periodTotals = (
    <>
      {t("page.accounts.periodTotals")}
      {incomeStatement}
    </>
  );
  // Equity's totals are the Balance Sheet's.
  const equityTotals = (
    <>
      {t("page.accounts.totalsOn")}
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/balance-sheet"
        params={{ ledgerOwner, ledgerName }}
        className={reportLink}
      >
        {t("common.balanceSheet")}
        <ArrowRight className="size-3.5 rtl:rotate-180" />
      </Link>
    </>
  );
  const hasBalances = (group: AccountGroup) =>
    group.accounts.some((account) => account.balance != null);

  return (
    // The ledger pages' shared column, its heading, then one card: the
    // list's filters in its top bar, as the Journal's are.
    <LedgerPage className="@container space-y-4 sm:space-y-5">
      <AccountsHeading
        count={data ? accounts.length : undefined}
        action={
          <LedgerWritePermission>
            <Button asChild className="shrink-0 pointer-coarse:h-11">
              <Link
                ref={openAccountTriggerRef}
                to="/ledger/$ledgerOwner/$ledgerName/accounts"
                params={{ ledgerOwner, ledgerName }}
                search={OPEN_ACCOUNT_ACTION_SEARCH}
              >
                <Plus className="h-4 w-4" />
                {t("page.accounts.openAccount")}
              </Link>
            </Button>
          </LedgerWritePermission>
        }
      />

      {timeFilter && (
        <p
          role="note"
          className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("page.accounts.timeFilterNotApplied")}
        </p>
      )}

      <div className="overflow-clip rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b bg-muted/20 px-2 py-2 sm:px-3 @4xl:flex-row @4xl:items-center">
          <div className="relative w-full @4xl:w-72 @4xl:flex-none">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              aria-label={t("page.accounts.searchAccounts")}
              placeholder={t("page.accounts.searchAccounts")}
              value={searchInput.value}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!hydrated}
              className="bg-background ps-9 pe-9 pointer-coarse:h-11"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute end-0.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-coarse:size-10"
                aria-label={t("common.clearInput")}
                disabled={!hydrated}
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div
            // Narrow, the six choices sit in an even grid of three.
            className="grid min-w-0 grid-cols-3 gap-1 @lg:flex @lg:flex-wrap @lg:items-center"
            role="group"
            aria-label={t("page.accounts.type")}
          >
            {[ACCOUNT_TYPE_ALL, ...accountTypes].map((accountType) => {
              const isActive = typeFilter === accountType;
              const count =
                accountType === ACCOUNT_TYPE_ALL
                  ? searchMatches
                  : (typeCounts.get(accountType) ?? 0);
              return (
                <Button
                  key={accountType}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(filterChip(isActive), "@max-lg:px-2")}
                  aria-pressed={isActive}
                  // Nothing to narrow until the list is here.
                  disabled={!hydrated || !data}
                  onClick={() => setTypeFilter(accountType)}
                >
                  {accountType === ACCOUNT_TYPE_ALL
                    ? t("page.accounts.allTypes")
                    : accountType}
                  {/* Room for the count from the first paint, so the chips
                    do not grow and rewrap when the list arrives. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block min-w-[2ch] text-start font-normal text-muted-foreground tabular-nums",
                      !data && "invisible",
                    )}
                  >
                    {data ? formatCount(count) : "0"}
                  </span>
                </Button>
              );
            })}
          </div>
          <div
            className={cn(
              "shrink-0 text-sm text-muted-foreground tabular-nums @4xl:ms-auto",
              !(data && hasActiveFilters) && "sr-only",
            )}
            aria-label={`${formatCount(filteredCount)} / ${formatCount(accounts.length)} ${t("page.accounts.accounts")}`}
            aria-live="polite"
            title={t("page.accounts.accounts")}
          >
            <span className="font-medium text-foreground">
              {formatCount(filteredCount)}
            </span>{" "}
            / {formatCount(accounts.length)}
          </div>
        </div>

        <QueryView
          loading={loading && !data}
          error={error}
          errorFramed={false}
          // The server's own "try again later" sat beside a Try Again
          // button; say instead what a failed read leaves untouched.
          errorMessage={
            error && getErrorMessageKey(error) === "common.errors.internal"
              ? t("page.accounts.readFailedLedgerUnchanged")
              : undefined
          }
          onRetry={refetch}
          data={data ? accounts : undefined}
          loadingSlot={
            <>
              <table
                data-slot="table"
                aria-label={t("page.accounts.accounts")}
                className="w-full table-fixed caption-bottom text-sm"
              >
                <AccountColumns />
                {/* The loaded list's shape: its column headings when wide,
                  its two-line rows when narrow. */}
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      colSpan={5}
                      className="shadow-[inset_0_-1px_0_var(--border)] @max-lg:h-0 @max-lg:py-0"
                    >
                      <Skeleton className="h-4 w-20 @max-lg:hidden" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[6, 3, 1, 5, 9].map((rows, group) => (
                    <Fragment key={group}>
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={5}
                          className="bg-muted py-2.5 ps-4 shadow-[inset_0_1px_0_var(--border),inset_0_-1px_0_var(--border)]"
                        >
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      </TableRow>
                      {Array.from({ length: rows }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell className="py-3 ps-4">
                            <Skeleton className="h-4 w-4/5 @2xl:w-64" />
                            <Skeleton className="mt-2 h-3 w-1/2 @lg:hidden" />
                          </TableCell>
                          <TableCell className="overflow-hidden px-0 @2xl:px-2">
                            <Skeleton className="hidden h-4 w-20 @2xl:block" />
                          </TableCell>
                          <TableCell className="overflow-hidden px-0 @4xl:px-2">
                            <Skeleton className="ms-auto hidden h-4 w-8 @4xl:block" />
                          </TableCell>
                          <TableCell className="overflow-hidden px-0 @lg:px-2">
                            <Skeleton className="ms-auto hidden h-4 w-20 @lg:block" />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </table>
            </>
          }
        >
          {() =>
            filteredCount === 0 ? (
              <div className="px-4">
                <EmptyState
                  onClear={hasActiveFilters ? clearFilters : undefined}
                  query={search.trim() || undefined}
                />
              </div>
            ) : (
              <table
                data-slot="table"
                aria-label={t("page.accounts.accounts")}
                className="w-full table-fixed caption-bottom text-sm"
              >
                <AccountColumns />
                {/* Wide, the column headings stay pinned under the app bar,
                    the type headings under them. Narrow, the list is one
                    column and its headings are for assistive technology. */}
                <TableHeader className="[&_th]:sticky [&_th]:-top-4 [&_th]:z-[2] [&_th]:h-8 [&_th]:bg-muted [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:shadow-[inset_0_-1px_0_var(--border)] md:[&_th]:-top-6 @max-lg:[&_th]:h-0 @max-lg:[&_th]:py-0 [&_tr]:border-b-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="ps-4 whitespace-nowrap">
                      <span className="@max-lg:sr-only">
                        {t("page.accounts.account")}
                      </span>
                    </TableHead>
                    <TableHead className="overflow-hidden px-0 whitespace-nowrap @2xl:px-2">
                      <span className="hidden @2xl:inline">
                        {t("page.accounts.openDate")}
                      </span>
                    </TableHead>
                    <TableHead className="overflow-hidden px-0 text-end whitespace-nowrap @4xl:px-2">
                      <span className="hidden @4xl:inline">
                        {t("page.accounts.entries")}
                      </span>
                    </TableHead>
                    <TableHead className="overflow-hidden px-0 text-end whitespace-nowrap @lg:px-2">
                      <span className="sr-only @lg:not-sr-only">
                        {t("page.accounts.balance")}
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">{t("common.actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {groups.map((group) => (
                  <TableBody key={group.type}>
                    <GroupHeading
                      type={group.type}
                      count={group.accounts.length}
                      hasBalances={hasBalances(group)}
                      elsewhere={
                        group.type === ledgerData.options.nameIncome ||
                        group.type === ledgerData.options.nameExpenses
                          ? periodTotals
                          : group.type === ledgerData.options.nameEquity
                            ? equityTotals
                            : undefined
                      }
                      note={
                        // Beancount writes what is owed as a negative.
                        group.type === ledgerData.options.nameLiabilities
                          ? t("page.accounts.liabilitiesOwed")
                          : undefined
                      }
                    />
                    {group.accounts.map((account) => (
                      <AccountRow
                        key={account.account}
                        account={account}
                        subtotal={subtotals.get(account.account)}
                        onAccountClick={handleAccountClick}
                        onDelete={openDeleteDialog}
                        onClose={openCloseDialog}
                      />
                    ))}
                  </TableBody>
                ))}
              </table>
            )
          }
        </QueryView>
      </div>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.trialBalance"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/trial-balance`,
          },
        ]}
      />

      <OpenAccountDialog
        open={canWrite && actionSearch.action === OPEN_ACCOUNT_ACTION}
        onOpenChange={(open) => {
          if (!open) {
            void navigate({
              to: ".",
              search: (previous) => ({ ...previous, action: undefined }),
              replace: true,
            });
          }
        }}
        ledgerId={ledgerId}
        onSuccess={() =>
          void refreshAndRefocus(() => openAccountTriggerRef.current)
        }
        returnFocusRef={openAccountTriggerRef}
      />

      <DeleteAccountDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
          }
        }}
        account={deleteTarget}
        ledgerId={ledgerId}
        // The row is gone; Search accounts is the settled target.
        onSuccess={() => void refreshAndRefocus(() => null)}
        returnFocusRef={rowActionReturnFocusRef}
        fallbackFocusRef={searchInputRef}
      />

      <CloseAccountDialog
        open={closeTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setCloseTarget(null);
          }
        }}
        account={closeTarget}
        ledgerId={ledgerId}
        onSuccess={() => {
          const closed = closeTarget?.account;
          void refreshAndRefocus(() => (closed ? rowActions(closed) : null));
        }}
        returnFocusRef={rowActionReturnFocusRef}
        fallbackFocusRef={searchInputRef}
      />
    </LedgerPage>
  );
}
