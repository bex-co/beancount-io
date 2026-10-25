import { useEffect, useId, useMemo, useRef } from "react";
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
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/common/lib/utils/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { AccountMappingTable } from "./account-mapping-table";
import { useAICategorization } from "../../../hooks/use-ai-categorization";
import type { ParsedRow, ImportTransaction } from "../../../types";
import {
  buildImportConfigFormValues,
  getValidImportRows,
  retainedRowChoices,
  toImportConfigDraft,
  type ImportConfigDraft,
} from "../../../lib/import-config-draft";
import { findImportCurrencyConflicts } from "../../../lib/import-currency-conflicts";
import { useLedger } from "@/common/hooks/use-ledger";

/** Row numbers a currency conflict names before eliding the rest. */
const CONFLICT_ROWS_SHOWN = 5;

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
  const { t, i18n } = useTranslations();
  const targetsHeadingId = useId();
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
                amountDecimal: z.string(),
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

  // Saving a Configure edit must not drop a choice for a row Preview holds
  // back as invalid (w4/309); those rows do not change while Configure is open.
  const retainedChoices = useMemo(
    () => retainedRowChoices(rows, configDraft),
    // Mount-time, like the defaults above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // A stored error keeps the language it was validated in; quietly
  // revalidate only the fields already showing one when the language
  // changes, so its text follows without another submit (w4/1086).
  const latestErrorsRef = useRef(form.formState.errors);
  useEffect(() => {
    latestErrorsRef.current = form.formState.errors;
  });
  const previousLanguageRef = useRef(i18n.language);
  useEffect(() => {
    if (previousLanguageRef.current === i18n.language) return;
    previousLanguageRef.current = i18n.language;
    const names = Object.keys(latestErrorsRef.current) as Array<keyof FormData>;
    if (names.length > 0) void form.trigger(names);
    // form identity is stable; the language change is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values.transactions) return;
      onConfigDraftChange(
        toImportConfigDraft(
          {
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
                      amountDecimal: txn.amountDecimal ?? "",
                      targetAccount: txn.targetAccount ?? "",
                      selected: txn.selected ?? true,
                    },
                  ]
                : [],
            ),
          },
          retainedChoices,
        ),
      );
    });
    return () => subscription.unsubscribe();
  }, [form, onConfigDraftChange, primaryCurrency, retainedChoices]);

  const { categorizeTransactions, loading: aiLoading } =
    useAICategorization(ledgerId);

  const conflictAlertRef = useRef<HTMLDivElement>(null);

  const handleAICategorize = async () => {
    // Targets as AI Fill found them. A target the reader changes while the
    // suggestions are pending is theirs: a late suggestion fills only a row
    // still holding what it held when the request started (w4/323).
    const requested = new Map(
      form
        .getValues("transactions")
        .map((txn) => [txn.id, txn.targetAccount] as const),
    );
    const suggestions = await categorizeTransactions(validRows);
    const currentTransactions = form.getValues("transactions");
    // The rows a suggestion actually filled, which is what the completion
    // message reports (w4/324).
    let applied = 0;
    const updatedTransactions = currentTransactions.map((txn) => {
      const suggestion = suggestions.get(txn.rowIndex);
      if (
        suggestion &&
        suggestion.confidence >= 0.5 &&
        requested.get(txn.id) === txn.targetAccount
      ) {
        applied += 1;
        return {
          ...txn,
          targetAccount: suggestion.targetAccount,
        };
      }
      return txn;
    });
    // Apply each filled row as a scalar update: an aggregate array setValue
    // regenerates every field-array ID, remounting the row being edited and
    // losing its focus/caret even when nothing was applied (w4/1073).
    updatedTransactions.forEach((txn, index) => {
      if (txn === currentTransactions[index]) return;
      form.setValue(`transactions.${index}.targetAccount`, txn.targetAccount, {
        shouldDirty: true,
      });
    });
    return applied;
  };

  const handleSubmit = (data: FormData) => {
    // One Currency posts every selected row, so a row written in another is
    // refused, and focus moves to the alert saying why (w4/m44).
    if (currencyConflicts.length > 0) {
      conflictAlertRef.current?.focus();
      return;
    }
    const selectedTransactions = data.transactions.filter(
      (txn) => txn.selected,
    );
    const transactions: ImportTransaction[] = selectedTransactions.map(
      (txn) => ({
        rowIndex: txn.rowIndex,
        date: txn.date,
        payee: txn.payee,
        description: txn.description,
        // Never the raw cell: `(12.50)` or comma-decimal `-1.000` would be
        // refused or written as a different number.
        amount: txn.amountDecimal,
        sourceAccount: data.sourceAccount,
        targetAccount: txn.targetAccount,
        currency: data.defaultCurrency,
      }),
    );
    onSubmit(transactions);
  };

  const watchedTransactions = form.watch("transactions");
  const watchedCurrency = form.watch("defaultCurrency");
  const selectedCount = watchedTransactions.filter(
    (txn) => txn.selected,
  ).length;
  const currencyConflicts = findImportCurrencyConflicts(
    watchedTransactions,
    watchedCurrency,
  );
  const listRows = (rows: number[]) =>
    new Intl.ListFormat(i18n.language, { type: "unit", style: "short" }).format(
      [
        ...rows.slice(0, CONFLICT_ROWS_SHOWN).map(String),
        ...(rows.length > CONFLICT_ROWS_SHOWN ? ["…"] : []),
      ],
    );
  const listCurrencies = (currencies: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: "disjunction" }).format(
      currencies,
    );

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
            {/* Every control that shapes the payload is frozen while its
                batch is pending: the request already holds the old values,
                and success discards the form (w4/280). */}
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
                        disabled={isSubmitting}
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
                    {/* The required error, which aria-describedby already
                        points at, as Currency shows its own (w4/322). */}
                    <FormMessage />
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
                        disabled={isSubmitting}
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

            {currencyConflicts.length > 0 && (
              <Alert variant="destructive" ref={conflictAlertRef} tabIndex={-1}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {currencyConflicts.map((conflict) => (
                    <p key={conflict.symbol}>
                      {t("importer.configure.currencyConflict", {
                        count: conflict.rows.length,
                        rows: listRows(conflict.rows),
                        symbol: conflict.symbol,
                        currencies: listCurrencies(conflict.currencies),
                        currency: watchedCurrency,
                      })}
                    </p>
                  ))}
                  <p>{t("importer.configure.currencyConflictRemedy")}</p>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h3 id={targetsHeadingId} className="text-sm font-medium mb-3">
                {t("importer.configure.assignTargetAccounts")}
              </h3>
              <AccountMappingTable
                labelledBy={targetsHeadingId}
                control={form.control}
                ledgerId={ledgerId}
                onAICategorize={handleAICategorize}
                aiLoading={aiLoading}
                transactionCount={validRows.length}
                disabled={isSubmitting}
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
