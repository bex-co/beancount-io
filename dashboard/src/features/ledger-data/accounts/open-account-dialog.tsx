import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { BulkEntriesDocument, LedgerEntryType } from "@/graphql/definitions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
import { DatePicker } from "@/common/components/ui/date-picker";
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";
import { useOpenAccountSchema } from "@/common/hooks/use-open-account-schema";
import { useWriteOutcome } from "@/common/hooks/use-write-outcome";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";

type OpenAccountFormData = {
  date: string;
  account: string;
};

interface OpenAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  onSuccess?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function OpenAccountDialog({
  open,
  onOpenChange,
  ledgerId,
  onSuccess,
  returnFocusRef,
}: OpenAccountDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addEntryOpen] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const { accountPrefixes, schema } = useOpenAccountSchema(ledgerId);
  const writeOutcome = useWriteOutcome(ledgerId);

  const form = useForm<OpenAccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayIsoDate(),
      account: "",
    },
    mode: "onChange",
  });

  const resetForm = () => {
    form.reset({ date: todayIsoDate(), account: "" });
    setError(null);
  };

  // Each opening is its own draft. A write settles for the opening it was
  // submitted from, so a late success cannot reset or close a later draft
  // (w4/284).
  const opening = useRef(0);
  // The closed dialog stays mounted, so a reset on closing may date from an
  // earlier day: opening resets too, and a new draft starts on the day it
  // opens (w4/986).
  useEffect(() => {
    if (!open) opening.current += 1;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: OpenAccountFormData) => {
    setError(null);
    const submittedFrom = opening.current;
    const before = writeOutcome.snapshot();
    try {
      const result = await addEntryOpen({
        variables: {
          ledgerId,
          entries: [
            {
              type: LedgerEntryType.Open,
              open: {
                date: data.date,
                account: data.account,
                currencies: [],
              },
            },
          ],
        },
      });

      if (result.data?.bulkEntries.success) {
        onSuccess?.();
        if (opening.current === submittedFrom) onOpenChange(false);
        void writeOutcome.report(before);
        return true;
      } else {
        setError(result.data?.bulkEntries.message ?? formatError(undefined));
      }
    } catch (err) {
      setError(formatError(err));
    }
  };

  // While the write is in flight its draft stays in front: fields are locked,
  // and neither Cancel, Escape nor the close button can dismiss it.
  const { submit, pending } = usePendingSubmit(form, onSubmit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        busy={pending}
        className="sm:max-w-[480px]"
        onCloseAutoFocus={(event) => {
          restoreFocusOnDialogClose(event, returnFocusRef?.current);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("page.accounts.openAccount")}</DialogTitle>
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
                    <FormLabel>{t("page.accounts.openDate")}</FormLabel>
                    <FormControl>
                      <DatePicker
                        disabled={pending}
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
                    <FormLabel>{t("page.accounts.accountName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          accountPrefixes.length > 0
                            ? `${accountPrefixes[0]}:Bank:Checking`
                            : t("page.accounts.accountSubAccountPlaceholder")
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!form.formState.isValid}
                  loading={pending}
                >
                  {t("page.accounts.openAccount")}
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
