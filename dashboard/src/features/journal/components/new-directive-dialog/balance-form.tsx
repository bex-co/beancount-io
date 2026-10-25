import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { DatePicker } from "@/common/components/ui/date-picker";
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";
import {
  BulkEntriesDocument,
  LedgerEntryType,
  type BulkEntriesMutationVariables,
  type LedgerBalanceInput,
  type LedgerAmountInput,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { useErrorMessage } from "@/common/lib/errors/error-message";

import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { useLedger } from "@/common/hooks/use-ledger";
import { track } from "@/common/analytics";
import { AccountAvailabilityNotice } from "./account-availability-notice";
import { ExactAmountInput } from "@/common/components/exact-amount-input";
import { useAccountAvailability } from "./use-account-availability";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";

interface BalanceFormProps {
  ledgerId: string;
  onSuccess?: () => void;
  /** Reports a write in flight, so the dialog can hold its tabs and close. */
  onPendingChange?: (pending: boolean) => void;
}

// Zod validation schema factory. Required text is trimmed before its
// required check, so whitespace alone is refused rather than sent as "" (w4/334).
const createBalanceSchema = (t: (key: string) => string) =>
  z.object({
    date: z.iso.date(),
    account: z.string().trim().min(1, t("journal.accountRequired")),
    amount: z
      .string()
      .min(1, t("journal.amountRequired"))
      .refine(
        (val) => parseDecimalNumber(val) !== null,
        t("journal.amountMustBeNumber"),
      ),
    currency: z.string().trim().min(1, t("journal.currencyRequired")),
  });

/**
 * Form component for creating balance entries
 * Fields: date, account, amount, currency
 * Used to assert account balances at specific dates
 */
export function BalanceForm({
  ledgerId,
  onSuccess,
  onPendingChange,
}: BalanceFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addBalance] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);
  const { primaryCurrency } = useLedger();

  const balanceSchema = createBalanceSchema(t);
  type BalanceFormData = z.infer<typeof balanceSchema>;

  const form = useForm<BalanceFormData>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      date: todayIsoDate(),
      account: "",
      amount: "",
      currency: primaryCurrency,
    },
    mode: "onChange",
  });

  const accounts = useAccountAvailability(ledgerId);
  const day = form.watch("date") || null;
  const account = form.watch("account");

  const onSubmit = async (data: BalanceFormData) => {
    setError(null);

    try {
      if (accounts.blocks([data.account], data.date)) return;

      // The digits as typed: Beancount infers the assertion's tolerance from
      // them, so `49.70` must not become `49.7` through a double.
      const amountInput: LedgerAmountInput = {
        number: parseDecimalNumber(data.amount) ?? data.amount,
        currency: data.currency,
      };

      // Create balance input
      const balanceInput: LedgerBalanceInput = {
        date: data.date,
        account: data.account,
        amount: amountInput,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [
          ...accounts.openEntries([data.account], data.date),
          { type: LedgerEntryType.Balance, balance: balanceInput },
        ],
      };

      const result = await addBalance({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: todayIsoDate(),
          account: "",
          amount: "",
          currency: primaryCurrency,
        });
        accounts.reset();
        track("directive_added", { directive_type: "balance" });
        onSuccess?.();
        return true;
      } else {
        // Payload message is intentional server feedback (e.g. beancount
        // validation details) — safe to show as-is.
        setError(
          result.data?.bulkEntries.message ||
            t("journal.failedToCreateBalance"),
        );
      }
    } catch (err) {
      setError(formatError(err));
    }
  };

  const { submit, pending } = usePendingSubmit(form, onSubmit, onPendingChange);

  return (
    <Form {...form}>
      <form onSubmit={submit}>
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
              name="account"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">
                    {t("journal.accountLabel")}
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
                  <AccountAvailabilityNotice
                    check={accounts}
                    account={account}
                    day={day}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="w-32">
                  <FormLabel className="sr-only">
                    {t("journal.amountLabel")}
                  </FormLabel>
                  <FormControl>
                    <ExactAmountInput
                      placeholder={t("journal.amountPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="w-48">
                  <FormLabel className="sr-only">
                    {t("journal.currencyLabel")}
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
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                !form.formState.isValid || accounts.blocks([account], day)
              }
              loading={pending}
            >
              {t("journal.createBalanceEntry")}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
