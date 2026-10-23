import { revalidateOnEdit } from "./revalidate-on-edit";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useToast } from "@/common/hooks/use-toast";
import { isUnsupportedDocumentError } from "@/common/graphql-unsupported";
import { useIsHere } from "@/common/hooks/use-is-here";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LedgerOpeningState,
  LedgerTemplate,
  useCreateLedgerMutation,
  useCreateLedgerBasicMutation,
  usePreviewLedgerSetupLazyQuery,
} from "@/generated-graphql/graphql";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CREATE_LEDGER_DRAFT_KEY,
  clearCreateLedgerDraft,
  restoreCreateLedgerDraft,
  serializeCreateLedgerDraft,
  type CreateLedgerDraft,
} from "@/common/create-ledger-draft";
import * as Localization from "expo-localization";
import {
  defaultHistoryStart,
  isHistoryStart,
  isSetupCurrency,
  setupFields,
  openingAmountOwed,
  openingAmountValue,
  openingSelection,
  SETUP_PRESETS,
  suggestCurrency,
} from "./setup-presets";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  fontSizes,
  fontWeights,
  gutter,
  headerActionMaxFontSizeMultiplier,
  headerActionStyle,
  space,
  useTheme,
} from "@/common/theme";
import { useLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { ledgerVar } from "@/common/vars";
import { LEADING_TEXT_ALIGN, leadingInputTextAlign } from "@/common/rtl";
import { InlineError } from "@/components/inline-error";
import type { ColorTheme } from "@/types/theme-props";
import {
  classifyCreateLedgerError,
  createRequestFingerprint,
  generateDefaultLedgerName,
  isNewCreateRequest,
  isRequestIdReuse,
  previewFailureKind,
  isNewLedgerName,
  slugifyLedgerName,
  ledgerSlugPreview,
} from "./ledger-name";

type FormValues = {
  name: string;
  description: string;
  private: boolean;
  template: "STARTER" | "SAMPLE";
  currency: string;
  historyStart: string;
  openingAccount: string;
  openingAmount: string;
};

type StartKind = "starter" | "sample" | "preset";

type CreateDraft = CreateLedgerDraft<FormValues> & { startKind: StartKind };

function newRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The step holding every field the form validates (name, amounts, dates). */
const FORM_STEP = 1;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    doneButton: headerActionStyle(theme),
    doneButtonDisabled: {
      color: theme.black60,
    },
    retry: {
      fontSize: fontSizes.md,
      color: theme.primary,
      textAlign: LEADING_TEXT_ALIGN,
    },
    content: {
      paddingHorizontal: gutter,
      paddingTop: space.md,
      paddingBottom: space.xl,
      gap: space.md,
    },
    card: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black20,
      borderRadius: 12,
      backgroundColor: theme.white,
      overflow: "hidden",
    },
    row: {
      minHeight: 58,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.xs,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    label: {
      color: theme.black80,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      textAlign: LEADING_TEXT_ALIGN,
    },
    input: {
      color: theme.text01,
      fontSize: fontSizes.md,
      paddingVertical: space.xs,
      textAlign: leadingInputTextAlign(),
    },
    hint: {
      color: theme.black80,
      fontSize: fontSizes.sm,
      textAlign: LEADING_TEXT_ALIGN,
    },
    error: {
      color: theme.error,
      fontSize: fontSizes.sm,
      textAlign: LEADING_TEXT_ALIGN,
      paddingHorizontal: space.md,
      paddingBottom: space.sm,
    },
    switchRow: {
      minHeight: 58,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.md,
    },
    templateRow: {
      minHeight: 72,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.xs,
    },
    optionRow: {
      minHeight: 48,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      justifyContent: "center",
    },
    templateSelected: {
      backgroundColor: theme.black10,
    },
    templateTitle: {
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      textAlign: LEADING_TEXT_ALIGN,
    },
    formError: {
      color: theme.error,
      fontSize: fontSizes.md,
      textAlign: LEADING_TEXT_ALIGN,
      paddingHorizontal: gutter,
    },
  });

