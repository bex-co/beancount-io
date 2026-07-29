import { useState, useMemo } from "react";
import { useFieldArray, Control, useWatch } from "react-hook-form";
import { Search, Filter, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { Checkbox } from "@/common/components/ui/checkbox";
import { Button } from "@/common/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { cn } from "@/common/lib/utils/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { AccountCombobox } from "@/common/components/ledger-comboboxes";
import { toast } from "sonner";

interface TransactionFormData {
  sourceAccount: string;
  defaultCurrency: string;
  transactions: {
    rowIndex: number;
    date: Date;
    payee: string;
    description: string;
    amount: number;
    targetAccount: string;
    selected: boolean;
  }[];
}

interface AccountMappingTableProps {
  control: Control<TransactionFormData>;
  ledgerId: string;
  onAICategorize?: () => Promise<void>;
  aiLoading?: boolean;
  transactionCount?: number;
}

type AmountFilter = "all" | "positive" | "negative";

export function AccountMappingTable({
  control,
  ledgerId,
  onAICategorize,
  aiLoading = false,
  transactionCount = 0,
}: AccountMappingTableProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { fields, update } = useFieldArray({
    control,
    name: "transactions",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [isAILoading, setIsAILoading] = useState(false);

  const loading = isAILoading || aiLoading;

  const handleAICategorize = async () => {
    if (!onAICategorize) return;

    setIsAILoading(true);
    try {
      await onAICategorize();
      toast.success(t("importer.accountMapping.aiSuccess"), {
        description: t("importer.accountMapping.aiSuccessDescription", {
          count: transactionCount,
        }),
      });
    } catch (err) {
      toast.error(t("importer.accountMapping.aiFailed"), {
        description: formatError(err),
      });
    } finally {
      setIsAILoading(false);
    }
  };

  // Watch all transactions to get live updates
  const watchedTransactions = useWatch({
    control,
    name: "transactions",
  });

  const transactions = useMemo(
    () => watchedTransactions || [],
    [watchedTransactions],
  );

  // Filter transactions based on search and amount filter
  const filteredIndices = useMemo(() => {
    return fields
      .map((_, index) => index)
      .filter((index) => {
        const txn = transactions[index];
        if (!txn) return false;

        // Search filter
        const matchesSearch =
          !searchQuery ||
          txn.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          txn.payee?.toLowerCase().includes(searchQuery.toLowerCase());

        // Amount filter
        const matchesAmount =
          amountFilter === "all" ||
          (amountFilter === "positive" && txn.amount >= 0) ||
          (amountFilter === "negative" && txn.amount < 0);

        return matchesSearch && matchesAmount;
      });
  }, [fields, searchQuery, amountFilter, transactions]);

  // Calculate stats
  const filteredCount = filteredIndices.length;
  const missingAccountCount = transactions.filter(
    (txn) =>
      txn?.selected && (!txn.targetAccount || txn.targetAccount.length === 0),
  ).length;

  // Toggle all visible rows
  const handleToggleAll = () => {
    const shouldSelectAll = filteredIndices.some(
      (index) => !transactions[index]?.selected,
    );

    filteredIndices.forEach((index) => {
      const txn = transactions[index];
      if (txn) {
        update(index, { ...txn, selected: shouldSelectAll });
      }
    });
  };

  // Toggle individual row
  const handleToggleRow = (index: number) => {
    const txn = transactions[index];
    if (txn) {
      update(index, { ...txn, selected: !txn.selected });
    }
  };

  // Check if all visible rows are selected
  const allVisibleSelected =
    filteredIndices.length > 0 &&
    filteredIndices.every((index) => transactions[index]?.selected);
  const someVisibleSelected =
    filteredIndices.some((index) => transactions[index]?.selected) &&
    !allVisibleSelected;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("importer.accountMapping.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={amountFilter}
          onValueChange={(value) => setAmountFilter(value as AmountFilter)}
        >
          <SelectTrigger className="w-45">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue
              placeholder={t("importer.accountMapping.filterByAmount")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("importer.accountMapping.allAmounts")}
            </SelectItem>
            <SelectItem value="positive">
              {t("importer.accountMapping.positiveOnly")}
            </SelectItem>
            <SelectItem value="negative">
              {t("importer.accountMapping.negativeOnly")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12.5">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={handleToggleAll}
                  disabled={filteredCount === 0}
                  aria-label={t("importer.accountMapping.selectAll")}
                  className={cn(someVisibleSelected && "opacity-50")}
                />
              </TableHead>
              <TableHead className="w-15">
                {t("importer.preview.row")}
              </TableHead>
              <TableHead className="w-30">
                {t("importer.preview.date")}
              </TableHead>
              <TableHead className="w-37.5">
                {t("importer.preview.payee")}
              </TableHead>
              <TableHead>{t("importer.preview.description_column")}</TableHead>
              <TableHead className="w-30 text-right">
                {t("importer.preview.amount")}
              </TableHead>
              <TableHead className="w-75">
                <div className="flex items-center justify-between gap-2">
                  <span>{t("importer.accountMapping.targetAccount")}</span>
                  {onAICategorize && (
                    <Button
                      onClick={handleAICategorize}
                      disabled={loading || transactionCount === 0}
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 px-2 gap-1.5 text-xs font-normal hover:bg-primary/10 hover:text-primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {t("importer.accountMapping.categorizing")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          {t("importer.accountMapping.aiFill")}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCount === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {searchQuery || amountFilter !== "all"
                    ? t("importer.accountMapping.noMatch")
                    : t("importer.accountMapping.noConfigure")}
                </TableCell>
              </TableRow>
            ) : (
              filteredIndices.map((index) => {
                const field = fields[index];
                const txn = transactions[index];
                if (!txn) return null;

                const isMissingAccount =
                  txn.selected &&
                  (!txn.targetAccount || txn.targetAccount.length === 0);

                return (
                  <TableRow
                    key={field.id}
                    className={cn(!txn.selected && "opacity-50 bg-muted/30")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={txn.selected}
                        onCheckedChange={() => handleToggleRow(index)}
                        aria-label={`${t("importer.accountMapping.selectTransaction")} ${index + 1}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">
                      {txn.rowIndex + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.date ? new Date(txn.date).toLocaleDateString() : ""}
                    </TableCell>
                    <TableCell className="text-sm">{txn.payee || ""}</TableCell>
                    <TableCell className="text-sm">
                      {txn.description || ""}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {txn.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={control}
                        name={`transactions.${index}.targetAccount`}
                        rules={{
                          validate: (value) => {
                            // Only validate if the row is selected
                            if (
                              txn.selected &&
                              (!value || value.length === 0)
                            ) {
                              return t(
                                "importer.accountMapping.requiredForSelected",
                              );
                            }
                            return true;
                          },
                        }}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormControl>
                              <AccountCombobox
                                ledgerId={ledgerId}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder={t(
                                  "importer.accountMapping.selectAccountPlaceholder",
                                )}
                                disabled={!txn.selected}
                                className={cn(
                                  isMissingAccount &&
                                    "border-destructive ring-destructive",
                                )}
                              />
                            </FormControl>
                            {fieldState.error && txn.selected && (
                              <FormMessage />
                            )}
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Validation Alert */}
      {missingAccountCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("importer.accountMapping.missingAccountAlert", {
              count: missingAccountCount,
            })}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
