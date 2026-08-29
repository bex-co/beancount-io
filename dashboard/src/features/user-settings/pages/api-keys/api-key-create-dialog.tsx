import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
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
import { Label } from "@/common/components/ui/label";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { ApiKeysDocument, CreateApiKeyDocument } from "@/graphql/definitions";
import {
  API_KEY_SCOPES,
  type ApiKeyScope,
  expirationDateToIso,
  isValidLedgerScope,
} from "./api-key-utils";

interface ApiKeyCreateDialogProps {
  children: React.ReactNode;
}

interface ApiKeyFormData {
  name: string;
  scopes: ApiKeyScope[];
  ledgerScope: string;
  expiresOn: string;
}

const defaultValues: ApiKeyFormData = {
  name: "",
  scopes: ["ledger.read"],
  ledgerScope: "",
  expiresOn: "",
};

const scopeDescriptionKeys: Record<
  ApiKeyScope,
  | "userSettings.apiKeyReadScopeDescription"
  | "userSettings.apiKeyWriteScopeDescription"
  | "userSettings.apiKeyAdminScopeDescription"
> = {
  "ledger.read": "userSettings.apiKeyReadScopeDescription",
  "ledger.write": "userSettings.apiKeyWriteScopeDescription",
  "ledger.admin": "userSettings.apiKeyAdminScopeDescription",
};

export function ApiKeyCreateDialog({ children }: ApiKeyCreateDialogProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createApiKey, { loading, reset }] = useMutation(CreateApiKeyDocument, {
    fetchPolicy: "no-cache",
  });

  const formSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t("userSettings.apiKeyNameRequired"))
          .max(100, t("userSettings.apiKeyNameTooLong")),
        scopes: z
          .array(z.enum(API_KEY_SCOPES))
          .min(1, t("userSettings.apiKeyScopeRequired")),
        ledgerScope: z
          .string()
          .trim()
          .refine(
            (value) => !value || isValidLedgerScope(value),
            t("userSettings.apiKeyLedgerScopeInvalid"),
          ),
        expiresOn: z
          .string()
          .refine(
            (value) =>
              !value ||
              new Date(`${value}T23:59:59.999Z`).getTime() > Date.now(),
            t("userSettings.apiKeyExpirationFuture"),
          ),
      }),
    [t],
  );

  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const resetDialog = () => {
    form.reset(defaultValues);
    setPlaintext(null);
    setCopied(false);
    setErrorMessage(null);
    reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && loading) return;
    if (!nextOpen) resetDialog();
    setOpen(nextOpen);
  };

  const handleCreate = async (data: ApiKeyFormData) => {
    try {
      setErrorMessage(null);
      const result = await createApiKey({
        variables: {
          input: {
            name: data.name,
            scopes: data.scopes,
            ledgerScope: data.ledgerScope || undefined,
            expiresAt: expirationDateToIso(data.expiresOn),
          },
        },
        refetchQueries: [ApiKeysDocument],
      });
      const secret = result.data?.createApiKey.plaintext;
      if (!secret) throw new Error(t("userSettings.apiKeySecretMissing"));
      setPlaintext(secret);
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  };

  const handleCopy = async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      toast.success(t("common.copied"));
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl" showCloseButton={!loading}>
        {plaintext ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                {t("userSettings.apiKeyCreated")}
              </DialogTitle>
              <DialogDescription>
                {t("userSettings.apiKeyCreatedDescription")}
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("userSettings.apiKeyCopyNow")}</AlertTitle>
              <AlertDescription>
                {t("userSettings.apiKeySecretWarning")}
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="new-personal-access-token">
                {t("userSettings.personalAccessToken")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-personal-access-token"
                  value={plaintext}
                  readOnly
                  className="font-mono"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? t("common.copied") : t("common.copy")}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {t("userSettings.apiKeyDone")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCreate)}
              className="space-y-5"
            >
              <DialogHeader>
                <DialogTitle>
                  {t("userSettings.createPersonalAccessToken")}
                </DialogTitle>
                <DialogDescription>
                  {t("userSettings.createPersonalAccessTokenDescription")}
                </DialogDescription>
              </DialogHeader>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {t("userSettings.apiKeyCreateFailed")}
                  </AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userSettings.apiKeyName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("userSettings.apiKeyNamePlaceholder")}
                        maxLength={100}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("userSettings.apiKeyNameDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium">
                        {t("userSettings.apiKeyScopes")}
                      </legend>
                      <FormDescription>
                        {t("userSettings.apiKeyScopesDescription")}
                      </FormDescription>
                      {API_KEY_SCOPES.map((scope) => (
                        <div key={scope} className="flex items-start gap-3">
                          <Checkbox
                            id={`scope-${scope}`}
                            checked={field.value.includes(scope)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, scope]
                                  : field.value.filter(
                                      (candidate) => candidate !== scope,
                                    ),
                              )
                            }
                          />
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`scope-${scope}`}
                              className="font-mono"
                            >
                              {scope}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t(scopeDescriptionKeys[scope])}
                            </p>
                          </div>
                        </div>
                      ))}
                      <FormMessage />
                    </fieldset>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ledgerScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userSettings.apiKeyLedgerScope")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          "userSettings.apiKeyLedgerScopePlaceholder",
                        )}
                        autoCapitalize="none"
                        autoCorrect="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("userSettings.apiKeyLedgerScopeDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userSettings.apiKeyExpiration")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("userSettings.apiKeyExpirationDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {t("userSettings.apiKeyPaidFeature")}
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {loading
                    ? t("userSettings.apiKeyCreating")
                    : t("userSettings.apiKeyCreate")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
