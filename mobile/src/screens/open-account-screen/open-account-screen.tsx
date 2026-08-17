import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { usePageView } from "@/common/hooks/use-page-view";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  fontSizes,
  fontWeights,
  gutter,
  headerActionStyle,
  space,
  useTheme,
  withAlpha,
} from "@/common/theme";
import { DatePickerModal } from "@/components/date-picker-modal";
import { useLedgerGuard } from "@/components/ledger-guard";
import { Picker } from "@/components/picker";
import { getRootIcon } from "@/components/account-type-icon/root-icon";
import type { AccountRoot } from "@/common/account-root";
import type { ColorTheme } from "@/types/theme-props";
import {
  ACCOUNT_ROOT_PREFIXES,
  composeAccountName,
  type AccountNameValidationReason,
  type AccountRootPrefix,
  validateAccountName,
} from "./account-name";
import { formatOpenAccountDate } from "./open-account-entry";
import { useOpenAccount } from "./use-open-account";

const VALIDATION_KEYS: Record<AccountNameValidationReason, string> = {
  invalidRoot: "openAccountInvalidRoot",
  tooFewComponents: "openAccountNameRequired",
  emptyComponent: "openAccountEmptyComponent",
  componentMustStartUppercase: "openAccountUppercaseComponent",
  invalidCharacters: "openAccountInvalidCharacters",
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
      flexDirection: "row",
      alignItems: "center",
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    label: {
      flex: 1,
      color: theme.black80,
      fontSize: fontSizes.md,
    },
    value: {
      maxWidth: "58%",
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      textAlign: "right",
    },
    chevron: {
      marginLeft: space.xs,
    },
    rootIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    accountField: {
      paddingHorizontal: space.md,
      paddingVertical: space.md,
    },
    fieldLabel: {
      color: theme.black80,
      fontSize: fontSizes.sm,
      marginBottom: space.sm,
    },
    accountInput: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 8,
      backgroundColor: theme.controlFill,
      overflow: "hidden",
    },
    prefixButton: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: space.sm,
      paddingRight: space.xs,
    },
    prefixIcon: {
      width: 24,
      height: 24,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      marginRight: space.xs,
    },
    prefixText: {
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
    prefixChevron: {
      marginLeft: 2,
    },
    inputDivider: {
      width: StyleSheet.hairlineWidth,
      height: 26,
      backgroundColor: theme.black40,
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      color: theme.text01,
      fontSize: fontSizes.lg,
    },
    error: {
      marginTop: space.sm,
      color: theme.error,
      fontSize: fontSizes.sm,
      lineHeight: 20,
    },
  });

type PickerKind = "root" | "currency" | null;

