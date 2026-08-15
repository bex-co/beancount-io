import { useState, useMemo } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  Link,
  useParams,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerAccountDirectivesDocument } from "@/graphql/definitions";
import { createLedgerId } from "@/common/lib/utils/encode";
import { PageHeader } from "@/common/components/page-header";
import { useLedger } from "@/common/hooks/use-ledger";
import { OpenAccountDialog } from "@/features/ledger-data/accounts/open-account-dialog";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import {
  Table,
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
import { BookOpen, Ellipsis, Plus, Search, Trash2, X } from "lucide-react";
import type { AccountDirective } from "./types";
import { CloseAccountDialog } from "./close-account-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { QueryView } from "@/common/components/query-view";
import { Skeleton } from "@/common/components/ui/skeleton";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { cn } from "@/common/lib/utils/utils";
import { AccountPrefixNavigation } from "./account-prefix-navigation";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import {
  OPEN_ACCOUNT_ACTION,
  OPEN_ACCOUNT_ACTION_SEARCH,
} from "@/common/lib/ledger-action-search";

function getAccountType(account: string, accountTypes: string[]): string {
  return (
    accountTypes.find(
      (accountType) =>
        account === accountType || account.startsWith(`${accountType}:`),
    ) ?? "Other"
  );
}

function isBalanceEmpty(balance?: Record<string, unknown> | null): boolean {
  if (!balance || Object.keys(balance).length === 0) return true;
  return Object.values(balance).every((v) => Number(v) === 0);
}

function EmptyState({ onClear }: { onClear?: () => void }) {
  const { t } = useTranslations();
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="font-medium mb-1">{t("page.accounts.noAccountsFound")}</p>
        <p className="text-muted-foreground text-sm">
          {t("page.accounts.noAccountsMatchFilters")}
        </p>
        {onClear && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
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

function BalanceCell({
  balance,
}: {
  balance?: Record<string, unknown> | null;
}) {
  if (!balance || Object.keys(balance).length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {Object.entries(balance).map(([currency, amount]) => (
        <span
          key={currency}
          className="whitespace-nowrap font-mono text-xs tabular-nums"
        >
          {String(amount)} {currency}
        </span>
      ))}
    </div>
  );
}

interface AccountRowProps {
  account: AccountDirective;
  onAccountClick: (accountName: string) => void;
  onDelete: (account: AccountDirective) => void;
  onClose: (account: AccountDirective) => void;
}

function AccountStatus({ isClosed }: { isClosed: boolean }) {
  const { t } = useTranslations();

  return (
    <Badge
      variant="outline"
      className={
        isClosed
          ? "border-border bg-muted/50 text-muted-foreground"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
      }
    >
      <span
        className={
          isClosed
            ? "size-1.5 rounded-full bg-muted-foreground/60"
            : "size-1.5 rounded-full bg-emerald-500"
        }
      />
      {isClosed ? t("page.accounts.closed") : t("page.accounts.open")}
    </Badge>
  );
}

function AccountActions({
  account,
  onDelete,
  onClose,
}: Pick<AccountRowProps, "account" | "onDelete" | "onClose">) {
  const { t } = useTranslations();
  const isClosed = account.closedAt !== null;
  const canDelete = account.entryCount === 0;
  const canClose = !isClosed && isBalanceEmpty(account.balance);

  if (!canDelete && !canClose) return null;

  return (
    <LedgerWritePermission>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Ellipsis className="h-4 w-4" />
            <span className="sr-only">{t("common.moreActions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          {canClose && (
            <DropdownMenuItem onSelect={() => onClose(account)}>
              <X className="h-4 w-4" />
              {t("page.accounts.close")}
            </DropdownMenuItem>
          )}
          {canClose && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(account)}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </LedgerWritePermission>
  );
}

export function AccountRow({
  account,
  onAccountClick,
  onDelete,
  onClose,
}: AccountRowProps) {
  const isClosed = account.closedAt !== null;

  return (
    <TableRow
      {...getClickableRowProps<HTMLTableRowElement>(
        () => onAccountClick(account.account),
        {
          className: "group hover:bg-primary/[0.04] active:bg-primary/[0.07]",
        },
      )}
    >
      <TableCell className="min-w-40 py-3 @2xl:min-w-64">
        <AccountPrefixNavigation
          accountName={account.account}
          isClosed={isClosed}
          onAccountClick={onAccountClick}
        />
      </TableCell>
      <TableCell>
        <AccountStatus isClosed={isClosed} />
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground @2xl:table-cell">
        {account.openedAt}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground @4xl:table-cell">
        {account.closedAt ?? "-"}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-right text-sm tabular-nums @xl:table-cell">
        {account.entryCount}
      </TableCell>
      <TableCell className="hidden text-right text-sm @xl:table-cell">
        <BalanceCell balance={account.balance} />
      </TableCell>
      <TableCell
        className="w-12 text-right"
        onClick={(event) => event.stopPropagation()}
      >
        <AccountActions
          account={account}
          onDelete={onDelete}
          onClose={onClose}
        />
      </TableCell>
    </TableRow>
  );
}

export default function LedgerAccountsPage() {
  const { t } = useTranslations();
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
  const { ledgerName: ledgerDisplayName, ledgerData } = useLedger();
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

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AccountDirective | null>(
    null,
  );
  const [closeTarget, setCloseTarget] = useState<AccountDirective | null>(null);
  const clearCache = useApolloCacheClear();

  const { data, loading, error } = useQuery(
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

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchesSearch = a.account
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesType =
        typeFilter === "all" ||
        getAccountType(a.account, accountTypes) === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [accountTypes, accounts, search, typeFilter]);

  const hasActiveFilters = search.length > 0 || typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={t("page.accounts.accounts")}
          description={t("page.accounts.allAccountsIn", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
        <LedgerWritePermission>
          <Button asChild className="shrink-0">
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/accounts"
              params={{ ledgerOwner, ledgerName }}
              search={OPEN_ACCOUNT_ACTION_SEARCH}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("page.accounts.openAccount")}
              </span>
              <span className="sm:hidden">{t("page.accounts.new")}</span>
            </Link>
          </Button>
        </LedgerWritePermission>
      </div>

      <div className="@container overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-3 @3xl:flex-row @3xl:items-center">
          <div className="relative min-w-0 flex-1 @3xl:w-72 @3xl:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t("page.accounts.searchAccounts")}
              placeholder={t("page.accounts.searchAccounts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background pl-9 pr-9"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={t("common.clearInput")}
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 @3xl:pb-0"
              role="group"
              aria-label={t("page.accounts.type")}
            >
              {["all", ...accountTypes].map((accountType) => {
                const isActive = typeFilter === accountType;
                return (
                  <Button
                    key={accountType}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 shrink-0 rounded-full border px-3 text-xs",
                      isActive
                        ? "border-border shadow-xs"
                        : "border-transparent text-muted-foreground",
                    )}
                    aria-pressed={isActive}
                    onClick={() => setTypeFilter(accountType)}
                  >
                    {accountType === "all"
                      ? t("page.accounts.allTypes")
                      : accountType}
                  </Button>
                );
              })}
            </div>
            <div
              className="shrink-0 text-sm text-muted-foreground tabular-nums"
              aria-label={`${filtered.length} / ${accounts.length} ${t("page.accounts.accounts")}`}
              aria-live="polite"
              title={t("page.accounts.accounts")}
            >
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              / {accounts.length}
            </div>
          </div>
        </div>

        <QueryView
          loading={loading}
          error={error}
          data={accounts}
          loadingSlot={
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-12" />
                  </TableHead>
                  <TableHead className="hidden @2xl:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="hidden @4xl:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="hidden text-right @xl:table-cell">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableHead>
                  <TableHead className="hidden text-right @xl:table-cell">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-3">
                      <Skeleton className="h-4 w-36 @2xl:w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell className="hidden @2xl:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden @4xl:table-cell">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="hidden text-right @xl:table-cell">
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </TableCell>
                    <TableCell className="hidden text-right @xl:table-cell">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          {() => (
            <>
              {filtered.length === 0 && (
                <div className="px-4">
                  <EmptyState
                    onClear={hasActiveFilters ? clearFilters : undefined}
                  />
                </div>
              )}
              {filtered.length > 0 && (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="whitespace-nowrap">
                        {t("page.accounts.account")}
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        {t("page.accounts.status")}
                      </TableHead>
                      <TableHead className="hidden whitespace-nowrap @2xl:table-cell">
                        {t("page.accounts.openDate")}
                      </TableHead>
                      <TableHead className="hidden whitespace-nowrap @4xl:table-cell">
                        {t("page.accounts.closeDate")}
                      </TableHead>
                      <TableHead className="hidden whitespace-nowrap text-right @xl:table-cell">
                        {t("page.accounts.entries")}
                      </TableHead>
                      <TableHead className="hidden whitespace-nowrap text-right @xl:table-cell">
                        {t("page.accounts.balance")}
                      </TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((account) => (
                      <AccountRow
                        key={account.account}
                        account={account}
                        onAccountClick={handleAccountClick}
                        onDelete={setDeleteTarget}
                        onClose={setCloseTarget}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </QueryView>
      </div>

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
        onSuccess={() => clearCache()}
      />

      <DeleteAccountDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        account={deleteTarget}
        ledgerId={ledgerId}
        onSuccess={() => clearCache()}
      />

      <CloseAccountDialog
        open={closeTarget !== null}
        onOpenChange={(v) => {
          if (!v) setCloseTarget(null);
        }}
        account={closeTarget}
        ledgerId={ledgerId}
        onSuccess={() => clearCache()}
      />
    </div>
  );
}
