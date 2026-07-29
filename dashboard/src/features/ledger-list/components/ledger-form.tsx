import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Switch } from "@/common/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/common/components/ui/form";
import { AlertTriangle, BookOpen, Files } from "lucide-react";
import {
  LedgerTemplate,
  type CreateLedgerMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useMemo, useEffect } from "react";
import { LimitIndicator } from "@/common/components/limit-indicator";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { useQuery } from "@apollo/client/react";
import { ListLedgersDocument } from "@/graphql/definitions";

/**
 * Slugify a ledger name to match GitHub-style repository naming.
 * This mirrors the backend slugify logic in beancount-ledger/app/api/ledger.py
 */
function slugifyLedgerName(text: string): string {
  // Convert to lowercase
  let result = text.toLowerCase();
  // Replace spaces with hyphens
  result = result.replace(/ /g, "-");
  // Remove all characters except alphanumeric, underscore, and hyphen
  result = result.replace(/[^a-z0-9_-]/g, "");
  // Collapse consecutive hyphens to single hyphen
  result = result.replace(/-+/g, "-");
  // Remove leading/trailing hyphens
  return result.replace(/^-+|-+$/g, "");
}

/**
 * Generate a default ledger name that doesn't conflict with existing ledgers.
 * Starts with "my-book" and increments to "my-book-1", "my-book-2", etc. if needed.
 */
function generateDefaultLedgerName(existingNames: string[]): string {
  const baseName = "my-book";

  // Check if base name is available
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  // Find the next available number
  let counter = 1;
  while (existingNames.includes(`${baseName}-${counter}`)) {
    counter++;
  }

  return `${baseName}-${counter}`;
}

const createLedgerFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, t("page.dashboard.nameRequired"))
      .max(100, t("page.dashboard.nameMaxLength"))
      .refine(
        (val) => {
          // Allow spaces and common characters for UX, but validate the slugified result
          const slugified = slugifyLedgerName(val);
          return slugified.length > 0;
        },
        {
          message: t("page.dashboard.nameInvalid"),
        },
      ),
    description: z.string().optional(),
    private: z.boolean().optional(),
    template: z.enum([LedgerTemplate.Starter, LedgerTemplate.Sample]),
  });

interface LedgerFormProps {
  initialData?: Partial<CreateLedgerMutationVariables>;
  onSubmit: (data: CreateLedgerMutationVariables) => void | Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  hideLimitIndicator?: boolean;
}

/**
 * Ledger form component for creating and editing ledgers
 * Uses react-hook-form with zod validation
 */
