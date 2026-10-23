import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "@/common/hooks/use-translations";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { useApolloClient, useMutation } from "@apollo/client/react";
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
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { ExactAmountInput } from "@/common/components/exact-amount-input";
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
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";

const createBudgetSchema = (t: (key: string) => string) =>
  z.object({
    date: z.iso.date(),
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
  /** Optional registered opener (single-button callers). */
  trigger?: ReactNode;
  /** Explicit opener when multiple controls share this dialog. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Used when the original opener unmounts after a successful create. */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
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
  trigger,
  returnFocusRef,
  fallbackFocusRef,
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
  const client = useApolloClient();
  const [addEntryBudget] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayIsoDate(),
      account: lockedAccount ?? "",
      interval: lockedInterval ?? defaultInterval ?? BudgetInterval.Monthly,
      number: "",
      currency: defaultCurrency,
    },
    mode: "onChange",
  });

  const resetForm = () => {
    form.reset({
      date: todayIsoDate(),
      account: lockedAccount ?? "",
      interval: lockedInterval ?? defaultInterval ?? BudgetInterval.Monthly,
      number: "",
      currency: defaultCurrency,
    });
    setError(null);
  };

  // Each opening is its own draft. A write settles for the opening it was
  // submitted from, so a late success cannot reset or close a later draft
  // (w4/295).
  const opening = useRef(0);
  // The closed dialog stays mounted, so a reset on closing may date from an
  // earlier day: opening resets too, and a new draft starts on the day it
  // opens (w4/986).
  useEffect(() => {
    if (!open) opening.current += 1;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    const submittedFrom = opening.current;
    try {
      const result = await addEntryBudget({
        variables: {
          ledgerId,
          entries: [
            {
              type: LedgerEntryType.Budget,
              budget: {
                date: data.date,
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
        onSuccess?.();
        if (opening.current === submittedFrom) onOpenChange(false);
        // The budget is saved; reading the list again is a separate step.
        // Awaited inside the mutation, a failed read reported the saved
        // budget as failed and offered the same write again (w4/m41). A
        // failed refresh now shows on the Budget page's own query, with its
        // Retry.
        void client
          .refetchQueries({ include: [GetLedgerJournalDocument] })
          .catch(() => undefined);
        return true;
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

  // While the write is in flight its draft stays in front: fields are locked,
  // and neither Cancel, Escape nor the close button can dismiss it.
  const { submit, pending } = usePendingSubmit(form, onSubmit);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        busy={pending}
        className="sm:max-w-[480px]"
        onCloseAutoFocus={(event) => {
          restoreFocusOnDialogClose(
            event,
            returnFocusRef?.current,
            fallbackFocusRef?.current,
          );
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("page.budget.budgetAddBudget")}</DialogTitle>
          <DialogDescription>
            {t("page.budget.budgetDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit}>
            <fieldset disabled={pending} className="min-w-0 space-y-4 pt-2">
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
                        onChange={(d) => field.onChange(d)}
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
                          placeholder={t(
                            "page.budget.budgetAccountPlaceholder",
                          )}
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
                        {/* Shortest to longest, as in the page's interval
                          filter; the generated enum is alphabetical. */}
                        {(Object.keys(intervalLabels) as BudgetInterval[]).map(
                          (interval) => (
                            <SelectItem key={interval} value={interval}>
                              {intervalLabels[interval]}
                            </SelectItem>
                          ),
                        )}
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
                        <ExactAmountInput placeholder="500" {...field} />
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
                  loading={pending}
                >
                  {t("page.budget.budgetAddBudget")}
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
