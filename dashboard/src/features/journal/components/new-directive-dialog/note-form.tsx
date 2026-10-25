import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { Textarea } from "@/common/components/ui/textarea";
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
  BulkEntriesDocument,
  LedgerEntryType,
  type BulkEntriesMutationVariables,
  type LedgerNoteInput,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

import { DatePicker } from "@/common/components/ui/date-picker";
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";
import { AccountCombobox } from "@/common/components/ledger-comboboxes";
import { track } from "@/common/analytics";
import { AccountAvailabilityNotice } from "./account-availability-notice";
import { useAccountAvailability } from "./use-account-availability";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";

interface NoteFormProps {
  ledgerId: string;
  onSuccess?: () => void;
  /** Reports a write in flight, so the dialog can hold its tabs and close. */
  onPendingChange?: (pending: boolean) => void;
}

// Zod validation schema factory. Required text is trimmed before its
// required check, so whitespace alone is refused rather than sent as "" (w4/334).
const createNoteSchema = (t: (key: string) => string) =>
  z.object({
    date: z.iso.date(),
    account: z.string().trim().min(1, t("journal.accountRequired")),
    content: z.string().trim().min(1, t("journal.noteContentRequired")),
  });

/**
 * Form component for creating note entries
 * Fields: date, account, note content
 */
export function NoteForm({
  ledgerId,
  onSuccess,
  onPendingChange,
}: NoteFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addNote] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const noteSchema = createNoteSchema(t);
  type NoteFormData = z.infer<typeof noteSchema>;

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      date: todayIsoDate(),
      account: "",
      content: "",
    },
    mode: "onChange",
  });

  const accounts = useAccountAvailability(ledgerId);
  const day = form.watch("date") || null;
  const account = form.watch("account");

  const onSubmit = async (data: NoteFormData) => {
    setError(null);

    try {
      if (accounts.blocks([data.account], data.date)) return;

      // Create note input
      const noteInput: LedgerNoteInput = {
        date: data.date,
        account: data.account,
        content: data.content,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [
          ...accounts.openEntries([data.account], data.date),
          { type: LedgerEntryType.Note, note: noteInput },
        ],
      };

      const result = await addNote({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: todayIsoDate(),
          account: "",
          content: "",
        });
        accounts.reset();
        track("directive_added", { directive_type: "note" });
        onSuccess?.();
        return true;
      } else {
        // Payload message is intentional server feedback — safe to show.
        setError(
          result.data?.bulkEntries.message || t("journal.failedToCreateNote"),
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
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">
                  {t("journal.noteContent")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("journal.noteContent")}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                !form.formState.isValid || accounts.blocks([account], day)
              }
              loading={pending}
            >
              {t("journal.createNoteEntry")}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