export function OpenAccountScreenComponent(): JSX.Element {
  usePageView("open_account");
  const { t } = useTranslations();
  const router = useRouter();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const { currencies, loading: metaLoading } = useLedgerMeta(userId, ledgerId);
  const { openAccount, loading } = useOpenAccount(ledgerId);

  const [rootPrefix, setRootPrefix] = useState<AccountRootPrefix>("Assets");
  const [subPath, setSubPath] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencyInitialized, setCurrencyInitialized] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const [picker, setPicker] = useState<PickerKind>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!currencyInitialized && !metaLoading) {
      setCurrency(currencies[0] ?? "");
      setCurrencyInitialized(true);
    }
  }, [currencies, currencyInitialized, metaLoading]);

  const account = composeAccountName(rootPrefix, subPath);
  const validation = validateAccountName(account);
  const canSubmit = validation.ok && !loading;
  const rootKey = rootPrefix.toLowerCase() as AccountRoot;
  const rootIcon = getRootIcon(rootKey);
  const rootTone = rootIcon.tone(theme);

  const rootItems = ACCOUNT_ROOT_PREFIXES.map((prefix) => {
    const key = prefix.toLowerCase() as AccountRoot;
    const icon = getRootIcon(key);
    const tone = icon.tone(theme);
    return {
      value: prefix,
      label: t(key),
      icon: (
        <View
          style={[styles.rootIcon, { backgroundColor: withAlpha(tone, 0.18) }]}
        >
          <Ionicons name={icon.glyph} size={17} color={tone} />
        </View>
      ),
    };
  });
  const currencyItems = [
    { value: "", label: t("openAccountNoCurrency") },
    ...currencies.map((value) => ({ value, label: value })),
  ];

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitError(null);
    const result = await openAccount({
      account,
      currencies: currency ? [currency] : [],
      date,
    });

    if (result.ok) {
      router.back();
      return;
    }

    setSubmitError(result.message || t("openAccountFailed"));
  };

  const validationMessage =
    subPath.length > 0 && !validation.ok
      ? t(VALIDATION_KEYS[validation.reason])
      : null;
  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("openAccount"),
          headerRight: () => (
            <Pressable
              testID="open-account-submit"
              onPress={handleSubmit}
              disabled={!canSubmit}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: loading }}
            >
              <Text
                style={[
                  styles.doneButton,
                  !canSubmit && styles.doneButtonDisabled,
                ]}
              >
                {loading ? t("openAccountSaving") : t("done")}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.accountField}>
            <Text style={styles.fieldLabel}>{t("account")}</Text>
            <View style={styles.accountInput}>
              <TouchableOpacity
                testID="open-account-prefix-picker"
                style={styles.prefixButton}
                activeOpacity={0.7}
                onPress={() => setPicker("root")}
                accessibilityRole="button"
                accessibilityLabel={`${t("accountType")}: ${t(rootKey)}`}
              >
                <View
                  style={[
                    styles.prefixIcon,
                    { backgroundColor: withAlpha(rootTone, 0.18) },
                  ]}
                >
                  <Ionicons name={rootIcon.glyph} size={14} color={rootTone} />
                </View>
                <Text style={styles.prefixText}>{rootPrefix}:</Text>
                <Ionicons
                  style={styles.prefixChevron}
                  name="chevron-down"
                  size={14}
                  color={theme.black60}
                />
              </TouchableOpacity>
              <View style={styles.inputDivider} />
              <TextInput
                testID="open-account-name-input"
                value={subPath}
                onChangeText={(value) => {
                  setSubPath(value);
                  setSubmitError(null);
                }}
                style={styles.input}
                placeholder={t("openAccountNamePlaceholder")}
                placeholderTextColor={theme.controlPlaceholder}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            {validationMessage ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {validationMessage}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            activeOpacity={0.7}
            onPress={() => setPicker("currency")}
            accessibilityRole="button"
          >
            <Text style={styles.label}>{t("currency")}</Text>
            <Text style={styles.value}>
              {currency || t("openAccountNoCurrency")}
            </Text>
            <Ionicons
              style={styles.chevron}
              name="chevron-forward"
              size={17}
              color={theme.black60}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            activeOpacity={0.7}
            onPress={() => setDatePickerVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.label}>{t("openDate")}</Text>
            <Text style={styles.value}>{formatOpenAccountDate(date)}</Text>
            <Ionicons
              style={styles.chevron}
              name="chevron-forward"
              size={17}
              color={theme.black60}
            />
          </TouchableOpacity>
        </View>

        {submitError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {submitError}
          </Text>
        ) : null}
      </ScrollView>

      <Picker
        visible={picker !== null}
        items={picker === "root" ? rootItems : currencyItems}
        selectedValue={picker === "root" ? rootPrefix : currency}
        title={picker === "root" ? t("chooseAccountType") : t("chooseCurrency")}
        confirmButtonText={t("done")}
        cancelButtonText={t("cancel")}
        onSelect={(item) => {
          if (picker === "root") {
            setRootPrefix(item.value as AccountRootPrefix);
          } else {
            setCurrency(item.value);
            setCurrencyInitialized(true);
          }
          setSubmitError(null);
        }}
        onCancel={() => setPicker(null)}
      />
      <DatePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={date}
        onConfirm={(selectedDate) => {
          setDate(selectedDate);
          setSubmitError(null);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
