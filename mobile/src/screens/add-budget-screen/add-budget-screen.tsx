import { useState } from "react";
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
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
} from "@/common/theme";
import { analytics } from "@/common/analytics";
import { SelectedBudgetAccount } from "@/common/globalFnFactory";
import { DatePickerModal } from "@/components/date-picker-modal";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { Picker } from "@/components/picker";
import type { ColorTheme } from "@/types/theme-props";
import { useSaveBudget } from "@/screens/budget-screen/hooks/use-save-budget";
import {
  BUDGET_INTERVALS,
  intervalLabelKey,
} from "@/screens/budget-screen/selectors/budget-labels";
import { getFormatDate } from "@/common/format-util";

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
    valueMuted: {
      color: theme.black60,
    },
    chevron: {
      marginLeft: space.xs,
    },
    amountInput: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: space.sm,
      color: theme.text01,
      fontSize: fontSizes.lg,
      textAlign: "right",
    },
    help: {
      paddingHorizontal: space.xs,
      color: theme.black80,
      fontSize: fontSizes.sm,
      lineHeight: 20,
    },
    error: {
      paddingHorizontal: space.xs,
      color: theme.error,
      fontSize: fontSizes.sm,
      lineHeight: 20,
    },
  });

type PickerKind = "interval" | "currency" | null;

type FormRowProps = {
  label: string;
  value: string;
  /** Omitted for a fixed field: no chevron, no tap target. */
  onPress?: () => void;
  muted?: boolean;
  first?: boolean;
};

/** One labelled disclosure row of the form card. */
function FormRow({
  label,
  value,
  onPress,
  muted,
  first,
}: FormRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const chevronColor = useTheme().colorTheme.black60;
  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, muted && styles.valueMuted]}
        numberOfLines={1}
        ellipsizeMode="head"
      >
        {value}
      </Text>
      {onPress && (
        <Ionicons
          style={styles.chevron}
          name="chevron-forward"
          size={16}
          color={chevronColor}
        />
      )}
    </TouchableOpacity>
  );
}

export function AddBudgetScreenImpl(): JSX.Element {
  const { t } = useTranslations();
  const router = useRouter();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const { currencies, loading: metaLoading } = useLedgerMeta(userId, ledgerId);
  const { saveBudget, loading } = useSaveBudget(ledgerId);

  const params = useLocalSearchParams<{
    account?: string;
    interval?: string;
    currency?: string;
  }>();
  // Reached from a card, the account is fixed: a budget's history belongs to
  // one account+currency pair, so changing it here would silently start a
  // different budget instead of updating this one.
  const lockedAccount = params.account;
  const isUpdate = Boolean(lockedAccount);

  usePageView(isUpdate ? "update_budget" : "add_budget");

  const [account, setAccount] = useState(lockedAccount ?? "");
  const [interval, setInterval] = useState(
    (params.interval || "MONTHLY").toUpperCase(),
  );
  const [amount, setAmount] = useState("");
  const [pickedCurrency, setPickedCurrency] = useState(params.currency ?? "");
  const [date, setDate] = useState(() => new Date());
  const [picker, setPicker] = useState<PickerKind>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Empty means "not chosen yet" — the picker only ever sets a non-empty value,
  // so the ledger's default fills in until then without an effect to sync it.
  const currency =
    pickedCurrency || (metaLoading ? "" : (currencies[0] ?? "USD"));

  const canSubmit =
    account.trim().length > 0 &&
    amount.trim().length > 0 &&
    currency.trim().length > 0 &&
    !loading;

  const pickAccount = () => {
    SelectedBudgetAccount.setFn((selected: string) => {
      setAccount(selected);
      setSubmitError(null);
    });
    router.push({
      pathname: "/(app)/account-picker",
      params: { type: "budget", selectedItem: account },
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitError(null);

    const result = await saveBudget({
      account,
      interval,
      number: amount,
      currency,
      date,
    });

    if (result.ok) {
      analytics.track("budget_add_submitted", { update: isUpdate, interval });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      router.back();
      return;
    }

    setSubmitError(result.message || t("budgetSaveFailed"));
  };

  const intervalItems = BUDGET_INTERVALS.map((value) => ({
    value: value as string,
    label: t(intervalLabelKey(value)),
  }));

  const currencyItems =
    currencies.length > 0
      ? currencies.map((value) => ({ value, label: value }))
      : [{ value: "USD", label: "USD" }];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: isUpdate ? t("budgetUpdate") : t("budgetAdd"),
          headerRight: () => (
            <Pressable
              testID="add-budget-submit"
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
                {t("done")}
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
          <FormRow
            first
            label={t("date")}
            value={getFormatDate(date)}
            onPress={() => setDatePickerVisible(true)}
          />

          <FormRow
            label={t("account")}
            value={account || t("budgetAccountPlaceholder")}
            muted={!account}
            onPress={isUpdate ? undefined : pickAccount}
          />

          <FormRow
            label={t("budgetInterval")}
            value={t(intervalLabelKey(interval))}
            onPress={() => setPicker("interval")}
          />

          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>{t("budgetAmount")}</Text>
            <TextInput
              testID="add-budget-amount-input"
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setSubmitError(null);
              }}
              style={styles.amountInput}
              placeholder="500"
              placeholderTextColor={theme.black60}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          </View>

          <FormRow
            label={t("currency")}
            value={currency}
            onPress={() => setPicker("currency")}
          />
        </View>

        <Text style={styles.help}>{t("budgetAccountHelp")}</Text>
        {submitError && <Text style={styles.error}>{submitError}</Text>}
      </ScrollView>

      <DatePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={date}
        onConfirm={(picked: Date) => {
          setDatePickerVisible(false);
          setDate(picked);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />

      {/* One instance driven by `picker`, as in open-account-screen. Two
          instances sharing this state fight each other: the hidden one re-runs
          its hide animation on every render and resolves it into `onCancel`,
          which closes the picker the user just opened. */}
      <Picker
        visible={picker !== null}
        title={
          picker === "interval" ? t("budgetSelectInterval") : t("currency")
        }
        selectedValue={picker === "interval" ? interval : currency}
        items={picker === "interval" ? intervalItems : currencyItems}
        onSelect={(item) => {
          if (picker === "interval") {
            setInterval(item.value);
          } else {
            setPickedCurrency(item.value);
          }
          setSubmitError(null);
        }}
        onCancel={() => setPicker(null)}
        confirmButtonText={t("done")}
        cancelButtonText={t("cancel")}
      />
    </SafeAreaView>
  );
}

export function AddBudgetScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <AddBudgetScreenImpl />
    </LedgerGuard>
  );
}
