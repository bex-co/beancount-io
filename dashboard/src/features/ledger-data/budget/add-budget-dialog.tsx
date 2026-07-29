import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useMutation } from "@apollo/client/react";
import { format } from "date-fns";
import {
  BulkEntriesDocument,
  BudgetInterval,
  LedgerEntryType,
  GetLedgerJournalDocument,
} from "@/graphql/definitions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  AccountCombobox,
  CurrencyCombobox,
} from "@/common/components/ledger-comboboxes";
import { DatePicker } from "@/common/components/ui/date-picker";

const createBudgetSchema = (t: (key: string) => string) =>
  z.object({
    date: z.date(),
    account: z.string().min(1, t("page.budget.budgetAccountRequired")),
    interval: z.nativeEnum(BudgetInterval),
    number: z.string().min(1, t("page.budget.budgetAmountRequired")),
    currency: z.string().min(1, t("page.budget.budgetCurrencyRequired")),
  });

type FormData = z.infer<ReturnType<typeof createBudgetSchema>>;

interface AddBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  onSuccess?: () => void;
  lockedAccount?: string;
  lockedInterval?: BudgetInterval;
  defaultInterval?: BudgetInterval;
  defaultCurrency?: string;
}

export function AddBudgetDialog({
  open,
  onOpenChange,
  ledgerId,
  onSuccess,
  lockedAccount,
  lockedInterval,
  defaultInterval,
  defaultCurrency = "USD",
}: AddBudgetDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const schema = useMemo(() => createBudgetSchema(t), [t]);
  const intervalLabels: Record<BudgetInterval, string> = useMemo(
    () => ({
      [BudgetInterval.Daily]: t("page.budget.budgetIntervalDaily"),
      [BudgetInterval.Weekly]: t("page.budget.budgetIntervalWeekly"),
      [BudgetInterval.Monthly]: t("page.budget.budgetIntervalMonthly"),
      [BudgetInterval.Quarterly]: t("page.budget.budgetIntervalQuarterly"),
      [BudgetInterval.Yearly]: t("page.budget.budgetIntervalYearly"),
    }),
    [t],
  );
  const [addEntryBudget] = useMutation(BulkEntriesDocument, {
    refetchQueries: [
      {
        query: GetLedgerJournalDocument,
        variables: {
          ledgerId,
          query: { directiveTypes: ["Custom"], customSubtypes: ["budget"] },
        },
      },
    ],
    awaitRefetchQueries: true,
  });
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date(),
      account: lockedAccount ?? "",
      interval: lockedInterval ?? defaultInterval ?? BudgetInterval.Monthly,
      number: "",
      currency: defaultCurrency,
    },
    mode: "onChange",
  });

  const resetForm = () => {
    form.reset({
      date: new Date(),
      account: lockedAccount ?? "",
      interval: lockedInterval ?? defaultInterval ?? BudgetInterval.Monthly,
      number: "",
      currency: defaultCurrency,
    });
    setError(null);
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const result = await addEntryBudget({
        variables: {
          ledgerId,
          entries: [
            {
              type: LedgerEntryType.Budget,
              budget: {
                date: format(data.date, "yyyy-MM-dd"),
                account: data.account,
                interval: data.interval,
                amount: {
                  number: data.number,
                  currency: data.currency,
                },
              },
            },
          ],
        },
      });

      if (result.data?.bulkEntries.success) {
        resetForm();
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError(
          result.data?.bulkEntries.message ??
            t("page.budget.budgetFailedToAdd"),
        );
      }
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("page.budget.budgetAddBudget")}</DialogTitle>
          <DialogDescription>
            {t("page.budget.budgetDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.budget.budgetDate")}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(d) => d && field.onChange(d)}
                      className="[&>div]:w-full"
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
                <FormItem>
                  <FormLabel>{t("page.accounts.account")}</FormLabel>
                  <FormControl>
                    {lockedAccount ? (
                      <Input value={field.value} disabled />
                    ) : (
                      <AccountCombobox
                        ledgerId={ledgerId}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("page.budget.budgetAccountPlaceholder")}
                      />
                    )}
                  </FormControl>
                  <FormDescription>
                    {t("page.budget.budgetAccountHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("page.budget.budgetInterval")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!lockedInterval}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("page.budget.budgetSelectInterval")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(BudgetInterval).map((interval) => (
                        <SelectItem key={interval} value={interval}>
                          {intervalLabels[interval]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t("page.budget.budgetAmount")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500"
                        step="0.01"
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
                  <FormItem className="w-36">
                    <FormLabel>{t("page.budget.budgetCurrency")}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                        ledgerId={ledgerId}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="USD"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid}
                loading={form.formState.isSubmitting}
              >
                {t("page.budget.budgetAddBudget")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
