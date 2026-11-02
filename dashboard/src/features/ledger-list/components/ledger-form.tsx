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
import { AlertTriangle, BookOpen, Files, Layers } from "lucide-react";
import {
  LedgerOpeningState,
  LedgerTemplate,
  PreviewLedgerSetupDocument,
  UpdateDefaultCurrencyDocument,
  type CreateLedgerMutationVariables,
  type LedgerSetupInput,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useMemo, useEffect, useRef, useState } from "react";
import { LimitIndicator } from "@/common/components/limit-indicator";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { ListLedgersDocument } from "@/graphql/definitions";
import { slugifyLedgerName } from "@/common/lib/beancount/ledger-name";
import { SETUP_PRESETS } from "../lib/setup-presets";
import {
  browserCurrencyInputs,
  currencyToSave,
  suggestCurrency,
} from "../lib/currency-suggestion";
import { CurrencySuggestionHint } from "./currency-suggestion-hint";
import { cn } from "@/common/lib/utils/utils";
import { todayIsoDate } from "@/common/components/ui/date-picker-utils";

/**
 * A radio choice drawn as a card around its sr-only input. Forced colors drops
 * the ring and maps every border alike, so the checked card claims the system
 * highlight there, and focus gets its own outline (w4/m43).
 */
function choiceCardClass(checked: boolean) {
  return cn(
    "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:checked]:forced-selected",
    "forced-colors:has-[:focus-visible]:outline-2 forced-colors:has-[:focus-visible]:outline-offset-2 forced-colors:has-[:focus-visible]:outline-[CanvasText]",
    checked
      ? "border-primary bg-primary/5 ring-1 ring-primary"
      : "border-input hover:bg-muted/50",
  );
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
    currency: z.string().optional(),
    historyStart: z.string().optional(),
    openingAccount: z.string().optional(),
    openingAmount: z
      .string()
      .optional()
      .refine((val) => !val || /^-?\d+(\.\d+)?$/.test(val), {
        message: t("page.dashboard.setupAmountInvalid"),
      }),
  });

interface LedgerFormProps {
  initialData?: Partial<CreateLedgerMutationVariables>;
  /**
   * Resolves `true` once the ledger is created. Only then is the creation
   * draft (its choices and requestId) cleared: a failed create keeps it for
   * the retry, and an edit never touches it (w4/320).
   */
  onSubmit: (
    data: CreateLedgerMutationVariables,
  ) => boolean | void | Promise<boolean | void>;
  isLoading?: boolean;
  onCancel?: () => void;
  hideLimitIndicator?: boolean;
}

type StartKind = "starter" | "sample" | "preset";

const DRAFT_KEY = "ledger-create-draft";

interface CreateDraft {
  step: number;
  /** The customer chose the currency in this flow: never re-suggest it. */
  currencyChosen?: boolean;
  startKind: StartKind;
  presetId: string | null;
  requestId: string;
  values: Record<string, unknown>;
}

function readDraft(): CreateDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as CreateDraft) : null;
  } catch {
    return null;
  }
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Ledger form component for creating and editing ledgers.
 *
 * Creation is a staged flow (ADR021): choose how to start, fill in details
 * with a usable default at every step, then review exactly what the server
 * will create before confirming. A defaults-only user answers nothing: the
 * name, currency, and date arrive prefilled. The draft and the creation
 * requestId persist in session storage, so leaving and returning — or a
 * failed attempt — resumes instead of duplicating the ledger. Editing an
 * existing ledger keeps the single-step form it has always had.
 */