export function LedgerForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
  hideLimitIndicator = false,
}: LedgerFormProps) {
  const { t } = useTranslations();
  const { limits, isAtLedgerLimit } = useUserLimits();

  const ledgerFormSchema = useMemo(() => createLedgerFormSchema(t), [t]);
  type LedgerFormData = z.infer<typeof ledgerFormSchema>;

  const isCreate = !initialData;

  // Fetch existing ledgers to generate default name (only for create mode)
  const { data: ledgersData } = useQuery(ListLedgersDocument, {
    skip: !isCreate, // Only fetch when creating a new ledger
  });

  const form = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      private: initialData?.private ?? true,
      template: initialData?.template ?? LedgerTemplate.Starter,
    },
  });

  // Populate default ledger name when creating a new ledger
  useEffect(() => {
    if (isCreate && ledgersData?.listLedgers) {
      const currentName = form.getValues("name");
      // Only set default if field is empty (user hasn't entered anything yet)
      if (!currentName || currentName === "") {
        const existingNames = ledgersData.listLedgers.map(
          (ledger: { name: string }) => ledger.name,
        );
        const defaultName = generateDefaultLedgerName(existingNames);
        form.setValue("name", defaultName);
      }
    }
  }, [isCreate, ledgersData, form]);

  // Watch fields for dynamic UI updates
  const isPrivate = form.watch("private");
  const ledgerName = form.watch("name");

  // Calculate slugified name for preview
  const slugifiedName = useMemo(() => {
    if (!ledgerName || ledgerName.trim() === "") {
      return "";
    }
    return slugifyLedgerName(ledgerName);
  }, [ledgerName]);

  // Show preview if the slugified name differs from input
  const showSlugPreview = useMemo(() => {
    return ledgerName && slugifiedName && ledgerName !== slugifiedName;
  }, [ledgerName, slugifiedName]);

  const handleSubmit = async (data: LedgerFormData) => {
    // Slugify the name before sending to API to match backend validation
    const slugified = slugifyLedgerName(data.name);

    const submitData: CreateLedgerMutationVariables = {
      name: slugified,
      description: data.description || undefined,
      private: data.private,
      ...(isCreate && data.template !== LedgerTemplate.Starter
        ? { template: data.template }
        : {}),
    };
    await onSubmit(submitData);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {limits && isCreate && !hideLimitIndicator ? (
            <LimitIndicator
              used={limits.ledgersUsed}
              max={limits.ledgersMax}
              limitType="ledgers"
              variant="alert"
            />
          ) : null}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  {t("page.dashboard.ledgerName")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("page.dashboard.enterLedgerName")}
                    {...field}
                    disabled={isLoading}
                    className="transition-colors duration-200"
                    data-testid="ledger-name-input"
                  />
                </FormControl>
                {showSlugPreview && (
                  <FormDescription className="text-muted-foreground text-sm">
                    {t("page.dashboard.repositoryName")}:{" "}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {slugifiedName}
                    </code>
                  </FormDescription>
                )}
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          {isCreate ? (
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">
                    {t("page.dashboard.ledgerTemplate")}
                  </FormLabel>
                  <FormControl>
                    <div
                      className="grid gap-3 sm:grid-cols-2"
                      role="radiogroup"
                      aria-label={t("page.dashboard.ledgerTemplate")}
                    >
                      {[
                        {
                          value: LedgerTemplate.Starter,
                          title: t("page.dashboard.starterTemplate"),
                          description: t(
                            "page.dashboard.starterTemplateDescription",
                          ),
                          Icon: BookOpen,
                        },
                        {
                          value: LedgerTemplate.Sample,
                          title: t("page.dashboard.sampleTemplate"),
                          description: t(
                            "page.dashboard.sampleTemplateDescription",
                          ),
                          Icon: Files,
                        },
                      ].map(({ value, title, description, Icon }) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                            field.value === value
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-input hover:bg-muted/50"
                          } ${isLoading ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={value}
                            checked={field.value === value}
                            onBlur={field.onBlur}
                            onChange={() => field.onChange(value)}
                            disabled={isLoading}
                            className="sr-only"
                          />
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="space-y-1">
                            <span className="block text-sm font-medium text-foreground">
                              {title}
                            </span>
                            <span className="block text-xs leading-relaxed text-muted-foreground">
                              {description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  {t("page.dashboard.descriptionOptional")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("page.dashboard.enterDescription")}
                    {...field}
                    disabled={isLoading}
                    className="transition-colors duration-200"
                  />
                </FormControl>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="private"
            render={({ field }) => (
              <FormItem>
                <div
                  className={`flex flex-row items-center justify-between rounded-lg border p-3 transition-colors ${
                    !isPrivate
                      ? "border-destructive bg-destructive/5"
                      : "border-input"
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <FormLabel
                      className={`text-base ${!isPrivate ? "text-destructive" : ""}`}
                    >
                      {isPrivate
                        ? t("page.dashboard.private")
                        : t("page.dashboard.public")}
                    </FormLabel>
                    <div
                      className={`text-sm flex items-center gap-1.5 ${
                        !isPrivate
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {!isPrivate && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        {isPrivate
                          ? t("page.dashboard.privateAccess")
                          : t("page.dashboard.publicWarning")}
                      </span>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="transition-colors duration-200"
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || (isCreate && isAtLedgerLimit)}
              className="transition-colors duration-200"
              title={
                isAtLedgerLimit
                  ? t("page.dashboard.ledgerLimitReached")
                  : undefined
              }
              data-testid="ledger-form-submit"
            >
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
