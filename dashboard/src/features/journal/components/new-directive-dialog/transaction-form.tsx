import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/common/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DatePicker } from "@/common/components/ui/date-picker";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  BulkEntriesDocument,
  LedgerEntryType,
  type BulkEntriesMutationVariables,
  type LedgerTransactionInput,
  type LedgerPostingInput,
} from "@/graphql/definitions";

import { ScrollArea } from "@/common/components/ui/scroll-area";
import { track } from "@/common/analytics";

import {
  AccountCombobox,
  CurrencyCombobox,
  PayeesCombobox,
  NarrationsCombobox,
} from "@/common/components/ledger-comboboxes";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useLedger } from "@/common/hooks/use-ledger";

interface TransactionFormProps {
  ledgerId: string;
  onSuccess?: () => void;
}

type TransactionFormData = {
  date: Date;
  flag: string;
  payee?: string;
  narration?: string;
  postings: {
    account: string;
    amount: string;
    currency: string;
  }[];
};

/**
 * Form component for creating transaction entries
 * Fields: date, payee, narration, postings (array)
 * Features: auto-balance, smart posting management, keyboard shortcuts
 */
export function TransactionForm({ ledgerId, onSuccess }: TransactionFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addTransaction] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);
  const { primaryCurrency } = useLedger();

  // Zod validation schema for posting with translations
  // Allow empty accounts and amounts for flexibility
  const postingSchema = useMemo(
    () =>
      z.object({
        account: z.string().trim(),
        amount: z
          .string()
          .refine(
            (val) =>
              val === "" ||
              (!isNaN(parseFloat(val)) && isFinite(parseFloat(val))),
            t("journal.amountMustBeNumber"),
          ),
        currency: z.string().trim(),
      }),
    [t],
  );

  // Zod validation schema for transaction with translations
  const transactionSchema = useMemo(
    () =>
      z.object({
        date: z.date(),
        flag: z.string().trim(),
        payee: z.string().trim().optional(),
        narration: z.string().trim().optional(),
        postings: z.array(postingSchema).min(2),
      }),
    [postingSchema],
  );

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      flag: "*",
      postings: [
        {
          account: "",
          amount: "",
          currency: primaryCurrency,
        },
        {
          account: "",
          amount: "",
          currency: primaryCurrency,
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "postings",
  });

  // Watch all postings for auto-balance calculation
  const watchedPostings = useWatch({
    control: form.control,
    name: "postings",
  });

  // Auto-focus payee field on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Find and focus the payee input (combobox trigger)
      const payeeInput =
        document.querySelector<HTMLButtonElement>('[role="combobox"]');
      payeeInput?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Auto-add empty posting when all rows are filled (Fava pattern)
  useEffect(() => {
    if (!watchedPostings) return;

    // Check if all postings have an account (not empty)
    const allFilled = watchedPostings.every(
      (posting) => posting.account && posting.account.trim() !== "",
    );

    // If all filled and we have at least 2, add a new empty posting
    if (allFilled && watchedPostings.length >= 2) {
      append(
        {
          account: "",
          amount: "",
          currency: primaryCurrency,
        },
        { shouldFocus: false }, // Don't auto-focus the new row to prevent scroll
      );
    }
  }, [watchedPostings, append, primaryCurrency]);

  // Calculate auto-balance amount
  const autoBalanceInfo = useMemo(() => {
    if (!watchedPostings) return null;

    // Group postings by currency
    const currencyGroups = new Map<
      string,
      { filled: number[]; emptyIndex: number | null }
    >();

    watchedPostings.forEach((posting, index) => {
      const currency = posting.currency || primaryCurrency;
      const amount = posting.amount;

      if (!currencyGroups.has(currency)) {
        currencyGroups.set(currency, { filled: [], emptyIndex: null });
      }

      const group = currencyGroups.get(currency)!;

      if (amount && amount.trim() !== "") {
        const num = parseFloat(amount);
        if (!isNaN(num) && isFinite(num)) {
          group.filled.push(num);
        }
      } else if (group.emptyIndex === null) {
        group.emptyIndex = index;
      }
    });

    // Calculate balance for each currency
    const balances = new Map<number, { amount: number; currency: string }>();

    currencyGroups.forEach((group, currency) => {
      if (group.emptyIndex !== null && group.filled.length > 0) {
        const sum = group.filled.reduce((acc, val) => acc + val, 0);
        const balance = -sum;
        balances.set(group.emptyIndex, { amount: balance, currency });
      }
    });

    return balances;
  }, [watchedPostings, primaryCurrency]);

  const onSubmit = async (data: TransactionFormData) => {
    setError(null);

    try {
      // Keep all postings, apply auto-balance where applicable
      const finalPostings = data.postings.map((posting, index) => {
        const autoBalance = autoBalanceInfo?.get(index);
        if (autoBalance && (!posting.amount || posting.amount.trim() === "")) {
          return {
            ...posting,
            amount: autoBalance.amount.toString(),
          };
        }
        return posting;
      });

      // Create postings array - skip empty accounts
      const ledgerPostings: LedgerPostingInput[] = finalPostings
        .filter((posting) => posting.account && posting.account.trim() !== "")
        .map((posting) => ({
          account: posting.account,
          units: {
            number: parseFloat(posting.amount).toString(),
            currency: posting.currency,
          },
        }));

      // Validate we have at least 2 filled postings
      if (ledgerPostings.length < 2) {
        setError(t("journal.atLeastTwoPostings"));
        return;
      }

      // Create transaction input
      const transactionInput: LedgerTransactionInput = {
        date: format(data.date, "yyyy-MM-dd"),
        flag: data.flag,
        payee: data.payee,
        narration: data.narration,
        postings: ledgerPostings,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [
          { type: LedgerEntryType.Transaction, transaction: transactionInput },
        ],
      };

      const result = await addTransaction({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: new Date(),
          flag: "*",
          payee: "",
          narration: "",
          postings: [
            {
              account: "",
              amount: "",
              currency: primaryCurrency,
            },
            {
              account: "",
              amount: "",
              currency: primaryCurrency,
            },
          ],
        });
        track("directive_added", { directive_type: "transaction" });
        onSuccess?.();
      } else {
        // Payload message is intentional server feedback — safe to show.
        setError(
          result.data?.bulkEntries.message ||
            t("journal.failedToCreateTransaction"),
        );
      }
    } catch (err) {
      setError(formatError(err));
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void form.handleSubmit(onSubmit)();
    }
  };

  const addPosting = () => {
    append(
      {
        account: "",
        amount: "",
        currency: primaryCurrency,
      },
      { shouldFocus: false }, // Don't auto-focus the new row to prevent scroll
    );
  };

  const removePosting = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={handleKeyDown}
        className="space-y-6 pt-1 px-1"
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-2 md:flex md:items-start md:gap-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <DatePicker
                    id="date"
                    value={field.value}
                    onChange={(newDate) => {
                      if (newDate) {
                        field.onChange(newDate);
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="flag"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9 w-9 [&>svg]:hidden">
                      <SelectValue>
                        {field.value === "*" && "*"}
                        {field.value === "!" && "!"}
                        {field.value === " " && " "}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="*">
                      * {t("journal.clearedStatus")}
                    </SelectItem>
                    <SelectItem value="!">
                      ! {t("journal.pendingStatus")}
                    </SelectItem>
                    <SelectItem value=" ">
                      {t("journal.blankStatus")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payee"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <PayeesCombobox
                    ledgerId={ledgerId}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder={t("journal.payeePlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="narration"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <NarrationsCombobox
                    ledgerId={ledgerId}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder={t("journal.narrationPlaceholder")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t("common.postings")}</h3>
          </div>

          <ScrollArea className="h-[220px]">
            <div className="space-y-2 pr-4 pt-1 pl-1">
              {fields.map((field, index) => {
                const autoBalance = autoBalanceInfo?.get(index);
                const isLastRow = index === fields.length - 1;

                return (
                  <div key={field.id} className="space-y-1">
                    <div className="grid grid-cols-1 gap-2 md:flex md:items-start md:gap-2">
                      <div className="flex items-center justify-center w-6 h-9 text-xs text-muted-foreground font-medium shrink-0">
                        {index + 1}
                      </div>

                      <FormField
                        control={form.control}
                        name={`postings.${index}.account`}
                        render={({ field }) => (
                          <FormItem className="flex-2">
                            <FormControl>
                              <AccountCombobox
                                ledgerId={ledgerId}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder={t("journal.accountPlaceholder")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`postings.${index}.amount`}
                        render={({ field }) => (
                          <FormItem className="flex-1 relative">
                            <FormControl>
                              <Input
                                id={`amount-${index}`}
                                type="number"
                                step="0.01"
                                placeholder={
                                  autoBalance
                                    ? `${autoBalance.amount.toFixed(2)}`
                                    : t("journal.amountPlaceholder")
                                }
                                className={
                                  autoBalance && !field.value
                                    ? "text-muted-foreground italic"
                                    : ""
                                }
                                {...field}
                              />
                            </FormControl>
                            {autoBalance && !field.value && (
                              <div className="absolute right-2 top-2 text-xs text-muted-foreground pointer-events-none">
                                {t("journal.autoAmount")}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`postings.${index}.currency`}
                        render={({ field }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <CurrencyCombobox
                                ledgerId={ledgerId}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder={t("journal.currencyPlaceholder")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {fields.length > 2 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePosting(index)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : isLastRow ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPosting}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-primary shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="h-9 w-9 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t("journal.createTransactionEntry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