export function CreateLedgerScreen(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { ledgers, loading: directoryLoading, refresh } = useLedgerDirectory();
  const [createLedger, { loading }] = useCreateLedgerMutation();
  const [createLedgerBasic] = useCreateLedgerBasicMutation();
  const [
    runPreview,
    { data: previewData, loading: previewLoading, error: previewError },
  ] = usePreviewLedgerSetupLazyQuery();
  const [step, setStep] = useState(0);
  const [startKind, setStartKind] = useState<StartKind>("starter");
  const [presetId, setPresetId] = useState<string | null>(SETUP_PRESETS[0].id);
  const requestIdRef = useRef<string>(newRequestId());
  const requestedAtRef = useRef(Date.now());
  // The request last sent under `requestId` (w21/434).
  const sentFingerprintRef = useRef<string | undefined>(undefined);

  // A resumed draft that had an opening account has lost its amount; Next is
  // refused until it is entered again or the account cleared (w21/500).
  const [amountLost, setAmountLost] = useState(false);

  const toast = useToast();
  const isHere = useIsHere();

  const schema = useMemo(
    () =>
      z
        .object({
          name: z
            .string()
            .min(1, t("createLedgerNameRequired"))
            .max(100, t("createLedgerNameMaxLength"))
            .refine(isNewLedgerName, {
              message: t("createLedgerNameInvalid"),
            }),
          description: z.string(),
          private: z.boolean(),
          template: z.enum(["STARTER", "SAMPLE"]),
          // Checked here, in the user's language, rather than refused on Review
          // in the server's (w21/107).
          currency: z.string().refine(isSetupCurrency, {
            message: t("createLedgerCurrencyInvalid"),
          }),
          historyStart: z.string().refine(isHistoryStart, {
            message: t("createLedgerHistoryStartInvalid"),
          }),
          openingAccount: z.string(),
          openingAmount: z
            .string()
            .refine((val) => openingAmountValue(val) !== null, {
              message: t("createLedgerAmountInvalid"),
            }),
        })
        .superRefine((values, ctx) => {
          if (
            openingAmountOwed(
              amountLost,
              values.openingAccount,
              values.openingAmount,
            )
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["openingAmount"],
              message: t("createLedgerAmountReenter"),
            });
          }
        }),
    [t, amountLost],
  );

  const existingNames = useMemo(
    () => ledgers.map((ledger) => ledger.name),
    [ledgers],
  );

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    setValue,
    setError,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      private: true,
      template: "STARTER",
      currency: suggestCurrency(Localization.getLocales()[0]?.regionCode),
      historyStart: defaultHistoryStart(),
      openingAccount: "",
      openingAmount: "",
    },
  });

  // A field that shows an error re-checks itself as it is edited (w21/238).
  const edited = (name: keyof FormValues, onChange: (text: string) => void) =>
    revalidateOnEdit({
      name,
      hasError: (field) => Boolean(errors[field]),
      trigger,
      onChange,
    });

  // Restore a draft left by leaving this screen (ADR021: resume, never
  // duplicate). The requestId is restored with it, so a retried submission
  // after an OTP round-trip returns the original ledger.
  const restoredRef = useRef(false);
  // Whether Books begin was typed, which the draft keeps (w21/546).
  const historyStartTypedRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void AsyncStorage.getItem(CREATE_LEDGER_DRAFT_KEY).then((raw) => {
      // A missing, corrupt or expired draft starts the flow fresh.
      const draft = restoreCreateLedgerDraft<FormValues>(raw) as
        (CreateDraft & { amountLost: boolean }) | null;
      if (!draft) return;
      setStep(draft.step);
      setStartKind(draft.startKind);
      setPresetId(draft.presetId);
      requestIdRef.current = draft.requestId;
      sentFingerprintRef.current = draft.sentFingerprint;
      if (draft.requestedAt !== undefined) {
        requestedAtRef.current = draft.requestedAt;
      }
      setAmountLost(draft.amountLost);
      historyStartTypedRef.current = draft.historyStartTyped === true;
      reset(draft.values);
    });
  }, [reset]);

  const watched = watch();
  const saveDraft = (values: FormValues) => {
    const draft: CreateDraft = {
      step,
      startKind,
      presetId,
      requestId: requestIdRef.current,
      requestedAt: requestedAtRef.current,
      sentFingerprint: sentFingerprintRef.current,
      historyStartTyped: historyStartTypedRef.current,
      values,
    };
    void AsyncStorage.setItem(
      CREATE_LEDGER_DRAFT_KEY,
      serializeCreateLedgerDraft(draft),
    ).catch(() => {});
  };
  useEffect(() => {
    saveDraft(watched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, startKind, presetId, JSON.stringify(watched)]);

  useEffect(() => {
    if (watch("name")) return;
    if (directoryLoading) return;
    setValue("name", generateDefaultLedgerName(existingNames));
    // Only seed once list data arrives and name is still empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryLoading, existingNames.join("|")]);

  // Another preset or start offers other accounts, so an opening account
  // chosen for the last one, and its amount, start over (w21/106).
  const resetOpening = () => {
    setValue("openingAccount", "");
    setValue("openingAmount", "");
  };
  const chooseStart = (kind: typeof startKind) => {
    if (kind !== startKind) resetOpening();
    // Only a preset shows and sends the currency and start date, so one left
    // invalid there must not hold a hidden error on another start.
    if (kind !== "preset") {
      if (!isSetupCurrency(getValues("currency"))) {
        setValue(
          "currency",
          suggestCurrency(Localization.getLocales()[0]?.regionCode),
        );
      }
      if (!isHistoryStart(getValues("historyStart"))) {
        setValue("historyStart", defaultHistoryStart());
      }
    }
    setStartKind(kind);
  };
  const choosePreset = (id: typeof presetId) => {
    if (id !== presetId) resetOpening();
    setPresetId(id);
  };

  const preset = SETUP_PRESETS.find((entry) => entry.id === presetId);
  const moneyAccounts =
    preset?.accounts.filter((account) => account.money) ?? [];

  const buildSetup = (values: FormValues) => {
    if (!preset) return undefined;
    const opening = openingSelection(
      preset.accounts,
      values.openingAccount,
      openingAmountValue(values.openingAmount, values.currency) ?? "",
    );
    return {
      preset: preset.id,
      title: values.name,
      ...setupFields(values),
      accounts: opening
        ? [
            {
              name: opening.name,
              openingState: LedgerOpeningState.Known,
              amount: opening.amount,
            },
          ]
        : undefined,
    };
  };

  useEffect(() => {
    if (step === 2 && startKind === "preset") {
      const setup = buildSetup(getValues());
      if (setup) void runPreview({ variables: { setup } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, startKind]);

  // Create waits for the preview: without it the accounts to be made are not
  // known, and a refused setup would be refused again (w21/478). That holds
  // while the preview loads as well as after it failed (w21/511).
  const previewBlocked =
    startKind === "preset" && (previewLoading || Boolean(previewError));
  const retryPreview = () => {
    const setup = buildSetup(getValues());
    if (setup) void runPreview({ variables: { setup } });
  };

  const nameValue = watch("name");
  const openingAccountValue = watch("openingAccount");
  // A card or loan balance is asked as what is owed; the server stores it as
  // the negative posting ADR021 calls for (w21/104).
  const openingAmountLabelKey = openingAccountValue.startsWith("Liabilities:")
    ? "createLedgerAmountOwed"
    : "createLedgerOpeningAmount";
  const slugPreview = ledgerSlugPreview(nameValue ?? "");
  const privateValue = watch("private");
  const openingAmountInput = watch("openingAmount");
  const currencyValue = watch("currency");
  const reviewOpening = preset
    ? openingSelection(
        preset.accounts,
        openingAccountValue,
        openingAmountValue(openingAmountInput, currencyValue) ?? "",
      )
    : null;
  const busy = loading || isSubmitting;
  const createDisabled = busy || (step === 2 && previewBlocked);

  // Field errors render on the form step, so a refused Create returns there;
  // left on Review, the spinner stopped and nothing said why (w21/105).
  const onSubmit = handleSubmit(
    async (values) => {
      const name = slugifyLedgerName(values.name);
      const request = {
        name,
        private: values.private,
        description: values.description.trim() || undefined,
        ...(startKind === "sample" ? { template: LedgerTemplate.Sample } : {}),
        ...(startKind === "preset" ? { setup: buildSetup(values) } : {}),
      };
      // The server refuses a reused id whose request changed, for a day. A
      // resumed draft has lost its amount and may have a new Books begin, so
      // a request that differs from the last one sent gets an id of its own;
      // the same request keeps it and stays idempotent (w21/053, w21/434).
      const fingerprint = createRequestFingerprint(request);
      if (isNewCreateRequest(sentFingerprintRef.current, fingerprint)) {
        requestIdRef.current = newRequestId();
        requestedAtRef.current = Date.now();
      }
      sentFingerprintRef.current = fingerprint;
      saveDraft(values);
      try {
        let result;
        try {
          result = await createLedger({
            variables: { ...request, requestId: requestIdRef.current },
          });
        } catch (rejected) {
          // A server older than guided setup rejects `setup` and `requestId`
          // before anything runs. Starter and Sample still create without them
          // (ADR021: older backends keep working, w21/592); a preset cannot.
          if (!isUnsupportedDocumentError(rejected)) throw rejected;
          if (startKind === "preset") {
            setError("root", { message: t("createLedgerSetupUnsupported") });
            return;
          }
          result = await createLedgerBasic({
            variables: {
              name: request.name,
              private: request.private,
              description: request.description,
              ...("template" in request ? { template: request.template } : {}),
            },
          });
        }
        void clearCreateLedgerDraft();
        const id = result.data?.createLedger?.id;
        if (!id) {
          setError("root", { message: t("createLedgerGenericError") });
          return;
        }
        // The creation already succeeded. A failed list refresh must not invite
        // another submission; the directory retains the confirmed new ledger.
        await refresh(result.data!.createLedger).catch(() => {});
        // Left meanwhile (Back stays live while it runs): the ledger exists, and
        // that is all the toast says. Switching it or popping to the tabs now
        // would change the ledger under, and close, whatever screen the user is
        // on (w21/579).
        if (!isHere()) {
          toast.showToast({
            message: t("createLedgerCreated", { name: id }),
            type: "success",
          });
          return;
        }
        ledgerVar(id);
        // Pop to the tab bar already below this screen instead of stacking
        // another copy of it (w21/242).
        router.dismissTo("/(app)/(tabs)");
      } catch (error) {
        if (isRequestIdReuse(error)) {
          // An id the server holds for another request: start a new one, and
          // refresh the list in case the first attempt did make the ledger.
          requestIdRef.current = newRequestId();
          requestedAtRef.current = Date.now();
          sentFingerprintRef.current = undefined;
          await refresh().catch(() => {});
        }
        const kind = classifyCreateLedgerError(error);
        if (kind === "conflict") {
          // The name's error renders on the form step, not on Review.
          setError("name", { message: t("createLedgerNameConflict") });
          setStep(FORM_STEP);
          return;
        }
        if (kind === "reserved") {
          setError("name", { message: t("createLedgerNameReserved") });
          setStep(FORM_STEP);
          return;
        }
        if (kind === "creating") {
          // The first attempt is still running under this requestId: the same
          // request, tapped again, returns its ledger (w21/437).
          setError("root", { message: t("createLedgerStillCreating") });
          return;
        }
        if (kind === "tier") {
          setError("root", { message: t("createLedgerTierLimit") });
          return;
        }
        setError("root", { message: t("createLedgerGenericError") });
      }
    },
    () => setStep(FORM_STEP),
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: t("createLedgerTitle"),
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (step < 2) {
                  void (async () => {
                    // Every field the schema checks is on this step, the
                    // opening amount included: one left invalid used to
                    // surface only as a Create that did nothing (w21/105).
                    if (step === 1 && !(await trigger())) return;
                    // A blank Books begin becomes today once, here, so the
                    // preview, the create and a retry past midnight all carry
                    // the same date (w21/502).
                    if (step === 1)
                      setValue(
                        "historyStart",
                        setupFields(getValues()).historyStart,
                      );
                    setStep((current) => Math.min(current + 1, 2));
                  })();
                } else {
                  void onSubmit();
                }
              }}
              disabled={createDisabled}
              accessibilityRole="button"
              accessibilityLabel={
                step < 2 ? t("createLedgerNext") : t("createLedgerSubmit")
              }
              hitSlop={8}
            >
              {busy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text
                  style={[
                    styles.doneButton,
                    createDisabled ? styles.doneButtonDisabled : null,
                  ]}
                  maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
                >
                  {step < 2 ? t("createLedgerNext") : t("createLedgerSubmit")}
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        <Text style={styles.hint} testID="create-ledger-step">
          {t("createLedgerStep", { step: step + 1, total: 3 })}
        </Text>
        {step === 0 ? (
          <>
            <Text style={styles.label}>{t("createLedgerTemplate")}</Text>
            <View style={styles.card}>
              {(
                [
                  [
                    "starter",
                    "createLedgerTemplateStarter",
                    "createLedgerTemplateStarterHint",
                  ],
                  [
                    "preset",
                    "createLedgerStartPreset",
                    "createLedgerStartPresetHint",
                  ],
                ] as const
              ).map(([kind, titleKey, hintKey]) => (
                <Pressable
                  key={kind}
                  onPress={() => chooseStart(kind)}
                  style={[
                    styles.templateRow,
                    startKind === kind ? styles.templateSelected : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: startKind === kind }}
                  accessibilityLabel={t(titleKey)}
                  // The description is what tells the choices apart
                  // (w21/142).
                  accessibilityHint={t(hintKey)}
                >
                  <Text style={styles.templateTitle}>{t(titleKey)}</Text>
                  <Text style={styles.hint}>{t(hintKey)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.card} testID="setup-demo-option">
              <Pressable
                onPress={() => chooseStart("sample")}
                style={[
                  styles.templateRow,
                  startKind === "sample" ? styles.templateSelected : null,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: startKind === "sample" }}
                accessibilityLabel={t("createLedgerTemplateSample")}
                accessibilityHint={t("createLedgerTemplateSampleHint")}
              >
                <Text style={styles.templateTitle}>
                  {t("createLedgerTemplateSample")}
                </Text>
                <Text style={styles.hint}>
                  {t("createLedgerTemplateSampleHint")}
                </Text>
              </Pressable>
            </View>
            {startKind === "preset" ? (
              <View style={styles.card} testID="setup-preset-list">
                {SETUP_PRESETS.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => choosePreset(entry.id)}
                    style={[
                      styles.templateRow,
                      presetId === entry.id ? styles.templateSelected : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: presetId === entry.id }}
                    accessibilityLabel={t(entry.titleKey)}
                    accessibilityHint={t(entry.outcomeKey)}
                  >
                    <Text style={styles.templateTitle}>
                      {t(entry.titleKey)}
                    </Text>
                    <Text style={styles.hint}>{t(entry.outcomeKey)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
        {step === 1 ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("createLedgerName")}</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={edited("name", onChange)}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t("createLedgerNamePlaceholder")}
                    placeholderTextColor={theme.controlPlaceholder}
                    style={styles.input}
                    accessibilityLabel={t("createLedgerName")}
                  />
                )}
              />
              {slugPreview ? (
                <Text style={styles.hint}>
                  {t("createLedgerSlugPreview", { slug: slugPreview })}
                </Text>
              ) : null}
            </View>
            {errors.name?.message ? (
              <InlineError style={styles.error} message={errors.name.message} />
            ) : null}

            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.label}>{t("createLedgerDescription")}</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t("createLedgerDescriptionPlaceholder")}
                    placeholderTextColor={theme.controlPlaceholder}
                    style={styles.input}
                    accessibilityLabel={t("createLedgerDescription")}
                  />
                )}
              />
            </View>

            <View style={[styles.switchRow, styles.rowDivider]}>
              <Text style={styles.label}>{t("createLedgerPrivate")}</Text>
              <Controller
                control={control}
                name="private"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: theme.black20, true: theme.primary }}
                    accessibilityLabel={t("createLedgerPrivate")}
                  />
                )}
              />
            </View>
          </View>
        ) : null}
        {step === 1 && startKind === "preset" ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("createLedgerCurrency")}</Text>
              <Controller
                control={control}
                name="currency"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={edited("currency", (text) =>
                      onChange(text.toUpperCase()),
                    )}
                    onBlur={onBlur}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={3}
                    style={styles.input}
                    accessibilityLabel={t("createLedgerCurrency")}
                  />
                )}
              />
              {errors.currency?.message ? (
                <InlineError
                  style={styles.error}
                  message={errors.currency.message}
                />
              ) : null}
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.label}>{t("createLedgerHistoryStart")}</Text>
              <Controller
                control={control}
                name="historyStart"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={(text) => {
                      historyStartTypedRef.current = true;
                      edited("historyStart", onChange)(text);
                    }}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={t("datePlaceholder")}
                    placeholderTextColor={theme.controlPlaceholder}
                    style={styles.input}
                    accessibilityLabel={t("createLedgerHistoryStart")}
                  />
                )}
              />
              {errors.historyStart?.message ? (
                <InlineError
                  style={styles.error}
                  message={errors.historyStart.message}
                />
              ) : null}
            </View>
            {moneyAccounts.length > 0 ? (
              <>
                {/* Inside the card's padding, and "Decide later" an option
                    to choose like the accounts, not a heading (w21/051). */}
                <View style={[styles.row, styles.rowDivider]}>
                  <Text style={styles.label}>
                    {t("createLedgerOpeningAccount")}
                  </Text>
                </View>
                {[
                  { value: "", label: t("createLedgerOpeningNone") },
                  ...moneyAccounts.map((account) => ({
                    value: account.name,
                    label: account.name,
                  })),
                ].map((option) => (
                  <Pressable
                    key={option.value || "none"}
                    onPress={() => {
                      setValue("openingAccount", option.value);
                      // "Decide later" hides the amount field, so a value left
                      // in it would keep failing Next's validation with no
                      // message to show (w21/326).
                      if (option.value === "") setValue("openingAmount", "");
                    }}
                    style={[
                      styles.optionRow,
                      openingAccountValue === option.value
                        ? styles.templateSelected
                        : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: openingAccountValue === option.value,
                    }}
                    accessibilityLabel={option.label}
                  >
                    <Text style={styles.templateTitle}>{option.label}</Text>
                  </Pressable>
                ))}
                {/* Only once an account is chosen: under "Decide later" a
                    typed amount had nowhere to go (w21/106). */}
                {openingAccountValue ? (
                  <View style={[styles.row, styles.rowDivider]}>
                    <Text style={styles.label}>{t(openingAmountLabelKey)}</Text>
                    <Controller
                      control={control}
                      name="openingAmount"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          value={value}
                          onChangeText={edited("openingAmount", onChange)}
                          onBlur={onBlur}
                          // A keypad with a minus: the decimal pad had none,
                          // so no balance could be entered as negative.
                          keyboardType={
                            Platform.OS === "ios"
                              ? "numbers-and-punctuation"
                              : "numeric"
                          }
                          placeholder="0"
                          placeholderTextColor={theme.controlPlaceholder}
                          style={styles.input}
                          accessibilityLabel={t(openingAmountLabelKey)}
                        />
                      )}
                    />
                    {errors.openingAmount?.message ? (
                      <InlineError
                        style={styles.error}
                        message={errors.openingAmount.message}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.templateTitle}>
                {t("createLedgerReview")}
              </Text>
              <Text style={styles.hint}>
                {t("createLedgerReviewDescription")}
              </Text>
              {/* What the server will make, not what was typed: it takes only
                  lowercase letters, digits, "-" and "_" (w21/477). */}
              <Text style={styles.hint}>
                {slugifyLedgerName(nameValue ?? "") || nameValue}
              </Text>
              <Text style={styles.hint}>
                {privateValue
                  ? t("createLedgerPrivate")
                  : t("createLedgerPublic")}
              </Text>
              {startKind === "preset" ? (
                previewLoading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : previewError ? (
                  previewFailureKind(previewError) === "refused" ? (
                    <InlineError
                      style={styles.error}
                      message={previewError.message}
                    />
                  ) : previewFailureKind(previewError) === "unsupported" ? (
                    <InlineError
                      style={styles.error}
                      message={t("createLedgerSetupUnsupported")}
                    />
                  ) : (
                    <>
                      <InlineError
                        style={styles.error}
                        message={t("ledgerLoadError")}
                      />
                      <Pressable
                        onPress={retryPreview}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text style={styles.retry}>{t("discoveryRetry")}</Text>
                      </Pressable>
                    </>
                  )
                ) : previewData?.previewLedgerSetup ? (
                  <>
                    <Text style={styles.label}>
                      {t("createLedgerAccounts")}
                    </Text>
                    {previewData.previewLedgerSetup.accounts.map((account) => (
                      <Text key={account} style={styles.hint}>
                        {account}
                      </Text>
                    ))}
                    {reviewOpening ? (
                      <Text style={styles.label}>
                        {t("createLedgerReviewOpening", {
                          account: reviewOpening.name,
                          amount: reviewOpening.amount,
                        })}
                      </Text>
                    ) : null}
                  </>
                ) : null
              ) : null}
            </View>
          </View>
        ) : null}
        {step > 0 ? (
          <Pressable
            onPress={() => setStep((current) => Math.max(current - 1, 0))}
            accessibilityRole="button"
            accessibilityLabel={t("createLedgerBack")}
          >
            <Text style={styles.templateTitle}>{t("createLedgerBack")}</Text>
          </Pressable>
        ) : null}

        {errors.root?.message ? (
          <InlineError style={styles.formError} message={errors.root.message} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
