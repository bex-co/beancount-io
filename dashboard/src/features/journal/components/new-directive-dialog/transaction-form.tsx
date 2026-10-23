import { useState, useMemo, useEffect, useRef } from "react";
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
  FormLabel,
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
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";
import { Plus, Trash2 } from "lucide-react";
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
import {
  getUnbalancedResidual,
  useErrorMessage,
} from "@/common/lib/errors/error-message";
import { useLedger } from "@/common/hooks/use-ledger";
import {
  applyAutoBalanceToPostings,
  computeAutoBalance,
  findUnbalancedResiduals,
  findUnresolvedEligibleAmount,
  isEligiblePosting,
  postingCurrency,
} from "./transaction-auto-balance";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { isCompositionKey } from "@/common/lib/keyboard/is-composition-key";
import { AccountAvailabilityNotice } from "./account-availability-notice";
import { useAccountAvailability } from "./use-account-availability";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";

interface TransactionFormProps {
  ledgerId: string;
  onSuccess?: () => void;
  /** Reports a write in flight, so the dialog can hold its tabs and close. */
  onPendingChange?: (pending: boolean) => void;
}

type TransactionFormData = {
  date: string;
  flag: "*" | "!";
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
export function TransactionForm({
  ledgerId,
  onSuccess,
  onPendingChange,
}: TransactionFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addTransaction] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);
  const postingRowsRef = useRef<HTMLDivElement>(null);
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
            (val) => val === "" || parseDecimalNumber(val) !== null,
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
        date: z.iso.date(),
        // Beancount has no blank transaction status: only Cleared and
        // Pending survive a save (w4/270).
        flag: z.enum(["*", "!"]),
        payee: z.string().trim().optional(),
        narration: z.string().trim().optional(),
        postings: z.array(postingSchema).min(2),
      }),
    [postingSchema],
  );

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: todayIsoDate(),
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

  // Auto-focus payee field on mount. Scope to the payee wrapper — the Status
  // select is also role=combobox and sits earlier in the DOM, so a document-
  // wide querySelector steals focus from whoever is typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          "[data-transaction-payee] [role='combobox'], [data-transaction-payee] input",
        )
        ?.focus();
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

  const accounts = useAccountAvailability(ledgerId);
  const day = form.watch("date") || null;
  const postingAccounts = (watchedPostings ?? []).map(
    (posting) => posting.account,
  );

  // Calculate auto-balance amount among postings that will be written
  const autoBalanceInfo = useMemo(() => {
    if (!watchedPostings) {
      return { balances: new Map(), incomplete: false };
    }
    return computeAutoBalance(watchedPostings, primaryCurrency);
  }, [watchedPostings, primaryCurrency]);

  const onSubmit = async (data: TransactionFormData) => {
    setError(null);

    try {
      const named = data.postings.map((posting) => posting.account);
      if (accounts.blocks(named, data.date)) return;

      const { balances, incomplete } = computeAutoBalance(
        data.postings,
        primaryCurrency,
      );

      if (incomplete) {
        setError(t("journal.amountRequired"));
        return;
      }

      const balancedPostings = applyAutoBalanceToPostings(
        data.postings,
        balances,
      );

      if (findUnresolvedEligibleAmount(balancedPostings) !== null) {
        setError(t("journal.amountRequired"));
        return;
      }

      // The ledger refuses these as UNBALANCED; say so before sending.
      const residuals = findUnbalancedResiduals(
        balancedPostings,
        primaryCurrency,
      );
      if (residuals.length > 0) {
        setError(
          t("journal.postingsUnbalanced", {
            residual: residuals
              .map(({ amount, currency }) => `${amount} ${currency}`)
              .join(", "),
          }),
        );
        return;
      }

      // Create postings array - skip empty accounts
      const ledgerPostings: LedgerPostingInput[] = balancedPostings
        .filter((posting) => isEligiblePosting(posting))
        .map((posting) => ({
          account: posting.account,
          units: {
            number: parseDecimalNumber(posting.amount) ?? posting.amount,
            currency: postingCurrency(posting, primaryCurrency),
          },
        }));

      // Validate we have at least 2 filled postings
      if (ledgerPostings.length < 2) {
        setError(t("journal.atLeastTwoPostings"));
        return;
      }

      // Create transaction input
      const transactionInput: LedgerTransactionInput = {
        date: data.date,
        flag: data.flag,
        payee: data.payee,
        narration: data.narration,
        postings: ledgerPostings,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [
          ...accounts.openEntries(named, data.date),
          { type: LedgerEntryType.Transaction, transaction: transactionInput },
        ],
      };

      const result = await addTransaction({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: todayIsoDate(),
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
        accounts.reset();
        track("directive_added", { directive_type: "transaction" });
        onSuccess?.();
        return true;
      } else {
        // Payload message is intentional server feedback — safe to show.
        setError(
          result.data?.bulkEntries.message ||
            t("journal.failedToCreateTransaction"),
        );
      }
    } catch (err) {
      const residual = getUnbalancedResidual(err);
      setError(
        residual
          ? t("journal.postingsUnbalanced", { residual })
          : formatError(err),
      );
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // An Enter the input method is consuming confirms its composition, not
    // the transaction (w4/965).
    if (isCompositionKey(e.nativeEvent)) return;
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };

  // An explicit Add moves on to the row it made. Its own button becomes that
  // row's neighbour's Remove once there are three rows, so leaving focus
  // there let the next Enter delete a posting (w4/967). The automatic blank
  // row above stays unfocused.
  const addPosting = () => {
    const added = fields.length;
    append(
      {
        account: "",
        amount: "",
        currency: primaryCurrency,
      },
      { shouldFocus: false }, // Focus moves below, without RHF's scroll.
    );
    requestAnimationFrame(() => {
      postingRowsRef.current
        ?.querySelector<HTMLElement>(
          `[data-posting-row="${added}"] input`, // its account, first in the row
        )
        ?.focus();
    });
  };

  // Remove unmounts its own focused button, which left focus on the dialog
  // and sent Tab back to its top (w4/1010). Move on to the posting that takes
  // the removed row's place, or the one before it when the last row went.
  const removePosting = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
    const target = Math.min(index, fields.length - 2);
    requestAnimationFrame(() => {
      postingRowsRef.current
        ?.querySelector<HTMLElement>(`[data-posting-row="${target}"] input`)
        ?.focus();
    });
  };

  const { submit, pending } = usePendingSubmit(form, onSubmit, onPendingChange);

  return (
    <Form {...form}>
      <form onSubmit={submit} onKeyDown={handleKeyDown}>
        <fieldset disabled={pending} className="min-w-0 space-y-6 pt-1 px-1">
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
                  <FormLabel className="sr-only">{t("journal.date")}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(newDate) => field.onChange(newDate)}
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
                      <SelectTrigger
                        className="h-9 w-9 [&>svg]:hidden"
                        aria-label={t("common.status")}
                      >
                        <SelectValue>
                          <span aria-hidden="true">
                            {field.value === "*" && "*"}
                            {field.value === "!" && "!"}
                          </span>
                          <span className="sr-only">
                            {field.value === "*" && t("journal.clearedStatus")}
                            {field.value === "!" && t("journal.pendingStatus")}
                          </span>
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
                <FormItem className="flex-1" data-transaction-payee>
                  <FormLabel className="sr-only">
                    {t("journal.payee")}
                  </FormLabel>
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
                  <FormLabel className="sr-only">
                    {t("journal.narration")}
                  </FormLabel>
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
              <div ref={postingRowsRef} className="space-y-2 pr-4 pt-1 pl-1">
                {fields.map((field, index) => {
                  const autoBalance = autoBalanceInfo.balances.get(index);
                  const isLastRow = index === fields.length - 1;

                  return (
                    <div
                      key={field.id}
                      data-posting-row={index}
                      className="space-y-1"
                    >
                      <div className="grid grid-cols-1 gap-2 md:flex md:items-start md:gap-2">
                        <div className="flex items-center justify-center w-6 h-9 text-xs text-muted-foreground font-medium shrink-0">
                          {index + 1}
                        </div>

                        <FormField
                          control={form.control}
                          name={`postings.${index}.account`}
                          render={({ field }) => (
                            <FormItem className="flex-2">
                              <FormLabel className="sr-only">
                                {t("journal.postingAccount", {
                                  number: index + 1,
                                })}
                              </FormLabel>
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
                              <FormLabel className="sr-only">
                                {t("journal.postingAmount", {
                                  number: index + 1,
                                })}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder={
                                    autoBalance
                                      ? autoBalance.amount
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
                            <FormItem className="w-48">
                              <FormLabel className="sr-only">
                                {t("journal.postingCurrency", {
                                  number: index + 1,
                                })}
                              </FormLabel>
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
                            aria-label={t("journal.removePosting", {
                              number: index + 1,
                            })}
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
                            aria-label={t("journal.addPosting")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="h-9 w-9 shrink-0" />
                        )}
                      </div>
                      <AccountAvailabilityNotice
                        check={accounts}
                        account={watchedPostings?.[index]?.account ?? ""}
                        day={day}
                        className="md:pl-8"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={accounts.blocks(postingAccounts, day)}
              loading={pending}
            >
              {t("journal.createTransactionEntry")}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
