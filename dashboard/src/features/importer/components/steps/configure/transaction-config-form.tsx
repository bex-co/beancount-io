import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { AccountMappingTable } from "./account-mapping-table";
import { useAICategorization } from "../../../hooks/use-ai-categorization";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import type { ParsedRow, ImportTransaction } from "../../../types";
import {
  buildImportConfigFormValues,
  getValidImportRows,
  toImportConfigDraft,
  type ImportConfigDraft,
} from "../../../lib/import-config-draft";
import { useLedger } from "@/common/hooks/use-ledger";

interface TransactionConfigFormProps {
  rows: ParsedRow[];
  ledgerId: string;
  configDraft: ImportConfigDraft | null;
  onConfigDraftChange: (draft: ImportConfigDraft) => void;
  onSubmit: (transactions: ImportTransaction[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function TransactionConfigForm({
  rows,
  ledgerId,
  configDraft,
  onConfigDraftChange,
  onSubmit,
  onBack,
  isSubmitting,
}: TransactionConfigFormProps) {
  const { t } = useTranslations();
  const { primaryCurrency } = useLedger();
  const validRows = useMemo(() => getValidImportRows(rows), [rows]);

  const formSchema = useMemo(
    () =>
      z
        .object({
          sourceAccount: z
            .string()
            .min(1, t("importer.configure.sourceAccountRequired")),
          defaultCurrency: z
            .string()
            .min(1, t("importer.configure.currencyRequired")),
          transactions: z
            .array(
              z.object({
                id: z.string(),
                rowIndex: z.number(),
                date: z.string(),
                payee: z.string(),
                description: z.string(),
                amount: z.number(),
                amountInput: z.string(),
                targetAccount: z.string(),
                selected: z.boolean(),
              }),
            )
            .min(1, t("importer.configure.atLeastOneTransaction")),
        })
        .refine(
          (data) => {
            const selectedTransactions = data.transactions.filter(
              (txn) => txn.selected,
            );
            return selectedTransactions.every(
              (txn) => txn.targetAccount && txn.targetAccount.length > 0,
            );
          },
          {
            message: t("importer.configure.allSelectedNeedAccount"),
            path: ["transactions"],
          },
        )
        .refine((data) => data.transactions.some((txn) => txn.selected), {
          message: t("importer.configure.atLeastOneSelected"),
          path: ["transactions"],
        }),
    [t],
  );

  type FormData = z.infer<typeof formSchema>;

  const defaultValues = useMemo(
    () => buildImportConfigFormValues(rows, configDraft, primaryCurrency),
    // Mount-time defaults only; remount after Back restores the latest draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values.transactions) return;
      onConfigDraftChange(
        toImportConfigDraft({
          sourceAccount: values.sourceAccount ?? "",
          defaultCurrency: values.defaultCurrency ?? primaryCurrency,
          transactions: (values.transactions ?? []).flatMap((txn) =>
            txn?.id
              ? [
                  {
                    id: txn.id,
                    rowIndex: txn.rowIndex ?? 0,
                    date: txn.date ?? "",
                    payee: txn.payee ?? "",
                    description: txn.description ?? "",
                    amount: txn.amount ?? 0,
                    amountInput: txn.amountInput ?? "",
                    targetAccount: txn.targetAccount ?? "",
                    selected: txn.selected ?? true,
                  },
                ]
              : [],
          ),
        }),
      );
    });
    return () => subscription.unsubscribe();
  }, [form, onConfigDraftChange, primaryCurrency]);

  const { categorizeTransactions, loading: aiLoading } =
    useAICategorization(ledgerId);

  const handleAICategorize = async () => {
    const suggestions = await categorizeTransactions(validRows);
    const currentTransactions = form.getValues("transactions");
    const updatedTransactions = currentTransactions.map((txn) => {
      const suggestion = suggestions.get(txn.rowIndex);
      if (suggestion && suggestion.confidence >= 0.5) {
        return {
          ...txn,
          targetAccount: suggestion.targetAccount,
        };
      }
      return txn;
    });
    form.setValue("transactions", updatedTransactions);
  };

  const handleSubmit = (data: FormData) => {
    const selectedTransactions = data.transactions.filter(
      (txn) => txn.selected,
    );
    const transactions: ImportTransaction[] = selectedTransactions.map(
      (txn) => ({
        rowIndex: txn.rowIndex,
        date: txn.date,
        payee: txn.payee,
        description: txn.description,
        amount: parseDecimalNumber(txn.amountInput) ?? txn.amountInput.trim(),
        sourceAccount: data.sourceAccount,
        targetAccount: txn.targetAccount,
        currency: data.defaultCurrency,
      }),
    );
    onSubmit(transactions);
  };

  const selectedCount = form
    .watch("transactions")
    .filter((txn) => txn.selected).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("importer.configure.title")}</CardTitle>
            <CardDescription>
              {t("importer.configure.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourceAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("importer.configure.sourceAccount")}
                    </FormLabel>
                    <FormControl>
                      <AccountCombobox
                        ledgerId={ledgerId}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t(
                          "importer.configure.sourceAccountPlaceholder",
                        )}
                        className={cn(
                          !field.value && "border-destructive ring-destructive",
                        )}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("importer.configure.sourceAccountHint")}
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("importer.configure.currency")}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                        ledgerId={ledgerId}
                        value={field.value}
                        onValueChange={field.onChange}
                        className={cn(
                          !field.value && "border-destructive ring-destructive",
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("importer.configure.currencyHint")}
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">
                {t("importer.configure.assignTargetAccounts")}
              </h3>
              <AccountMappingTable
                control={form.control}
                ledgerId={ledgerId}
                onAICategorize={handleAICategorize}
                aiLoading={aiLoading}
                transactionCount={validRows.length}
              />
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
              >
                {t("importer.configure.back")}
              </Button>
              <Button
                type="submit"
                disabled={selectedCount === 0 || isSubmitting}
              >
                {isSubmitting
                  ? t("importer.configure.importing")
                  : t("importer.configure.importButton", {
                      count: selectedCount,
                    })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
