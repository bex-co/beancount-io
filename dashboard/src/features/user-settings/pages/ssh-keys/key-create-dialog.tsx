import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { Button } from "@/common/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { Plus, AlertCircle } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import {
  CreatePublicKeyDocument,
  ListPublicKeysDocument,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { usePendingSubmit } from "@/common/hooks/use-pending-submit";
import { useDiscardDraftGuard } from "@/common/components/discard-draft-guard";

type KeyCreateFormData = {
  title: string;
  key: string;
  read_only?: boolean;
};

interface KeyCreateDialogProps {
  children?: React.ReactNode;
}

/**
 * Dialog component for creating new API keys
 */
export function KeyCreateDialog({ children }: KeyCreateDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createKeyMutation] = useMutation(CreatePublicKeyDocument, {
    refetchQueries: [ListPublicKeysDocument],
  });

  /**
   * Form validation schema for key creation with translations
   */
  const keyCreateSchema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .min(1, t("userSettings.titleRequired"))
          .max(100, t("userSettings.titleMaxLength")),
        key: z.string().min(1, t("userSettings.publicKeyRequired")),
        read_only: z.boolean().optional(),
      }),
    [t],
  );

  const form = useForm<KeyCreateFormData>({
    resolver: zodResolver(keyCreateSchema),
    defaultValues: {
      title: "",
      key: "",
      read_only: false,
    },
  });

  const onSubmit = async (data: KeyCreateFormData) => {
    try {
      setErrorMessage(null);
      await createKeyMutation({
        variables: {
          title: data.title,
          key: data.key,
          readOnly: data.read_only || false,
        },
      });
      form.reset();
      setOpen(false);
      return true;
    } catch (error) {
      console.error("Failed to create key:", error);
      setErrorMessage(formatError(error));
    }
  };

  // While the key is being added its draft stays in front: fields are
  // locked, and neither Cancel, Escape nor the close button can dismiss it
  // (w2/134).
  const { submit, pending } = usePendingSubmit(form, onSubmit);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setErrorMessage(null);
    }
    setOpen(newOpen);
  };

  // Cancel, Close, Escape and an outside click ask before discarding a typed
  // title or pasted key (w2/134); an untouched draft closes at once.
  // Read during render: react-hook-form tracks only what a render reads.
  const { requestLeave, confirmation } = useDiscardDraftGuard(
    form.formState.isDirty,
  );
  const dismiss = () => handleOpenChange(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) =>
        next ? handleOpenChange(true) : requestLeave(dismiss)
      }
    >
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("userSettings.addNewKey")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent busy={pending} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("userSettings.createNewApiKey")}</DialogTitle>
          <DialogDescription>
            {t("userSettings.createNewApiKeyDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit}>
            <fieldset disabled={pending} className="min-w-0 space-y-6">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("userSettings.errorCreatingKey")}</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userSettings.keyTitle")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("userSettings.keyTitlePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("userSettings.keyTitleDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userSettings.publicKey")}</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={t("userSettings.publicKeyPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("userSettings.publicKeyDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestLeave(dismiss)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit">
                  {pending
                    ? t("userSettings.creating")
                    : t("userSettings.createKey")}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
        {confirmation}
      </DialogContent>
    </Dialog>
  );
}
