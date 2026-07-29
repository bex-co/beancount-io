import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Input } from "@/common/components/ui/input";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import {
  useUnsyncedTransactions,
  usePlaidAccountsForLedger,
  useSuggestPlaidCategories,
  useSubmitPlaidTransactions,
  useDeletePlaidTransactions,
} from "../hooks/use-plaid-accounts";
import {
  AccountCombobox,
  SourceFileCombobox,
} from "@/common/components/ledger-comboboxes";
import {
  ALL_FILTER,
  TransactionFilterSelect,
  TransactionMultiFilterSelect,
  type FilterOption,
} from "./transaction-filter-select";
import {
  Loader2,
  Upload,
  AlertCircle,
  Sparkles,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/common/hooks/use-toast";
import { useTranslations } from "@/common/hooks/use-translations";

const SKELETON_ROWS = 5;

interface TransactionReviewTableProps {
  /** Omit (or pass null) to review unsynced transactions across every mapped account in the ledger. */
  accountId?: string | null;
  ledgerId: string;
}

export function TransactionReviewTable({
  accountId,
  ledgerId,
}: TransactionReviewTableProps) {
  const { t } = useTranslations();
  const { transactions, loading, refetch } = useUnsyncedTransactions(
    ledgerId,
    accountId,
  );
  // Filter options come from the ledger's persisted accounts, not the fetched
  // rows, so an account with nothing left to review still appears. Backed by
  // the same query that feeds the rows themselves, so the two cannot drift.
  const { accounts: ledgerAccounts } = usePlaidAccountsForLedger(ledgerId);
  const { suggestCategories, loading: aiLoading } = useSuggestPlaidCategories();
  const { submitTransactions, loading: submitting } =
    useSubmitPlaidTransactions();
  const { deleteTransactions, loading: deleting } =
    useDeletePlaidTransactions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetAccounts, setTargetAccounts] = useState<Map<string, string>>(
    new Map(),
  );
  const [sourceAccountOverrides, setSourceAccountOverrides] = useState<
    Map<string, string>
  >(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  /** Plaid item id of the bank the table is narrowed to; ALL_FILTER means no
   * filter. An item id, not an institution name — two banks can share a name.
   * Never a ledger account. */
  const [bankFilter, setBankFilter] = useState(ALL_FILTER);
  /** Bank accounts (Plaid account ids) the table is narrowed to. Several can be
   * active at once; empty means no filter. */
  const [accountFilters, setAccountFilters] = useState<string[]>([]);
  /** Empty means "let the backend decide", which writes to main.bean. */
  const [targetFile, setTargetFile] = useState("");
  const { toast } = useToast();

  const getSourceAccount = (transaction: {
    id: string;
    ledgerAccount?: string | null;
  }) =>
    sourceAccountOverrides.get(transaction.id) ??
    transaction.ledgerAccount ??
    "";

  /** Only ever adds or removes the rows currently on screen — selections hidden
   * by a filter keep their state (and their assigned accounts). */
  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedIds);
    filteredTransactions.forEach((transaction) => {
      if (checked) {
        newSelected.add(transaction.id);
      } else {
        newSelected.delete(transaction.id);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleBankFilterChange = (value: string) => {
    setBankFilter(value);
    // Account options are scoped to the bank, so the old picks can't survive.
    setAccountFilters([]);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setBankFilter(ALL_FILTER);
    setAccountFilters([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAICategorize = async () => {
    try {
      const suggestions = await suggestCategories(ledgerId, accountId);

      // Apply suggestions to state
      const newTargetAccounts = new Map(targetAccounts);

      suggestions.forEach((suggestion) => {
        const transaction = transactions[suggestion.rowIndex];
        if (transaction) {
          newTargetAccounts.set(transaction.id, suggestion.targetAccount);
        }
      });

      setTargetAccounts(newTargetAccounts);

      toast({
        title: t("plaid.transactionReview.toast.categorizationComplete"),
        description: t(
          "plaid.transactionReview.toast.categorizationCompleteDescription",
          { count: suggestions.length },
        ),
      });
    } catch {
      toast({
        title: t("plaid.transactionReview.toast.categorizationFailed"),
        description: t(
          "plaid.transactionReview.toast.categorizationFailedDescription",
        ),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: t("plaid.transactionReview.toast.noTransactionsSelected"),
        description: t(
          "plaid.transactionReview.toast.noTransactionsSelectedDescription",
        ),
        variant: "destructive",
      });
      return;
    }

    // Validate selected transactions have both a source and a target account.
    // Filters only hide rows — everything selected is submitted, visible or not.
    const selectedTransactions = transactions
      .filter((tx) => selectedIds.has(tx.id))
      .map((transaction) => ({
        transactionId: transaction.transactionId,
        targetAccount: targetAccounts.get(transaction.id) || "",
        sourceAccount: getSourceAccount(transaction),
      }))
      .filter((tx) => tx.targetAccount !== "" && tx.sourceAccount !== "");

    // Check for missing accounts
    const missingCount = selectedIds.size - selectedTransactions.length;
    if (missingCount > 0) {
      toast({
        title: t("plaid.transactionReview.toast.missingTargetAccounts"),
        description: t(
          "plaid.transactionReview.toast.missingTargetAccountsDescription",
          { count: missingCount },
        ),
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await submitTransactions(
        ledgerId,
        selectedTransactions,
        targetFile || undefined,
      );
      toast({
        title: t("plaid.transactionReview.toast.transactionsSubmitted"),
        description: t(
          "plaid.transactionReview.toast.transactionsSubmittedDescription",
          { count: result?.addedCount || 0 },
        ),
      });

      // Reset state
      setSelectedIds(new Set());
      setTargetAccounts(new Map());
      setSourceAccountOverrides(new Map());
      setTargetFile("");
      void refetch();
    } catch {
      toast({
        title: t("plaid.transactionReview.toast.submissionFailed"),
        description: t(
          "plaid.transactionReview.toast.submissionFailedDescription",
        ),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    // Like submit, this covers every selected row, including ones the filters
    // currently hide.
    const idsToDelete = Array.from(selectedIds)
      .map((id) => transactions.find((tx) => tx.id === id)?.transactionId)
      .filter((transactionId): transactionId is string =>
        Boolean(transactionId),
      );

    try {
      const result = await deleteTransactions(ledgerId, idsToDelete);
      toast({
        title: t("plaid.transactionReview.toast.transactionsDeleted"),
        description: t(
          "plaid.transactionReview.toast.transactionsDeletedDescription",
          { count: result?.deletedCount || 0 },
        ),
      });

      setSelectedIds(new Set());
      setTargetAccounts(new Map());
      setSourceAccountOverrides(new Map());
      void refetch();
    } catch {
      toast({
        title: t("plaid.transactionReview.toast.deletionFailed"),
        description: t(
          "plaid.transactionReview.toast.deletionFailedDescription",
        ),
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(num));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  /** Which bank each account belongs to, so rows can be matched on item id
   * rather than on the institution name they happen to carry. */
  const itemIdByAccountId = new Map(
    ledgerAccounts.map((account) => [account.id, account.plaidItemId]),
  );

  // Keyed by plaidItemId, never by institutionName: two connections can carry
  // the same bank name, and merging them would mix their rows.
  const bankOptions: FilterOption[] = Array.from(
    ledgerAccounts
      .reduce((byItemId, account) => {
        if (!byItemId.has(account.plaidItemId)) {
          byItemId.set(account.plaidItemId, account.institutionName);
        }
        return byItemId;
      }, new Map<string, string>())
      .entries(),
    ([value, label]) => ({ value, label }),
  ).sort((a, b) => a.label.localeCompare(b.label));

  /** A filter value that no longer exists — say the account was removed through
   * Manage accounts while this page was open — has to stop filtering rather
   * than hide everything. */
  const activeBank = bankOptions.some((option) => option.value === bankFilter)
    ? bankFilter
    : ALL_FILTER;

  const accountOptions: FilterOption[] = ledgerAccounts
    .filter(
      (account) =>
        activeBank === ALL_FILTER || account.plaidItemId === activeBank,
    )
    .map((account) => {
      // The mask disambiguates two accounts a bank labelled the same way.
      const name = account.accountName;
      return {
        value: account.id,
        label:
          activeBank === ALL_FILTER
            ? `${account.institutionName} · ${name}`
            : name,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  /** Same staleness guard, per picked account. */
  const activeAccounts = accountFilters.filter((accountId) =>
    accountOptions.some((option) => option.value === accountId),
  );

  const accountFilterLabel =
    activeAccounts.length === 0
      ? t("plaid.transactionReview.allAccounts")
      : activeAccounts.length === 1
        ? (accountOptions.find((option) => option.value === activeAccounts[0])
            ?.label ?? "")
        : t("plaid.transactionReview.accountsSelected", {
            count: activeAccounts.length,
          });

  // Filter transactions by bank, bank account(s), and search query
  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredTransactions = transactions.filter((tx) => {
    if (
      activeBank !== ALL_FILTER &&
      // A row whose account is missing from the account list — the two queries
      // caught mid-update — can't be attributed to a bank, so it doesn't match.
      // Self-heals on the next refetch.
      itemIdByAccountId.get(tx.plaidAccountId) !== activeBank
    ) {
      return false;
    }
    if (
      activeAccounts.length > 0 &&
      !activeAccounts.includes(tx.plaidAccountId)
    ) {
      return false;
    }
    if (!searchTerm) return true;
    return (
      tx.name.toLowerCase().includes(searchTerm) ||
      Boolean(tx.merchantName?.toLowerCase().includes(searchTerm))
    );
  });

  const hasActiveFilters =
    searchTerm !== "" || activeBank !== ALL_FILTER || activeAccounts.length > 0;

  /** Filters only change what's on screen: submit and delete still act on every
   * selected row, so hidden selections are counted and flagged, not dropped. */
  const visibleSelectedCount = filteredTransactions.filter((tx) =>
    selectedIds.has(tx.id),
  ).length;
  const hiddenSelectedCount = selectedIds.size - visibleSelectedCount;

  // Count selected transactions missing a source and/or target account
  const missingTargetAccountsCount = transactions.filter(
    (tx) =>
      selectedIds.has(tx.id) &&
      ((targetAccounts.get(tx.id) || "") === "" || getSourceAccount(tx) === ""),
  ).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-[280px]" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-45" />
            <Skeleton className="h-9 w-45" />
          </div>

          <div className="rounded-md border">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableHead>
                  <TableHead className="w-[220px]">
                    <Skeleton className="h-4 w-28" />
                  </TableHead>
                  <TableHead className="w-[220px]">
                    <Skeleton className="h-4 w-28" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("plaid.transactionReview.noPendingTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("plaid.transactionReview.noPendingDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allSelected =
    visibleSelectedCount === filteredTransactions.length &&
    filteredTransactions.length > 0;
  const someSelected =
    visibleSelectedCount > 0 &&
    visibleSelectedCount < filteredTransactions.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("plaid.transactionReview.title")}</CardTitle>
            <CardDescription>
              {t("plaid.transactionReview.description", {
                count: transactions.length,
                plural: transactions.length !== 1 ? "s" : "",
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* The placeholder carries the field's purpose — it doubles as the
                accessible name, since Combobox takes no aria-label. */}
            <div className="w-70">
              <SourceFileCombobox
                ledgerId={ledgerId}
                value={targetFile}
                onValueChange={setTargetFile}
                placeholder={t("plaid.transactionReview.selectFilePlaceholder")}
                disabled={submitting}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={selectedIds.size === 0 || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("plaid.transactionReview.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      {t("plaid.transactionReview.delete")}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("plaid.transactionReview.deleteConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("plaid.transactionReview.deleteConfirmDescription", {
                      count: selectedIds.size,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("plaid.transactionReview.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("plaid.transactionReview.submitting")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("plaid.transactionReview.submit")}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and filter UI. Each dropdown renders only when it offers a
            real choice — the common case is a single connected bank. */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("plaid.transactionReview.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {bankOptions.length > 1 && (
            <TransactionFilterSelect
              value={activeBank}
              onValueChange={handleBankFilterChange}
              options={bankOptions}
              allLabel={t("plaid.transactionReview.allBanks")}
              ariaLabel={t("plaid.transactionReview.filterByBank")}
            />
          )}
          {accountOptions.length > 1 && (
            <TransactionMultiFilterSelect
              values={activeAccounts}
              onValuesChange={setAccountFilters}
              options={accountOptions}
              allLabel={t("plaid.transactionReview.allAccounts")}
              triggerLabel={accountFilterLabel}
              ariaLabel={t("plaid.transactionReview.filterByAccount")}
            />
          )}
        </div>

        {/* Filters only hide rows; hidden selections are still submitted and
            deleted, so say so rather than letting it surprise anyone. */}
        {hiddenSelectedCount > 0 && (
          <p className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            {t("plaid.transactionReview.hiddenSelectedNotice", {
              count: hiddenSelectedCount,
            })}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={clearFilters}
            >
              {t("plaid.transactionReview.clearFilters")}
            </Button>
          </p>
        )}

        {/* Validation alert */}
        {selectedIds.size > 0 && missingTargetAccountsCount > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("plaid.transactionReview.missingAccountsAlert", {
                count: missingTargetAccountsCount,
              })}
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={filteredTransactions.length === 0}
                    aria-label={t("plaid.transactionReview.selectAll")}
                    className={
                      someSelected ? "data-[state=checked]:bg-primary" : ""
                    }
                  />
                </TableHead>
                <TableHead>{t("plaid.transactionReview.date")}</TableHead>
                <TableHead>{t("plaid.transactionReview.source")}</TableHead>
                <TableHead>{t("plaid.transactionReview.merchant")}</TableHead>
                <TableHead>
                  {t("plaid.transactionReview.descriptionColumn")}
                </TableHead>
                <TableHead className="text-right">
                  {t("plaid.transactionReview.amount")}
                </TableHead>
                <TableHead className="w-[220px]">
                  {t("plaid.transactionReview.sourceAccount")}
                </TableHead>
                <TableHead className="w-[220px]">
                  <div className="flex items-center justify-between">
                    <span>{t("plaid.transactionReview.targetAccount")}</span>
                    <Button
                      onClick={handleAICategorize}
                      disabled={aiLoading || transactions.length === 0}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          {t("plaid.transactionReview.aiProcessing")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-1 h-3 w-3" />
                          {t("plaid.transactionReview.aiFill")}
                        </>
                      )}
                    </Button>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <span>
                        {t("plaid.transactionReview.noMatchingTransactions")}
                      </span>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                        >
                          {t("plaid.transactionReview.clearFilters")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredTransactions.map((transaction) => {
                const isSelected = selectedIds.has(transaction.id);
                const amount = parseFloat(transaction.amount);
                const isExpense = amount > 0;
                const targetAccount = targetAccounts.get(transaction.id) || "";
                const sourceAccount = getSourceAccount(transaction);
                const isMissingAccount =
                  isSelected && (!targetAccount || !sourceAccount);

                return (
                  <TableRow
                    key={transaction.id}
                    className={isSelected ? "bg-accent" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectOne(transaction.id, checked as boolean)
                        }
                        aria-label={`Select transaction ${transaction.name}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {transaction.institutionName}
                      {transaction.accountName && (
                        <span className="block text-xs">
                          {transaction.accountName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.merchantName || transaction.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {isExpense ? "-" : "+"}
                      {formatAmount(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <AccountCombobox
                        ledgerId={ledgerId}
                        value={sourceAccount}
                        onValueChange={(value) => {
                          const newOverrides = new Map(sourceAccountOverrides);
                          newOverrides.set(transaction.id, value);
                          setSourceAccountOverrides(newOverrides);
                        }}
                        placeholder={t(
                          "plaid.transactionReview.selectAccountPlaceholder",
                        )}
                        disabled={!isSelected}
                        className={
                          isSelected && !sourceAccount
                            ? "border-destructive"
                            : ""
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <AccountCombobox
                        ledgerId={ledgerId}
                        value={targetAccount}
                        onValueChange={(value) => {
                          const newTargetAccounts = new Map(targetAccounts);
                          newTargetAccounts.set(transaction.id, value);
                          setTargetAccounts(newTargetAccounts);
                        }}
                        placeholder={t(
                          "plaid.transactionReview.selectAccountPlaceholder",
                        )}
                        disabled={!isSelected}
                        className={isMissingAccount ? "border-destructive" : ""}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
