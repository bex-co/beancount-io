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
import { AlertTriangle, Files } from "lucide-react";
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
  DEFAULT_PROPERTY_NAME,
  PROPERTY_NAME_PATTERN,
  moduleAccounts,
  modulesFor,
  setupModules,
} from "../lib/setup-modules";
import { Checkbox } from "@/common/components/ui/checkbox";
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
    propertyName: z
      .string()
      .optional()
      .refine((val) => !val?.trim() || PROPERTY_NAME_PATTERN.test(val.trim()), {
        message: t("page.dashboard.setupPropertyNameInvalid"),
      }),
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

/** New books from a purpose (a setup preset), or the fictional example. */
type StartKind = "preset" | "sample";

const DRAFT_KEY = "ledger-create-draft";
/** Purpose, then details: there is no review page (ADR021). */
const LAST_STEP = 1;

interface CreateDraft {
  step: number;
  /** The customer chose the currency in this flow: never re-suggest it. */
  currencyChosen?: boolean;
  startKind: StartKind | "starter";
  presetId: string | null;
  modules?: string[];
  requestId: string;
  /** Form values minus the opening amount: raw balances stay in memory. */
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
 * Creation is two steps (ADR021, revised 2026-10-27): choose a purpose —
 * personal preselected, with the personal-only modules — then fill in the
 * details and create, with a summary of what will be created beside the
 * button instead of a review page. A defaults-only user answers nothing:
 * Next, then Create ledger. The flow never asks when the books begin: a known
 * opening balance's "as of" date is the history start. The draft and the
 * creation requestId persist in session storage, so leaving and returning —
 * or a failed attempt — resumes instead of duplicating the ledger. Editing an
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
  const [step, setStep] = useState(Math.min(draft?.step ?? 0, LAST_STEP));
  // A draft from the earlier three-step flow may name the retired Starter
  // kind; the personal purpose is what it now means.
  const [startKind, setStartKind] = useState<StartKind>(
    draft?.startKind === "sample" ? "sample" : "preset",
  );
  const [presetId, setPresetId] = useState<string | null>(
    draft?.presetId ?? SETUP_PRESETS[0].id,
  );
  const [modules, setModules] = useState<string[]>(draft?.modules ?? []);
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
      openingAmount: "",
      propertyName: (draft?.values?.propertyName as string) || "",
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

