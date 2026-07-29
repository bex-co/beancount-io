import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { DatePicker } from "@/common/components/ui/date-picker";
import { format } from "date-fns";
import {
  BulkEntriesDocument,
  LedgerEntryType,
  type BulkEntriesMutationVariables,
  type LedgerBalanceInput,
  type LedgerAmountInput,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { useLedger } from "@/common/hooks/use-ledger";
import { track } from "@/common/analytics";

interface BalanceFormProps {
  ledgerId: string;
  onSuccess?: () => void;
}

// Zod validation schema factory
const createBalanceSchema = (t: (key: string) => string) =>
  z.object({
    date: z.date(),
    account: z.string().min(1, t("journal.accountRequired")).trim(),
    amount: z
      .string()
      .min(1, t("journal.amountRequired"))
      .refine(
        (val) => !isNaN(parseFloat(val)) && isFinite(parseFloat(val)),
        t("journal.amountMustBeNumber"),
      ),
    currency: z.string().min(1, t("journal.currencyRequired")).trim(),
  });

/**
 * Form component for creating balance entries
 * Fields: date, account, amount, currency
 * Used to assert account balances at specific dates
 */
export function BalanceForm({ ledgerId, onSuccess }: BalanceFormProps) {
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
      date: new Date(),
      account: "",
      amount: "",
      currency: primaryCurrency,
    },
    mode: "onChange",
  });

  const onSubmit = async (data: BalanceFormData) => {
    setError(null);

    try {
      // Parse amount
      const amountNumber = parseFloat(data.amount);

      // Create amount input
      const amountInput: LedgerAmountInput = {
        number: amountNumber.toString(),
        currency: data.currency,
      };

      // Create balance input
      const balanceInput: LedgerBalanceInput = {
        date: format(data.date, "yyyy-MM-dd"),
        account: data.account,
        amount: amountInput,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [{ type: LedgerEntryType.Balance, balance: balanceInput }],
      };

      const result = await addBalance({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: new Date(),
          account: "",
          amount: "",
          currency: primaryCurrency,
        });
        track("directive_added", { directive_type: "balance" });
        onSuccess?.();
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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
                    placeholder={t("journal.selectBalanceDate")}
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
            name="amount"
            render={({ field }) => (
              <FormItem className="w-32">
                <FormControl>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
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
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!form.formState.isValid}
            loading={form.formState.isSubmitting}
          >
            {t("journal.createBalanceEntry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
