import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { BulkEntriesDocument, LedgerEntryType } from "@/graphql/definitions";
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
import { useTranslations } from "@/common/hooks/use-translations";
import { track } from "@/common/analytics";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useOpenAccountSchema } from "@/common/hooks/use-open-account-schema";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";

interface OpenAccountFormProps {
  ledgerId: string;
  onSuccess?: () => void;
  /** Reports a write in flight, so the dialog can hold its tabs and close. */
  onPendingChange?: (pending: boolean) => void;
}

export function OpenAccountForm({
  ledgerId,
  onSuccess,
  onPendingChange,
}: OpenAccountFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addEntryOpen] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const { accountPrefixes, schema } = useOpenAccountSchema(ledgerId);

  type FormData = {
    date: string;
    account: string;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayIsoDate(), account: "" },
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
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
        form.reset({ date: todayIsoDate(), account: "" });
        track("directive_added", { directive_type: "open" });
        onSuccess?.();
        return true;
      } else {
        // Payload message is intentional server feedback — safe to show.
        setError(
          result.data?.bulkEntries.message ?? t("common.errors.generic"),
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
                      onChange={(d) => field.onChange(d)}
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
                    <Input
                      placeholder={
                        accountPrefixes.length > 0
                          ? `${accountPrefixes[0]}:Bank:Checking`
                          : "Account:SubAccount"
                      }
                      {...field}
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
              loading={pending}
            >
              {t("journal.createAccountEntry")}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
