import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { ExactAmountInput } from "@/common/components/exact-amount-input";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { DatePicker } from "@/common/components/ui/date-picker";
import {
  ISO_PATTERN,
  parseStrictCalendarDate,
  todayIsoDate,
} from "@/common/components/ui/date-picker-utils";
import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { useTranslations } from "@/common/hooks/use-translations";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";
import { isPositiveDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { beancountString } from "@/common/lib/beancount/quoted-string";
import type {
  ParsedReceipt,
  ReviewFormData,
} from "../hooks/use-receipt-workflow";

// Keep the receipt's `yyyy-MM-dd` date as that exact day, defaulting to today
// when it's missing or invalid (e.g. the receipt had no printed date, so the
// backend returned null). It never round-trips through a local midnight.
function toReviewDate(value: string | null): string {
  return (
    (value && parseStrictCalendarDate(value, ISO_PATTERN)) || todayIsoDate()
  );
}

interface ReceiptReviewFormProps {
  ledgerId: string;
  parsed: ParsedReceipt;
  primaryCurrency: string;
  /** Resolves `true` once the transaction is written. */
  onSubmit: (data: ReviewFormData) => Promise<boolean | void>;
  onReset: () => void;
  /** Why the last Record failed. */
  error?: string;
}

export function ReceiptReviewForm({
  ledgerId,
  parsed,
  primaryCurrency,
  onSubmit,
  onReset,
  error,
}: ReceiptReviewFormProps) {
  const { t } = useTranslations();

  const reviewFormSchema = useMemo(
    () =>
      z.object({
        date: z.iso.date({ message: t("receipt.review.dateRequired") }),
        payee: z.string().min(1, t("receipt.review.payeeRequired")),
        description: z.string().min(1, t("receipt.review.descriptionRequired")),
        amount: z
          .string()
          .refine(
            (v) => isPositiveDecimalNumber(v),
            t("receipt.review.amountPositive"),
          ),
        currency: z.string().min(1, t("receipt.review.currencyRequired")),
        expenseAccount: z
          .string()
          .min(1, t("receipt.review.expenseAccountRequired")),
        paymentAccount: z
          .string()
          .min(1, t("receipt.review.paymentAccountRequired")),
        documentAccount: z
          .string()
          .min(1, t("receipt.review.documentAccountRequired")),
      }),
    [t],
  );

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      date: toReviewDate(parsed.date),
      payee: parsed.payee,
      description: parsed.description,
      amount: Math.abs(parsed.amount).toFixed(2),
      currency: primaryCurrency,
      expenseAccount: parsed.targetAccount ?? "",
      paymentAccount: parsed.sourceAccount ?? "",
      documentAccount: "",
    },
  });

  // While Record is pending the review is locked: the request already holds
  // its values, and an edit made now would be dropped by the success (w4/m48).
  const { submit, pending } = usePendingSubmit(form, onSubmit);

  // Auto-sync documentAccount from expenseAccount
  const expenseAccount = useWatch({
    control: form.control,
    name: "expenseAccount",
  });
  const prevExpenseRef = useRef("");
  useEffect(() => {
    const docAccount = form.getValues("documentAccount");
    if (docAccount === "" || docAccount === prevExpenseRef.current) {
      form.setValue("documentAccount", expenseAccount);
    }
    prevExpenseRef.current = expenseAccount;
  }, [expenseAccount, form]);

  // Beancount preview
  const watched = useWatch({ control: form.control });
  const previewDate = watched.date || "YYYY-MM-DD";
  const previewText = [
    `${previewDate} * ${beancountString(watched.payee || "Payee")} ${beancountString(watched.description || "Description")}`,
    `  ${watched.expenseAccount || "Expenses:Account"}  ${watched.amount || "0.00"} ${watched.currency || primaryCurrency}`,
    `  ${watched.paymentAccount || "Assets:Account"}  -${watched.amount || "0.00"} ${watched.currency || primaryCurrency}`,
  ].join("\n");

  return (
    <Form {...form}>
      <form onSubmit={submit}>
        <fieldset
          disabled={pending}
          className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2 lg:items-start"
        >
          {/* Left column — input fields */}
          <div className="space-y-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("receipt.review.receiptDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("receipt.review.date")}</FormLabel>
                        <FormControl>
                          <DatePicker
                            disabled={pending}
                            id="receipt-date"
                            value={field.value}
                            onChange={(d) => field.onChange(d)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("receipt.review.payee")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("receipt.review.merchantName")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("receipt.review.description")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "receipt.review.transactionDescription",
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("receipt.review.amount")}</FormLabel>
                        <FormControl>
                          {/* Any precision the exact-decimal schema accepts,
                              like Balance's amount: a fixed cent step made the
                              browser refuse 12.345 before it (w4/982). Its
                              arrow keys step exactly (w4/1021). */}
                          <ExactAmountInput
                            min="0"
                            placeholder="0.00"
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
                      <FormItem>
                        <FormLabel>{t("receipt.review.currency")}</FormLabel>
                        <FormControl>
                          <CurrencyCombobox
                            ledgerId={ledgerId}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("receipt.review.accounts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="expenseAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("receipt.review.expenseAccount")}
                      </FormLabel>
                      <FormControl>
                        <AccountCombobox
                          ledgerId={ledgerId}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t("receipt.review.selectExpenseAccount")}
                          filterPrefix="Expenses:"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("receipt.review.paymentAccount")}
                      </FormLabel>
                      <FormControl>
                        <AccountCombobox
                          ledgerId={ledgerId}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t("receipt.review.selectPaymentAccount")}
                          filterPrefix="Assets:"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("receipt.review.documentAccount")}
                      </FormLabel>
                      <FormControl>
                        <AccountCombobox
                          ledgerId={ledgerId}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t(
                            "receipt.review.selectDocumentAccount",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column — live preview (sticky) */}
          <div className="sticky top-6 space-y-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("receipt.review.preview")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted rounded p-3 font-mono overflow-x-auto">
                  {previewText}
                </pre>
              </CardContent>
            </Card>
            {/* Beside Record, where focus returns after a failure. */}
            {error && !pending && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onReset}>
                {t("receipt.review.uploadDifferentReceipt")}
              </Button>
              <Button type="submit" loading={pending}>
                {t("receipt.review.recordTransaction")}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
