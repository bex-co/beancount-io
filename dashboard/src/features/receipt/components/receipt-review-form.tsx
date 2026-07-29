import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
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
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { useTranslations } from "@/common/hooks/use-translations";
import type {
  ParsedReceipt,
  ReviewFormData,
} from "../hooks/use-receipt-workflow";

// Parse the receipt's date, defaulting to today when it's missing or invalid
// (e.g. the receipt had no printed date, so the backend returned null).
function toReviewDate(value: string | null): Date {
  if (value) {
    const parsed = new Date(value + "T00:00:00");
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

interface ReceiptReviewFormProps {
  ledgerId: string;
  parsed: ParsedReceipt;
  primaryCurrency: string;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onReset: () => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function ReceiptReviewForm({
  ledgerId,
  parsed,
  primaryCurrency,
  onSubmit,
  onReset,
  isSubmitting,
  error,
}: ReceiptReviewFormProps) {
  const { t } = useTranslations();

  const reviewFormSchema = useMemo(
    () =>
      z.object({
        date: z.date({ message: t("receipt.review.dateRequired") }),
        payee: z.string().min(1, t("receipt.review.payeeRequired")),
        description: z.string().min(1, t("receipt.review.descriptionRequired")),
        amount: z
          .string()
          .refine(
            (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
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
  const previewDate = watched.date
    ? format(watched.date, "yyyy-MM-dd")
    : "YYYY-MM-DD";
  const previewText = [
    `${previewDate} * "${watched.payee || "Payee"}" "${watched.description || "Description"}"`,
    `  ${watched.expenseAccount || "Expenses:Account"}  ${watched.amount || "0.00"} ${watched.currency || primaryCurrency}`,
    `  ${watched.paymentAccount || "Assets:Account"}  -${watched.amount || "0.00"} ${watched.currency || primaryCurrency}`,
  ].join("\n");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:items-start">
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
                            id="receipt-date"
                            value={field.value}
                            onChange={(d) => field.onChange(d)}
                            placeholder="MM/DD/YYYY"
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
                          <Input
                            type="number"
                            step="0.01"
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
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isSubmitting}
              >
                {t("receipt.review.uploadDifferentReceipt")}
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {t("receipt.review.recordTransaction")}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
