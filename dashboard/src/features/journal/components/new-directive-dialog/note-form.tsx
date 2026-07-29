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
  FormMessage,
} from "@/common/components/ui/form";
import { format } from "date-fns";

import {
  BulkEntriesDocument,
  LedgerEntryType,
  type BulkEntriesMutationVariables,
  type LedgerNoteInput,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

import { DatePicker } from "@/common/components/ui/date-picker";
import { AccountCombobox } from "@/common/components/ledger-comboboxes";
import { track } from "@/common/analytics";

interface NoteFormProps {
  ledgerId: string;
  onSuccess?: () => void;
}

// Zod validation schema factory
const createNoteSchema = (t: (key: string) => string) =>
  z.object({
    date: z.date(),
    account: z.string().min(1, t("journal.accountRequired")).trim(),
    content: z.string().min(1, t("journal.noteContentRequired")).trim(),
  });

/**
 * Form component for creating note entries
 * Fields: date, account, note content
 */
export function NoteForm({ ledgerId, onSuccess }: NoteFormProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [addNote] = useMutation(BulkEntriesDocument);
  const [error, setError] = useState<string | null>(null);

  const noteSchema = createNoteSchema(t);
  type NoteFormData = z.infer<typeof noteSchema>;

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      date: new Date(),
      account: "",
      content: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: NoteFormData) => {
    setError(null);

    try {
      // Create note input
      const noteInput: LedgerNoteInput = {
        date: format(data.date, "yyyy-MM-dd"),
        account: data.account,
        content: data.content,
      };

      const variables: BulkEntriesMutationVariables = {
        ledgerId,
        entries: [{ type: LedgerEntryType.Note, note: noteInput }],
      };

      const result = await addNote({ variables });

      if (result.data?.bulkEntries.success) {
        // Reset form
        form.reset({
          date: new Date(),
          account: "",
          content: "",
        });
        track("directive_added", { directive_type: "note" });
        onSuccess?.();
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
                    placeholder={t("journal.selectNoteDate")}
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
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  id="content"
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
            disabled={!form.formState.isValid}
            loading={form.formState.isSubmitting}
          >
            {t("journal.createNoteEntry")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