export function LedgerForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
  hideLimitIndicator = false,
}: LedgerFormProps) {
  const { t } = useTranslations();
  const { limits, tier, isAtLedgerLimit, defaultCurrency } = useUserLimits();

  const ledgerFormSchema = useMemo(() => createLedgerFormSchema(t), [t]);
  type LedgerFormData = z.infer<typeof ledgerFormSchema>;

  const isCreate = !initialData;
  const [draft] = useState<CreateDraft | null>(() =>
    isCreate ? readDraft() : null,
  );
  const [step, setStep] = useState(draft?.step ?? 0);
  const [startKind, setStartKind] = useState<StartKind>(
    draft?.startKind ?? "starter",
  );
  const [presetId, setPresetId] = useState<string | null>(
    draft?.presetId ?? SETUP_PRESETS[0].id,
  );
  const requestIdRef = useRef(draft?.requestId ?? newRequestId());
  // ADR026: resolved once the profile is known; an explicit selection in this
  // flow (typed, a tapped candidate, or a resumed draft's) always wins.
  const suggestion = useMemo(
    () =>
      suggestCurrency({ saved: defaultCurrency, ...browserCurrencyInputs() }),
    [defaultCurrency],
  );
  const [currencyChosen, setCurrencyChosen] = useState(
    draft?.currencyChosen ?? false,
  );
  const [updateDefaultCurrency] = useMutation(UpdateDefaultCurrencyDocument);

  // Fetch existing ledgers to generate default name (only for create mode)
  const { data: ledgersData } = useQuery(ListLedgersDocument, {
    skip: !isCreate, // Only fetch when creating a new ledger
  });

  const form = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: {
      name: initialData?.name || (draft?.values?.name as string) || "",
      description:
        initialData?.description ||
        (draft?.values?.description as string) ||
        "",
      private:
        initialData?.private ?? (draft?.values?.private as boolean) ?? true,
      template: initialData?.template ?? LedgerTemplate.Starter,
      currency: (draft?.values?.currency as string) || suggestion.currency,
      // The browser's own calendar day: a UTC day opens every account
      // tomorrow in a western evening (w4/317).
      historyStart: (draft?.values?.historyStart as string) || todayIsoDate(),
      openingAccount: (draft?.values?.openingAccount as string) || "",
      openingAmount: (draft?.values?.openingAmount as string) || "",
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

  // The saved preference arrives with the profile, after the first render.
  useEffect(() => {
    if (isCreate && !currencyChosen) {
      form.setValue("currency", suggestion.currency);
    }
  }, [isCreate, currencyChosen, suggestion.currency, form]);

  // Persist the draft so abandoning and returning resumes (ADR021).
  const watchedValues = form.watch();
  useEffect(() => {
    if (!isCreate) return;
    try {
      const next: CreateDraft = {
        step,
        currencyChosen,
        startKind,
        presetId,
        requestId: requestIdRef.current,
        values: watchedValues as Record<string, unknown>,
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Session storage unavailable: the flow still works in-memory.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, step, startKind, presetId, JSON.stringify(watchedValues)]);

  // Watch fields for dynamic UI updates
  const isPrivate = form.watch("private");
  const ledgerName = form.watch("name");
  const openingAccount = form.watch("openingAccount");
  const openingAmount = form.watch("openingAmount");

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

  const preset = SETUP_PRESETS.find((entry) => entry.id === presetId);
  const moneyAccounts =
    preset?.accounts.filter((account) => account.money) ?? [];

  // An opening balance belongs to one of the preset's money accounts. A
  // preset change drops an account the new preset does not offer, with its
  // amount, so no hidden account from the earlier preset is sent (w4/316).
  const choosePreset = (id: string) => {
    setPresetId(id);
    const account = form.getValues("openingAccount");
    const offered = SETUP_PRESETS.find((entry) => entry.id === id)?.accounts;
    if (account && !offered?.some((a) => a.money && a.name === account)) {
      form.setValue("openingAccount", "");
      form.setValue("openingAmount", "");
    }
  };

  const buildSetup = (data: LedgerFormData): LedgerSetupInput | undefined => {
    if (!preset) return undefined;
    const amount = data.openingAmount?.trim();
    return {
      preset: preset.id,
      title: data.name,
      operatingCurrency: (data.currency || "USD").toUpperCase(),
      historyStart: data.historyStart || undefined,
      accounts:
        amount && data.openingAccount
          ? [
              {
                name: data.openingAccount,
                openingState: LedgerOpeningState.Known,
                amount,
              },
            ]
          : undefined,
    };
  };

  const [
    runPreview,
    { data: previewData, loading: previewLoading, error: previewError },
  ] = useLazyQuery(PreviewLedgerSetupDocument);

  useEffect(() => {
    if (isCreate && step === 2 && startKind === "preset") {
      const setup = buildSetup(form.getValues());
      if (setup) void runPreview({ variables: { setup } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, step, startKind]);

  const handleSubmit = async (data: LedgerFormData) => {
    // Slugify the name before sending to API to match backend validation
    const slugified = slugifyLedgerName(data.name);

    const submitData: CreateLedgerMutationVariables = {
      name: slugified,
      description: data.description || undefined,
      private: data.private,
      ...(isCreate && startKind === "sample"
        ? { template: LedgerTemplate.Sample }
        : {}),
      ...(isCreate && startKind === "preset"
        ? { setup: buildSetup(data) }
        : {}),
      // Every create carries the requestId, so a retry of this submission
      // (for example after an OTP round-trip) cannot duplicate the ledger.
      ...(isCreate ? { requestId: requestIdRef.current } : {}),
    };
    const created = await onSubmit(submitData);
    if (!isCreate || created !== true) return;
    if (startKind === "preset") {
      const save = currencyToSave({
        chosen: (data.currency || "USD").toUpperCase(),
        suggested: suggestion.currency,
        saved: defaultCurrency,
      });
      // A preference, not part of the ledger: a failed save changes nothing
      // the customer created.
      if (save) {
        void updateDefaultCurrency({
          variables: { defaultCurrency: save },
        }).catch(() => undefined);
      }
    }
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Nothing to clear.
    }
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger("name");
      if (!valid) return;
    }
    setStep((current) => Math.min(current + 1, 2));
  };

  const startOptions = [
    {
      value: "starter" as StartKind,
      title: t("page.dashboard.starterTemplate"),
      description: t("page.dashboard.starterTemplateDescription"),
      Icon: BookOpen,
    },
    {
      value: "preset" as StartKind,
      title: t("page.dashboard.ledgerTemplate"),
      // A first-step hint; setupReviewDescription belongs to Review (w4/321).
      description: t("page.dashboard.ledgerTemplateDescription"),
      Icon: Layers,
    },
  ];
  const demoOption = {
    value: "sample" as StartKind,
    title: t("page.dashboard.sampleTemplate"),
    description: t("page.dashboard.sampleTemplateDescription"),
    Icon: Files,
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(event) => {
            // Only Review's Create Ledger confirms a new ledger. A submit
            // from an earlier step, such as Enter in a field, advances.
            if (isCreate && step < 2) {
              event.preventDefault();
              void nextStep();
              return;
            }
            void form.handleSubmit(handleSubmit)(event);
          }}
          className="space-y-6"
        >
          {limits && isCreate && !hideLimitIndicator ? (
            <LimitIndicator
              used={limits.ledgersUsed}
              max={limits.ledgersMax}
              limitType="ledgers"
              tier={tier}
              variant="alert"
            />
          ) : null}
          {isCreate ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="ledger-create-step"
            >
              {t("page.dashboard.setupStep", { step: step + 1, total: 3 })}
            </p>
          ) : null}

          {(!isCreate || step === 0) && isCreate ? (
            <div className="space-y-4">
              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label={t("page.dashboard.ledgerTemplate")}
              >
                {startOptions.map(({ value, title, description, Icon }) => (
                  <label
                    key={value}
                    className={cn(
                      choiceCardClass(startKind === value),
                      isLoading && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      name="start-kind"
                      value={value}
                      checked={startKind === value}
                      onChange={() => setStartKind(value)}
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
              <div className="border-t border-border pt-3">
                <label
                  className={cn(
                    choiceCardClass(startKind === demoOption.value),
                    isLoading && "cursor-not-allowed opacity-60",
                  )}
                  data-testid="setup-demo-option"
                >
                  <input
                    type="radio"
                    name="start-kind"
                    value={demoOption.value}
                    checked={startKind === demoOption.value}
                    onChange={() => setStartKind(demoOption.value)}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <demoOption.Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-foreground">
                      {demoOption.title}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {demoOption.description}
                    </span>
                  </span>
                </label>
              </div>
              {startKind === "preset" ? (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label={t("page.dashboard.ledgerTemplate")}
                  data-testid="setup-preset-grid"
                >
                  {SETUP_PRESETS.map((entry) => (
                    <label
                      key={entry.id}
                      className={choiceCardClass(presetId === entry.id)}
                    >
                      <input
                        type="radio"
                        name="setup-preset"
                        value={entry.id}
                        checked={presetId === entry.id}
                        onChange={() => choosePreset(entry.id)}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-foreground">
                          {t(entry.titleKey)}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">
                          {t(entry.outcomeKey)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {(!isCreate || step === 1) && (
            <div className="space-y-6">
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

              {isCreate && startKind === "preset" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">
                          {t("page.dashboard.setupCurrency")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(event) => {
                              setCurrencyChosen(true);
                              field.onChange(event);
                            }}
                            disabled={isLoading}
                            maxLength={3}
                            className="uppercase"
                            data-testid="ledger-currency-input"
                          />
                        </FormControl>
                        <CurrencySuggestionHint
                          suggestion={suggestion}
                          value={field.value ?? ""}
                          chosen={currencyChosen}
                          onPick={(currency) => {
                            setCurrencyChosen(true);
                            form.setValue("currency", currency);
                          }}
                        />
                        <FormMessage className="text-destructive" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="historyStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">
                          {t("page.dashboard.setupHistoryStart")}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage className="text-destructive" />
                      </FormItem>
                    )}
                  />
                  {moneyAccounts.length > 0 ? (
                    <>
                      <FormField
                        control={form.control}
                        name="openingAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">
                              {t("page.dashboard.setupOpeningAccount")}
                            </FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                onChange={(event) => {
                                  field.onChange(event);
                                  // Deciding later leaves no amount behind.
                                  if (!event.target.value) {
                                    form.setValue("openingAmount", "");
                                  }
                                }}
                                disabled={isLoading}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                data-testid="ledger-opening-account"
                              >
                                <option value="">
                                  {t("page.dashboard.setupOpeningNone")}
                                </option>
                                {moneyAccounts.map((account) => (
                                  <option
                                    key={account.name}
                                    value={account.name}
                                  >
                                    {account.name}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="openingAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">
                              {t("page.dashboard.setupOpeningAmount")}
                            </FormLabel>
                            <FormControl>
                              {/* An amount needs its account first; one typed
                                  without it would never be sent. */}
                              <Input
                                {...field}
                                disabled={isLoading || !openingAccount}
                                inputMode="decimal"
                                placeholder="0"
                                data-testid="ledger-opening-amount"
                              />
                            </FormControl>
                            <FormMessage className="text-destructive" />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

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
            </div>
          )}

          {isCreate && step === 2 && (
            <div className="space-y-4" data-testid="ledger-create-review">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {t("page.dashboard.setupReview")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("page.dashboard.setupReviewDescription")}
                </p>
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("page.dashboard.ledgerName")}
                  </dt>
                  <dd>{slugifiedName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("page.dashboard.ledgerTemplate")}
                  </dt>
                  {/* The chosen kind, not the preset kept for switching back
                      to it: a retained preset is not what Starter or Sample
                      creates (w4/315). */}
                  <dd>
                    {startKind === "preset" && preset
                      ? t(preset.titleKey)
                      : startKind === "sample"
                        ? t("page.dashboard.sampleTemplate")
                        : t("page.dashboard.starterTemplate")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {isPrivate
                      ? t("page.dashboard.private")
                      : t("page.dashboard.public")}
                  </dt>
                  <dd className="text-end">
                    {isPrivate
                      ? t("page.dashboard.privateAccess")
                      : t("page.dashboard.publicWarning")}
                  </dd>
                </div>
                {startKind === "preset" && moneyAccounts.length > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("page.dashboard.setupOpeningAccount")}
                    </dt>
                    <dd className="text-end">
                      {openingAccount
                        ? [
                            openingAccount,
                            openingAmount?.trim() &&
                              `${openingAmount.trim()} ${(form.getValues("currency") || "USD").toUpperCase()}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : t("page.dashboard.setupOpeningNone")}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {startKind === "preset" ? (
                previewLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {t("common.saving")}
                  </p>
                ) : previewError ? (
                  <p className="text-sm text-destructive">
                    {previewError.message}
                  </p>
                ) : previewData?.previewLedgerSetup ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">
                        {t("page.dashboard.setupAccounts")}
                      </h4>
                      <ul className="mt-1 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        {previewData.previewLedgerSetup.accounts.map(
                          (account) => (
                            <li key={account}>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {account}
                              </code>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    {Object.entries(
                      previewData.previewLedgerSetup.files as Record<
                        string,
                        string
                      >,
                    ).map(([name, content]) => (
                      <div key={name}>
                        <h4 className="text-sm font-medium text-foreground">
                          {name}
                        </h4>
                        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : null
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && step === 0 && (
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
            {isCreate && step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={isLoading}
              >
                {t("common.back")}
              </Button>
            )}
            {/* Distinct keys: Next must not become the submit button while
                its own click is still being handled, or that click
                creates the ledger before Review is shown (w4/314). */}
            {isCreate && step < 2 ? (
              <Button
                key="next"
                type="button"
                onClick={() => void nextStep()}
                disabled={isLoading || isAtLedgerLimit}
                data-testid="ledger-form-next"
              >
                {t("common.next")}
              </Button>
            ) : (
              <Button
                key="submit"
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
                {isLoading
                  ? t("common.saving")
                  : isCreate
                    ? t("page.dashboard.createLedger")
                    : t("common.save")}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </>
  );
}
