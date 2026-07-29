import { useState, useMemo } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@apollo/client/react";
import { format } from "date-fns";
import {
  BulkEntriesDocument,
  LedgerEntryType,
  GetLedgerDocument,
} from "@/graphql/definitions";
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

function buildOpenAccountSchema(
  prefixes: string[],
  messages: { required: string; mustStartWith: string },
) {
  return z.object({
    date: z.date(),
    account: z
      .string()
      .min(1, messages.required)
      .refine(
        (val) => prefixes.some((p) => val.startsWith(p + ":")),
        messages.mustStartWith,
      ),
  });
}

type OpenAccountFormData = {
  date: Date;
  account: string;
};

interface OpenAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  onSuccess?: () => void;
}

export function OpenAccountDialog({
  open,
  onOpenChange,
  ledgerId,
  onSuccess,
}: OpenAccountDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addEntryOpen] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const { data: ledgerData } = useQuery(GetLedgerDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  const accountPrefixes = useMemo(() => {
    const opts = ledgerData?.getLedger?.options;
    if (!opts) return [];
    return [
      opts.nameAssets,
      opts.nameLiabilities,
      opts.nameEquity,
      opts.nameIncome,
      opts.nameExpenses,
    ].filter(Boolean);
  }, [ledgerData]);

  const schema = useMemo(
    () =>
      buildOpenAccountSchema(accountPrefixes, {
        required: t("page.accounts.accountNameRequired"),
        mustStartWith: t("page.accounts.accountMustStartWith", {
          prefixes: accountPrefixes.join(", "),
        }),
      }),
    [accountPrefixes, t],
  );

  const form = useForm<OpenAccountFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date(),
      account: "",
    },
    mode: "onChange",
  });

  const resetForm = () => {
    form.reset({ date: new Date(), account: "" });
    setError(null);
  };

  const onSubmit = async (data: OpenAccountFormData) => {
    setError(null);
    try {
      const result = await addEntryOpen({
        variables: {
          ledgerId,
          entries: [
            {
              type: LedgerEntryType.Open,
              open: {
                date: format(data.date, "yyyy-MM-dd"),
                account: data.account,
                currencies: [],
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
        setError(result.data?.bulkEntries.message ?? formatError(undefined));
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
          <DialogTitle>{t("page.accounts.openAccount")}</DialogTitle>
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
                  <FormLabel>{t("page.accounts.openDate")}</FormLabel>
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
                loading={form.formState.isSubmitting}
              >
                {t("page.accounts.openAccount")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
