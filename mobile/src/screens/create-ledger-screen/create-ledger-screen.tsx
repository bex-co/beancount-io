import { revalidateOnEdit } from "./revalidate-on-edit";
import { useEffect, useMemo } from "react";
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
  useCreateLedgerMutation,
} from "@/generated-graphql/graphql";
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

type FormValues = {
  name: string;
  description: string;
  private: boolean;
  template: "STARTER" | "SAMPLE";
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
  const toast = useToast();
  const isHere = useIsHere();

  const schema = useMemo(
    () =>
      z.object({
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
      }),
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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      private: true,
      template: "STARTER",
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

  useEffect(() => {
    if (watch("name")) return;
    if (directoryLoading) return;
    setValue("name", generateDefaultLedgerName(existingNames));
    // Only seed once list data arrives and name is still empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryLoading, existingNames.join("|")]);

  const nameValue = watch("name");
  const slugPreview = ledgerSlugPreview(nameValue ?? "");
  const busy = loading || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    const name = slugifyLedgerName(values.name);
    try {
      const result = await createLedger({
        variables: {
          name,
          private: values.private,
          description: values.description.trim() || undefined,
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

        {errors.root?.message ? (
          <InlineError style={styles.formError} message={errors.root.message} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
