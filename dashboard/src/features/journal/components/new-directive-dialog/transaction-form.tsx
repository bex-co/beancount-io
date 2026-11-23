import { useEntryWrite } from "@/common/lib/entry-write/entry-write";
import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
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

import { track } from "@/common/analytics";

import {
  AccountCombobox,
  CurrencyCombobox,
  PayeesCombobox,
  NarrationsCombobox,
} from "@/common/components/ledger-comboboxes";
import { isDraftSessionError } from "@/common/apollo/links/auth-error-link";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  getUnbalancedResidual,
  useErrorMessage,
} from "@/common/lib/errors/error-message";
import { useLedger } from "@/common/hooks/use-ledger";
import {
  applyAutoBalanceToPostings,
  computeAutoBalance,
  findUnresolvedEligibleAmount,
  isEligiblePosting,
  postingCurrency,
} from "./transaction-auto-balance";
import {
  exceedsLedgerDigits,
  parseDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import { isCompositionKey } from "@/common/lib/keyboard/is-composition-key";
import { AccountAvailabilityNotice } from "./account-availability-notice";
import { ExactAmountInput } from "@/common/components/exact-amount-input";
import { useAccountAvailability } from "./use-account-availability";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";
import { isCurrencyToken } from "@/common/lib/beancount/currency-token";
import { useReportDirty } from "@/common/hooks/use-report-dirty";
import { cn } from "@/common/lib/utils/utils";
import { useIsMobile } from "@/common/hooks/use-mobile";

interface TransactionFormProps {
  ledgerId: string;
  onSuccess?: () => void;
  /** Reports a write in flight, so the dialog can hold its tabs and close. */
  onPendingChange?: (pending: boolean) => void;
  /** Whether the form holds unsaved input (w2/123). */
  onDirtyChange?: (dirty: boolean) => void;
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
  onDirtyChange,
}: TransactionFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addTransaction] = useMutation(BulkEntriesDocument);
  const entryWrite = useEntryWrite();
  const [error, setError] = useState<string | null>(null);
  const postingRowsRef = useRef<HTMLDivElement>(null);
  const { primaryCurrency } = useLedger();
  // Postings are cards below `lg`, with no column names over them: a
  // placeholder there names the field in a word, where an example was cut.
  const postingCards = useIsMobile(1024);

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
          )
          .refine(
            (val) => !exceedsLedgerDigits(val),
            t("common.amountTooLong"),
          ),
        // Blank takes the ledger's currency; anything typed must be one.
        currency: z
          .string()
          .trim()
          .refine(
            (val) => val === "" || isCurrencyToken(val),
            t("common.currencyFormat"),
          ),
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

      // Whether postings balance is the ledger's to decide: its tolerance can
      // be configured (`inferred_tolerance_default`) and is not known here, so
      // −10.00 / 9.99 USD may be valid. An UNBALANCED refusal comes back from
      // the write below, naming its residual, with the draft kept (w4/1026).

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

      const result = await entryWrite.send(() =>
        addTransaction({ variables: entryWrite.withRequestId(variables) }),
      );

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
      if (isDraftSessionError(err)) return;
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
    // Ctrl+Enter or Cmd+Enter submits the way Create does: through the
    // browser's own check, so an unfinished number ("1e", "-"), which the
    // input reports as empty, is refused rather than auto-balanced (w4/1014).
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
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
  useReportDirty(form.formState.isDirty, onDirtyChange);

  return (
    <Form {...form}>
      <form onSubmit={submit} onKeyDown={handleKeyDown}>
        <fieldset disabled={pending} className="min-w-0 space-y-6 pt-1 px-1">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Every field named above itself: a placeholder goes the moment
              the reader types. Date and status share a line on a phone. */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-3 sm:grid-cols-[12rem_auto_minmax(0,1fr)] lg:grid-cols-[10rem_auto_minmax(0,1fr)_minmax(0,1fr)]">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t("journal.date")}
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      disabled={pending}
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
                  <FormLabel
                    aria-hidden="true"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t("common.status")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger
                        className="h-9 w-auto gap-2"
                        aria-label={t("common.status")}
                      >
                        {/* The ledger's flag, then what it means. */}
                        <SelectValue>
                          <span className="font-mono">{field.value}</span>{" "}
                          {field.value === "*" && t("journal.clearedStatus")}
                          {field.value === "!" && t("journal.pendingStatus")}
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
                <FormItem
                  className="col-span-2 sm:col-span-3 lg:col-span-1"
                  data-transaction-payee
                >
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t("journal.payee")}
                  </FormLabel>
                  <FormControl>
                    <PayeesCombobox
                      // The dialog puts the cursor here; the suggestions wait
                      // for the reader, not cover the postings below.
                      openOnFocus={false}
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
                <FormItem className="col-span-2 sm:col-span-3 lg:col-span-1">
                  <FormLabel className="text-xs font-medium text-muted-foreground">
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

          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("common.postings")}</h3>
            {/* Column names where each posting is one line; every field
                also carries its own name for assistive technology. */}
            <div
              aria-hidden="true"
              className={cn(
                "hidden gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid",
                fields.length > 2
                  ? "lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem_2.25rem]"
                  : "lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem]",
              )}
            >
              <span />
              <span>{t("journal.account")}</span>
              <span>{t("journal.amountLabel")}</span>
              <span>{t("journal.currencyLabel")}</span>
            </div>

            {/* Its own scroller only where the dialog is wide and the rows are
                lines, and only once they outgrow it; on a phone the dialog
                scrolls, and a second scroller inside it hid postings. */}
            <div className="lg:max-h-[22rem] lg:overflow-y-auto">
              <div ref={postingRowsRef} className="space-y-2 p-1">
                {fields.map((field, index) => {
                  const autoBalance = autoBalanceInfo.balances.get(index);

                  return (
                    <div
                      key={field.id}
                      data-posting-row={index}
                      className="space-y-1"
                    >
                      {/* A card per posting on a phone or tablet: the account
                          across, its amount and currency beneath. One line
                          per posting where the dialog is wide. */}
                      <div
                        className={cn(
                          "grid items-start gap-2 rounded-lg border p-2 lg:rounded-none lg:border-0 lg:p-0",
                          // A column for Remove only once there is one to
                          // show, so the rows end where the fields above do.
                          fields.length > 2
                            ? "grid-cols-[minmax(0,1fr)_6.5rem_auto] lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem_2.25rem]"
                            : "grid-cols-[minmax(0,1fr)_6.5rem] lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(0,1fr)_7rem]",
                        )}
                      >
                        <div
                          aria-hidden="true"
                          className="hidden h-9 items-center justify-center text-xs font-medium text-muted-foreground lg:flex"
                        >
                          {index + 1}
                        </div>

                        <FormField
                          control={form.control}
                          name={`postings.${index}.account`}
                          render={({ field }) => (
                            <FormItem className="col-span-full lg:col-span-1">
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
                                  placeholder={
                                    postingCards
                                      ? t("journal.account")
                                      : t("journal.accountPlaceholder")
                                  }
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
                            <FormItem className="relative">
                              <FormLabel className="sr-only">
                                {t("journal.postingAmount", {
                                  number: index + 1,
                                })}
                              </FormLabel>
                              <FormControl>
                                <ExactAmountInput
                                  placeholder={
                                    autoBalance
                                      ? autoBalance.amount
                                      : postingCards
                                        ? t("journal.amountLabel")
                                        : t("journal.amountPlaceholder")
                                  }
                                  className={
                                    autoBalance && !field.value
                                      ? // Reserve the auto label's space so the
                                        // right-aligned inferred amount cannot
                                        // run underneath it (w4/1060).
                                        "text-muted-foreground italic pe-14"
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
                            // The account needs the width; a currency code
                            // does not.
                            <FormItem>
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
                            className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                            aria-label={t("journal.removePosting", {
                              number: index + 1,
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <AccountAvailabilityNotice
                        check={accounts}
                        account={watchedPostings?.[index]?.account ?? ""}
                        day={day}
                        className="lg:pl-8"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Named, under the rows it adds to. Past two rows a blank one
                is always waiting, so the choice is not needed. */}
            {fields.length <= 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addPosting}
                className="gap-1.5 text-muted-foreground hover:text-foreground lg:ml-8 pointer-coarse:h-11"
              >
                <Plus aria-hidden="true" className="size-4" />
                {t("journal.addPosting")}
              </Button>
            )}
          </div>

          {/* Always in reach: on a phone the button rides the bottom of the
              scrolling form instead of waiting below every posting. */}
          <div className="sticky bottom-0 -mx-1 flex justify-end border-t bg-background px-1 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              type="submit"
              className="pointer-coarse:h-11"
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
