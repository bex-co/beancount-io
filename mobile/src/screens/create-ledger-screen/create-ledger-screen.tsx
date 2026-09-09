import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ListLedgersDocument,
  LedgerTemplate,
  useCreateLedgerMutation,
  useListLedgersQuery,
} from "@/generated-graphql/graphql";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  fontSizes,
  fontWeights,
  gutter,
  headerActionStyle,
  space,
  useTheme,
} from "@/common/theme";
import { ledgerVar } from "@/common/vars";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import type { ColorTheme } from "@/types/theme-props";
import {
  classifyCreateLedgerError,
  generateDefaultLedgerName,
  slugifyLedgerName,
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
      textAlign: LEADING_TEXT_ALIGN,
    },
    hint: {
      color: theme.black60,
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
  const { data: listData } = useListLedgersQuery();
  const [createLedger, { loading }] = useCreateLedgerMutation();

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t("createLedgerNameRequired"))
          .max(100, t("createLedgerNameMaxLength"))
          .refine((val) => slugifyLedgerName(val).length > 0, {
            message: t("createLedgerNameInvalid"),
          }),
        description: z.string(),
        private: z.boolean(),
        template: z.enum(["STARTER", "SAMPLE"]),
      }),
    [t],
  );

  const existingNames = useMemo(
    () => (listData?.listLedgers ?? []).map((ledger) => ledger.name),
    [listData?.listLedgers],
  );

  const {
    control,
    handleSubmit,
    setValue,
    setError,
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

  useEffect(() => {
    if (watch("name")) return;
    if (existingNames.length === 0 && !listData) return;
    setValue("name", generateDefaultLedgerName(existingNames));
    // Only seed once list data arrives and name is still empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listData, existingNames.join("|")]);

  const nameValue = watch("name");
  const slug = slugifyLedgerName(nameValue ?? "");
  const showSlug =
    Boolean(nameValue) && slug !== nameValue.trim().toLowerCase();
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
        refetchQueries: [{ query: ListLedgersDocument }],
        awaitRefetchQueries: true,
      });
      const id = result.data?.createLedger?.id;
      if (!id) {
        setError("root", { message: t("createLedgerGenericError") });
        return;
      }
      ledgerVar(id);
      router.replace("/(app)/(tabs)");
    } catch (error) {
      const kind = classifyCreateLedgerError(error);
      if (kind === "conflict") {
        setError("name", { message: t("createLedgerNameConflict") });
        return;
      }
      if (kind === "tier") {
        setError("root", { message: t("createLedgerTierLimit") });
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
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t("createLedgerNamePlaceholder")}
                  placeholderTextColor={theme.black40}
                  style={styles.input}
                  accessibilityLabel={t("createLedgerName")}
                />
              )}
            />
            {showSlug ? (
              <Text style={styles.hint}>
                {t("createLedgerSlugPreview", { slug })}
              </Text>
            ) : null}
          </View>
          {errors.name?.message ? (
            <Text style={styles.error}>{errors.name.message}</Text>
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
                  placeholderTextColor={theme.black40}
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
          <Text style={styles.formError}>{errors.root.message}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
