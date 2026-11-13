import { revalidateOnEdit } from "./revalidate-on-edit";
import { useEffect, useMemo } from "react";
import * as Localization from "expo-localization";
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
import { useIsHere } from "@/common/hooks/use-is-here";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LedgerTemplate,
  useCreateLedgerInCurrencyMutation,
  useCreateLedgerMutation,
  useCurrentUserDefaultCurrencyQuery,
} from "@/generated-graphql/graphql";
import { isUnsupportedDocumentError } from "@/common/graphql-unsupported";
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
import { switchTrackProps } from "@/common/theme/switch-colors";
import { contentColumn } from "@/common/content-column";
import { useLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { ledgerVar } from "@/common/vars";
import { LEADING_TEXT_ALIGN, leadingInputTextAlign } from "@/common/rtl";
import { InlineError } from "@/components/inline-error";
import { planKey } from "../plan-screen/plan-card";
import type { ColorTheme } from "@/types/theme-props";
import {
  LEDGER_DESCRIPTION_MAX,
  classifyCreateLedgerError,
  generateDefaultLedgerName,
  isNewLedgerName,
  ledgerNameWithinLimit,
  ledgerSlugPreview,
  slugifyLedgerName,
  tierLimitDetail,
} from "./ledger-name";
import {
  SERVER_DEFAULT_CURRENCY,
  currencyToSend,
  defaultLedgerCurrency,
  isLedgerCurrency,
} from "./ledger-currency";

type FormValues = {
  name: string;
  description: string;
  private: boolean;
  template: "STARTER" | "SAMPLE";
  currency: string;
};

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
    content: {
      // Capped centered column on iPad; a no-op on phones (w21/m2).
      ...contentColumn,
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
  const [createLedgerInCurrency, { loading: currencyLoading }] =
    useCreateLedgerInCurrencyMutation();
  // w3/m62: a server that predates the saved preference rejects this query;
  // the currency then comes from the device alone.
  const { data: savedCurrencyData } = useCurrentUserDefaultCurrencyQuery({
    errorPolicy: "ignore",
  });
  const savedCurrency = savedCurrencyData?.userProfile?.defaultCurrency ?? null;
  const prefilledCurrency = useMemo(() => {
    const locale = Localization.getLocales()[0];
    return defaultLedgerCurrency({
      saved: savedCurrency,
      nativeCurrency: locale?.currencyCode,
      region: locale?.regionCode,
    });
  }, [savedCurrency]);
  const toast = useToast();
  const isHere = useIsHere();

  const schema = useMemo(
    () =>
      z
        .object({
          name: z
            .string()
            .min(1, t("createLedgerNameRequired"))
            // Checked on the slug, as the server does (w21/992).
            .refine(ledgerNameWithinLimit, {
              message: t("createLedgerNameMaxLength"),
            })
            // A name with no letter or digit is refused here, as the server
            // would (w21/547).
            .refine(isNewLedgerName, {
              message: t("createLedgerNameInvalid"),
            }),
          description: z
            .string()
            .refine((value) => [...value].length <= LEDGER_DESCRIPTION_MAX, {
              message: t("createLedgerDescriptionMaxLength"),
            }),
          private: z.boolean(),
          template: z.enum(["STARTER", "SAMPLE"]),
          currency: z.string(),
        })
        // Only a Starter shows and sends the currency (w3/m62).
        .refine(
          (values) =>
            values.template !== "STARTER" || isLedgerCurrency(values.currency),
          { message: t("createLedgerCurrencyInvalid"), path: ["currency"] },
        ),
    [t],
  );

  const existingNames = useMemo(
    () => ledgers.map((ledger) => ledger.name),
    [ledgers],
  );

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    trigger,
    watch,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      private: true,
      template: "STARTER",
      currency: SERVER_DEFAULT_CURRENCY,
    },
  });

  // Prefill once the saved preference is known; a currency the user typed is
  // never replaced (w3/m62).
  useEffect(() => {
    if (getFieldState("currency").isDirty) return;
    setValue("currency", prefilledCurrency);
  }, [prefilledCurrency, getFieldState, setValue]);

  // A field that shows an error re-checks itself as it is edited (w21/238).
  const edited = (name: keyof FormValues, onChange: (text: string) => void) =>
    revalidateOnEdit({
      name,
      hasError: (field) => Boolean(errors[field]),
      trigger,
      onChange,
    });

  useEffect(() => {
    if (watch("name")) return;
    if (directoryLoading) return;
    setValue("name", generateDefaultLedgerName(existingNames));
    // Only seed once list data arrives and name is still empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryLoading, existingNames.join("|")]);

  const nameValue = watch("name");
  const templateValue = watch("template");
  const slugPreview = ledgerSlugPreview(nameValue ?? "");
  const busy = loading || currencyLoading || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    const name = slugifyLedgerName(values.name);
    const currency = currencyToSend(values);
    const common = {
      name,
      private: values.private,
      description: values.description.trim() || undefined,
    };
    try {
      // Without a currency, CreateLedger goes out exactly as before the field
      // existed, so older servers keep accepting it (w3/m62).
      const result = currency
        ? await createLedgerInCurrency({
            variables: { ...common, currency },
          })
        : await createLedger({
            variables: {
              ...common,
              ...(values.template === "SAMPLE"
                ? { template: LedgerTemplate.Sample }
                : {}),
            },
          });
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
      // A server older than the field refused the document before creating
      // anything: say so on the field rather than creating a USD ledger.
      if (currency && isUnsupportedDocumentError(error)) {
        setError("currency", { message: t("createLedgerCurrencyUnsupported") });
        return;
      }
      const kind = classifyCreateLedgerError(error);
      if (kind === "conflict") {
        setError("name", { message: t("createLedgerNameConflict") });
        return;
      }
      if (kind === "reserved") {
        setError("name", { message: t("createLedgerNameReserved") });
        return;
      }
      if (kind === "description") {
        setError("description", {
          message: t("createLedgerDescriptionMaxLength"),
        });
        return;
      }
      if (kind === "tier") {
        // Whose plan set the limit, when the refusal says (w7/m7).
        const detail = tierLimitDetail(error);
        setError("root", {
          message: detail
            ? t("createLedgerPlanLimit", {
                plan: t(planKey(detail.tier)),
                limit: detail.limit.toLocaleString(),
              })
            : t("createLedgerTierLimit"),
        });
        return;
      }
      setError("root", { message: t("createLedgerGenericError") });
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: t("createLedgerTitle"),
          headerRight: () => (
            <Pressable
              onPress={() => void onSubmit()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("createLedgerSubmit")}
              hitSlop={8}
            >
              {busy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text
                  style={[
                    styles.doneButton,
                    busy ? styles.doneButtonDisabled : null,
                  ]}
                  maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
                >
                  {t("createLedgerSubmit")}
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
                  maxLength={LEDGER_DESCRIPTION_MAX}
                />
              )}
            />
          </View>
          {errors.description?.message ? (
            <InlineError
              style={styles.error}
              message={errors.description.message}
            />
          ) : null}

          <View style={[styles.switchRow, styles.rowDivider]}>
            <Text style={styles.label}>{t("createLedgerPrivate")}</Text>
            <Controller
              control={control}
              name="private"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  {...switchTrackProps(theme)}
                  accessibilityLabel={t("createLedgerPrivate")}
                />
              )}
            />
          </View>
        </View>

        <Text style={styles.label}>{t("createLedgerTemplate")}</Text>
        <View style={styles.card}>
          <Controller
            control={control}
            name="template"
            render={({ field: { onChange, value } }) => (
              <>
                <Pressable
                  onPress={() => onChange("STARTER")}
                  style={[
                    styles.templateRow,
                    value === "STARTER" ? styles.templateSelected : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === "STARTER" }}
                  accessibilityLabel={t("createLedgerTemplateStarter")}
                  // The description is what tells the choices apart
                  // (w21/142).
                  accessibilityHint={t("createLedgerTemplateStarterHint")}
                >
                  <Text style={styles.templateTitle}>
                    {t("createLedgerTemplateStarter")}
                  </Text>
                  <Text style={styles.hint}>
                    {t("createLedgerTemplateStarterHint")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onChange("SAMPLE")}
                  style={[
                    styles.templateRow,
                    styles.rowDivider,
                    value === "SAMPLE" ? styles.templateSelected : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === "SAMPLE" }}
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
              </>
            )}
          />
        </View>

        {templateValue === "STARTER" ? (
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
                    accessibilityHint={t("createLedgerCurrencyHint")}
                  />
                )}
              />
              <Text style={styles.hint}>{t("createLedgerCurrencyHint")}</Text>
            </View>
            {errors.currency?.message ? (
              <InlineError
                style={styles.error}
                message={errors.currency.message}
              />
            ) : null}
          </View>
        ) : null}

        {errors.root?.message ? (
          <InlineError style={styles.formError} message={errors.root.message} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
