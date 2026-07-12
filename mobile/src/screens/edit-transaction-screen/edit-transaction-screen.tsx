import { useState, useCallback, useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fonts, fontSizes, headerActionStyle, useTheme } from "@/common/theme";
import { useThemeStyle, useToast, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import {
  AccountHierarchyDocument,
  AccountJournalDocument,
  AccountReportDocument,
  BalanceSheetDocument,
  GetLedgerEntryContextDocument,
  GetLedgerJournalDocument,
  HomeChartsDocument,
  useGetLedgerEntryContextQuery,
  useUpdateLedgerEntrySourceSliceMutation,
} from "@/generated-graphql/graphql";
import { analytics } from "@/common/analytics";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    hint: {
      fontSize: fontSizes.sm,
      color: theme.black60,
      marginBottom: 12,
      lineHeight: 18,
    },
    inputWrapper: {
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.black10,
    },
    input: {
      padding: 12,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      fontFamily: fonts.mono,
      color: theme.text01,
      minHeight: 160,
      textAlignVertical: "top",
    },
    errorText: {
      marginTop: 12,
      fontSize: fontSizes.sm,
      color: theme.error,
      lineHeight: 18,
    },
    saveButton: headerActionStyle(theme),
    saveButtonDisabled: {
      ...headerActionStyle(theme),
      opacity: 0.4,
    },
    cancelButton: {
      fontSize: fontSizes.lg,
      color: theme.black60,
    },
  });

export const EditTransactionScreen = (): JSX.Element => {
  const router = useRouter();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const toast = useToast();
  const { entryHash, ledgerId } = useLocalSearchParams<{
    entryHash: string;
    ledgerId: string;
  }>();
  usePageView("edit_transaction");

  const { data } = useGetLedgerEntryContextQuery({
    variables: { entryHash: entryHash ?? "", ledgerId: ledgerId ?? "" },
    skip: !entryHash || !ledgerId,
  });
  const sha256sum = data?.getLedgerEntryContext?.sha256sum ?? "";
  const slice = data?.getLedgerEntryContext?.slice ?? "";

  const [content, setContent] = useState(slice);
  const [saveError, setSaveError] = useState<string | null>(null);
  // If slice arrives after mount (cache miss), seed content once
  const contentSeeded = useRef(slice !== "");
  useEffect(() => {
    if (slice && !contentSeeded.current) {
      contentSeeded.current = true;
      setContent(slice);
    }
  }, [slice]);

  const [updateMutation, { loading: saving }] =
    useUpdateLedgerEntrySourceSliceMutation({
      refetchQueries: [
        GetLedgerJournalDocument,
        HomeChartsDocument,
        AccountJournalDocument,
        AccountReportDocument,
        AccountHierarchyDocument,
        BalanceSheetDocument,
        GetLedgerEntryContextDocument,
      ],
      awaitRefetchQueries: false,
    });

  const handleCancel = useCallback(() => {
    analytics.track("edit_transaction_cancel", {});
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!sha256sum || saving) return;
    setSaveError(null);
    analytics.track("edit_transaction_save", {});
    const cancelToast = toast.showToast({
      message: t("saving"),
      type: "loading",
    });
    try {
      await updateMutation({
        variables: {
          input: {
            entryHash: entryHash ?? "",
            newContent: content,
            sha256sum,
          },
          ledgerId: ledgerId ?? "",
        },
      });
      cancelToast();
      toast.showToast({ message: t("editSuccess"), type: "success" });
      router.back();
    } catch (e: unknown) {
      cancelToast();
      const msg = e instanceof Error ? e.message : t("editFailed");
      setSaveError(msg);
      toast.showToast({ message: t("editFailed"), type: "error" });
    }
  }, [
    sha256sum,
    saving,
    content,
    updateMutation,
    t,
    toast,
    router,
    entryHash,
    ledgerId,
  ]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("editTransaction"),
          headerLeft: () => (
            <Pressable
              onPress={handleCancel}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
            >
              <Text style={styles.cancelButton}>{t("cancel")}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
              disabled={saving}
            >
              <Text
                style={saving ? styles.saveButtonDisabled : styles.saveButton}
              >
                {t("save")}
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>{t("editTransactionSource")}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: theme.text01 }]}
              value={content}
              onChangeText={(v) => {
                setContent(v);
                setSaveError(null);
              }}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              placeholderTextColor={theme.black60}
            />
          </View>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