  // Persist the draft so abandoning and returning resumes (ADR021). The
  // opening amount is re-entered after an interruption: a raw balance is
  // never written to browser storage.
  const watchedValues = form.watch();
  const draftJson = JSON.stringify({
    step,
    currencyChosen,
    startKind,
    presetId,
    modules,
    requestId: requestIdRef.current,
    values: { ...watchedValues, openingAmount: "" },
  } satisfies CreateDraft);
  useEffect(() => {
    if (!isCreate) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, draftJson);
    } catch {
      // Session storage unavailable: the flow still works in-memory.
    }
  }, [isCreate, draftJson]);

  // Watch fields for dynamic UI updates
  const isPrivate = form.watch("private");
  const ledgerName = form.watch("name");
  const openingAccount = form.watch("openingAccount");
  const openingAmount = form.watch("openingAmount");
  const propertyName = form.watch("propertyName") ?? "";

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
  const offeredModules = startKind === "preset" ? modulesFor(preset?.id) : [];
  const currencyOf = (value?: string) => (value || "USD").toUpperCase();
  const moneyAccounts =
    preset?.accounts.filter((account) => account.money) ?? [];
  const hasKnownBalance = Boolean(openingAccount && openingAmount?.trim());

  // An opening balance belongs to one of the preset's money accounts. A
  // preset change drops an account the new preset does not offer, with its
  // amount, so no hidden account from the earlier preset is sent (w4/316).
  const choosePreset = (id: string) => {
    setStartKind("preset");
    setPresetId(id);
    const account = form.getValues("openingAccount");
    const offered = SETUP_PRESETS.find((entry) => entry.id === id)?.accounts;
    if (account && !offered?.some((a) => a.money && a.name === account)) {
      form.setValue("openingAccount", "");
      form.setValue("openingAmount", "");
    }
  };

  const toggleModule = (id: string, on: boolean) =>
    setModules((current) =>
      on ? [...current, id] : current.filter((entry) => entry !== id),
    );

  const buildSetup = (data: LedgerFormData): LedgerSetupInput | undefined => {
    if (!preset) return undefined;
    const amount = data.openingAmount?.trim();
    const known = Boolean(amount && data.openingAccount);
    return {
      preset: preset.id,
      title: data.name,
      operatingCurrency: currencyOf(data.currency),
      // A known balance's "as of" date is the start boundary; without one
      // the books start today on the customer's own calendar, not the
      // server's UTC day (w4/317).
      historyStart: (known && data.historyStart) || todayIsoDate(),
      // Only modules the purpose offers; another purpose sends none.
      modules: setupModules(preset.id, modules, data.propertyName),
      accounts: known
        ? [
            {
              name: data.openingAccount!,
              openingState: LedgerOpeningState.Known,
              amount: amount!,
            },
          ]
        : undefined,
    };
  };

  const [
    runPreview,
    { data: previewData, loading: previewLoading, error: previewError },
  ] = useLazyQuery(PreviewLedgerSetupDocument);

  // The summary's account list is the builder's own answer for exactly what
  // would be sent, refreshed as the details change.
  const previewKey = JSON.stringify(
    isCreate && step === LAST_STEP && startKind === "preset"
      ? buildSetup(form.getValues())
      : null,
  );
  useEffect(() => {
    if (previewKey === "null") return;
    const timer = setTimeout(() => {
      void runPreview({ variables: { setup: JSON.parse(previewKey) } });
    }, 250);
    return () => clearTimeout(timer);
  }, [previewKey, runPreview]);

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
        chosen: currencyOf(data.currency),
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
    if (step === 0 && offeredModules.length && modules.length) {
      const valid = await form.trigger("propertyName");
      if (!valid) return;
    }
    setStep((current) => Math.min(current + 1, LAST_STEP));
  };

  const previewAccounts = previewData?.previewLedgerSetup?.accounts;
  const summaryParts = [
    isPrivate ? t("page.dashboard.private") : t("page.dashboard.public"),
    ...(startKind === "preset"
      ? [
          currencyOf(form.getValues("currency")),
          previewAccounts
            ? t("page.dashboard.setupSummaryAccounts", {
                count: previewAccounts.length,
              })
            : null,
        ]
      : [t("page.dashboard.sampleTemplate")]),
  ].filter(Boolean);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(event) => {
            // Only Create ledger, on the last step, creates. A submit from
            // the purpose step, such as Enter on a choice, advances.
            if (isCreate && step < LAST_STEP) {
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
              {t("page.dashboard.setupStep", {
                step: step + 1,
                total: LAST_STEP + 1,
              })}
            </p>
          ) : null}

          {isCreate && step === 0 ? (
            <div className="space-y-4">
              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label={t("page.dashboard.ledgerTemplate")}
                data-testid="setup-preset-grid"
              >
                {SETUP_PRESETS.map((entry) => (
                  <label
                    key={entry.id}
                    className={cn(
                      choiceCardClass(
                        startKind === "preset" && presetId === entry.id,
                      ),
                      isLoading && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="radio"
                      name="setup-preset"
                      value={entry.id}
                      checked={startKind === "preset" && presetId === entry.id}
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
              <p
                className="text-xs text-muted-foreground"
                data-testid="setup-separate-ledger-note"
              >
                {t("page.dashboard.setupPurposeNote")}
              </p>

              {offeredModules.length ? (
                <fieldset
                  className="space-y-2 rounded-lg border border-input p-3"
                  data-testid="setup-modules"
                >
                  <legend className="px-1 text-sm font-medium text-foreground">
                    {t("page.dashboard.setupModules")}
                  </legend>
                  {offeredModules.map((module) => {
                    const checked = modules.includes(module.id);
                    return (
                      <div key={module.id} className="space-y-2">
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleModule(module.id, value === true)
                            }
                            disabled={isLoading}
                            className="mt-1"
                            data-testid={`setup-module-${module.catalogId}`}
                          />
                          <span className="space-y-1">
                            <span className="block text-sm text-foreground">
                              {t(module.titleKey)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {t(module.outcomeKey)}
                            </span>
                          </span>
                        </label>
                        {checked ? (
                          <div className="ms-7 space-y-2">
                            {module.takesPropertyName ? (
                              <FormField
                                control={form.control}
                                name="propertyName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-foreground">
                                      {t("page.dashboard.setupPropertyName")}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder={DEFAULT_PROPERTY_NAME}
                                        disabled={isLoading}
                                        data-testid="setup-property-name"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      {t(
                                        "page.dashboard.setupPropertyNameHint",
                                      )}
                                    </FormDescription>
                                    <FormMessage className="text-destructive" />
                                  </FormItem>
                                )}
                              />
                            ) : null}
                            <ul
                              className="flex flex-wrap gap-1"
                              data-testid={`setup-module-accounts-${module.catalogId}`}
                            >
                              {moduleAccounts(module, propertyName).map(
                                (account) => (
                                  <li key={account}>
                                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                      {account}
                                    </code>
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </fieldset>
              ) : null}

              <div className="border-t border-border pt-3">
                <label
                  className={cn(
                    choiceCardClass(startKind === "sample"),
                    isLoading && "cursor-not-allowed opacity-60",
                  )}
                  data-testid="setup-demo-option"
                >
                  <input
                    type="radio"
                    name="setup-preset"
                    value="sample"
                    checked={startKind === "sample"}
                    onChange={() => setStartKind("sample")}
                    disabled={isLoading}
                    className="sr-only"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Files className="size-4" aria-hidden="true" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-foreground">
                      {t("page.dashboard.sampleTemplate")}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {t("page.dashboard.sampleTemplateDescription")}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          ) : null}

          {(!isCreate || step === LAST_STEP) && (
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
                      {/* Only a known balance has a date: the balance before
                          that day's transactions, which starts the books. */}
                      {hasKnownBalance ? (
                        <FormField
                          control={form.control}
                          name="historyStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">
                                {t("page.dashboard.setupBalanceAsOf")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  disabled={isLoading}
                                  data-testid="ledger-balance-as-of"
                                />
                              </FormControl>
                              <FormMessage className="text-destructive" />
                            </FormItem>
                          )}
                        />
                      ) : null}
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
                          data-testid={
                            isPrivate ? undefined : "ledger-public-warning"
                          }
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

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
            {isCreate && step === LAST_STEP ? (
              <details
                className="me-auto min-w-0 text-sm text-muted-foreground"
                data-testid="ledger-create-summary"
              >
                <summary className="cursor-pointer">
                  {summaryParts.join(" · ")}
                </summary>
                {startKind === "preset" ? (
                  previewLoading && !previewAccounts ? (
                    <p className="mt-2">{t("common.loading")}</p>
                  ) : previewError ? (
                    <p className="mt-2 text-destructive">
                      {previewError.message}
                    </p>
                  ) : previewAccounts ? (
                    <ul
                      className="mt-2 grid gap-1 sm:grid-cols-2"
                      aria-label={t("page.dashboard.setupAccounts")}
                    >
                      {previewAccounts.map((account) => (
                        <li key={account}>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {account}
                          </code>
                        </li>
                      ))}
                    </ul>
                  ) : null
                ) : null}
              </details>
            ) : null}
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
                creates the ledger before the details are shown (w4/314). */}
            {isCreate && step < LAST_STEP ? (
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
