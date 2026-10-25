import { formatLedgerDate } from "@/common/date-format";
import { isolateAccountPath } from "@/common/bidi";
import { useAccountCloseDates } from "@/common/hooks/use-account-close-dates";
import { closedBeforeDate } from "@/common/account-close-dates";
import {
  accountOnlyCurrency,
  heldCurrenciesOf,
} from "@/components/account-list/held-currencies";
import { useTrialBalance } from "@/screens/accounts-screen/hooks/use-trial-balance";
import {
  budgetCurrencyOptions,
  defaultBudgetCurrency,
} from "./currency-options";
import { TextInputModal } from "@/components/text-input-modal";
import { typedCurrencyCode } from "@/screens/open-account-screen/account-name";
import { useEffect, useMemo, useRef, useState } from "react";
import { InlineError } from "@/components/inline-error";
import {
  Platform,
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
import { budgetAmountPlaceholder } from "./amount-placeholder";
import { SafeAreaView } from "react-native-safe-area-context";
import { haptics } from "@/common/haptics";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
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
import { contentColumn } from "@/common/content-column";
import { pushAccountPicker } from "@/screens/account-picker-screen/push-account-picker";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
import { updateBudgetDates } from "./update-date";
import { useBudgetGroups } from "@/screens/budget-screen/hooks/use-budget-groups";
import { budgetInEffectDate } from "@/screens/budget-screen/selectors/budget-selectors";
import { DatePickerModal } from "@/components/date-picker-modal";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { Picker } from "@/components/picker";
import type { ColorTheme } from "@/types/theme-props";
import { useSaveBudget } from "@/screens/budget-screen/hooks/use-save-budget";
import { isBudgetAmount } from "@/screens/budget-screen/build-budget-entry";
import {
  BUDGET_INTERVALS,
  intervalLabelKey,
} from "@/screens/budget-screen/selectors/budget-labels";
import { getFormatDate } from "@/common/format-util";
import {
  LEADING_TEXT_ALIGN,
  directionalIcon,
  trailingInputTextAlign,
} from "@/common/rtl";
import { useIsHere } from "@/common/hooks/use-is-here";
import { useRouteParams } from "@/common/hooks/use-route-params";

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
      // Capped centered column on iPad; a no-op on phones (w21/1005).
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
      textAlign: LEADING_TEXT_ALIGN,
    },
    value: {
      maxWidth: "58%",
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      textAlign: "right",
    },
    valueMuted: {
      color: theme.controlPlaceholder,
    },
    chevron: {
      marginStart: space.xs,
    },
    amountInput: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: space.sm,
      color: theme.text01,
      fontSize: fontSizes.lg,
      textAlign: trailingInputTextAlign(),
    },
    help: {
      paddingHorizontal: space.xs,
      color: theme.black80,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    error: {
      paddingHorizontal: space.xs,
      color: theme.error,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

type PickerKind = "interval" | "currency" | null;

const OTHER_CURRENCY = "__other_currency__";
const EXAMPLE_CURRENCY = "EUR";

type FormRowProps = {
  label: string;
  value: string;
  /** Omitted for a fixed field: no chevron, no tap target. */
  onPress?: () => void;
  muted?: boolean;
  first?: boolean;
  /** What VoiceOver reads when it differs from what is shown: an example is not a choice (w21/925). */
  spokenValue?: string;
};

/** One labelled disclosure row of the form card. */
function FormRow({
  label,
  value,
  onPress,
  muted,
  first,
  spokenValue,
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
      accessibilityValue={{ text: spokenValue ?? value }}
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
          name={directionalIcon("chevron-forward")}
          size={16}
          color={chevronColor}
        />
      )}
    </TouchableOpacity>
  );
}

function AddBudgetScreenImpl(): JSX.Element {
  const { t, locale } = useTranslations();
  const router = useRouter();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const {
    data: ledgerMeta,
    currencies,
    loading: metaLoading,
    error: metaError,
  } = useLedgerMeta(userId, ledgerId);
  const { saveBudget, loading } = useSaveBudget(ledgerId);
  const isHere = useIsHere();

  const params = useRouteParams<{
    account?: string;
    interval?: string;
    currency?: string;
    currentAmount?: string;
    currentDate?: string;
  }>();
  // Reached from a card, the account is fixed: a budget's history belongs to
  // one account+currency pair, so changing it here would silently start a
  // different budget instead of updating this one.
  const lockedAccount = params.account;
  const isUpdate = Boolean(lockedAccount);

  const [account, setAccount] = useState(lockedAccount ?? "");
  const [interval, setInterval] = useState(
    (params.interval || "MONTHLY").toUpperCase(),
  );
  const [amount, setAmount] = useState("");
  const [pickedCurrency, setPickedCurrency] = useState(params.currency ?? "");
  // An Update starts no earlier than the entry it replaces (w21/623).
  const dates = updateBudgetDates(params.currentDate, new Date());
  const [date, setDate] = useState(() => dates.initial);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [typedCurrencies, setTypedCurrencies] = useState<string[]>([]);
  const [otherCurrencyVisible, setOtherCurrencyVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // A committed save disables submit: a cold-link form that fails to leave
  // must never invite a duplicate resubmit (w1/032).
  const [saved, setSaved] = useState(false);
  // Set as the save lands, before it navigates away: leaving after a save is not
  // a discard. A typed amount asks before Back drops it, as the other write forms
  // do (w21/631).
  const savedOutRef = useRef(false);
  useUnsavedChangesGuard(!saved && amount.trim().length > 0, savedOutRef);

  // Empty means "not chosen yet" — the picker only ever sets a non-empty value,
  // so the ledger's default fills in until then without an effect to sync it.
  // And an account that holds one currency starts the budget in it, until one is
  // chosen by hand (w21/946).
  const closeDates = useAccountCloseDates(ledgerId);
  // From the trial balance in units, which holds every root's accounts.
  const { data: heldData } = useTrialBalance(ledgerId, undefined, "units");
  const held = useMemo(() => heldCurrenciesOf(heldData), [heldData]);
  const currency =
    pickedCurrency ||
    accountOnlyCurrency(account, held) ||
    (metaLoading
      ? ""
      : defaultBudgetCurrency(currencies, ledgerMeta?.currencies ?? []));

  // Adding for an account and currency that already have a budget is an
  // Update by another road: it keeps the Update's earliest date, shows the
  // current amount, and says it replaces it (w21/947).
  const { groups: budgets } = useBudgetGroups(isUpdate ? undefined : ledgerId);
  const existing = isUpdate
    ? undefined
    : budgets.find(
        (group) =>
          group.account === account.trim() && group.currency === currency,
      );
  const existingDates = existing
    ? updateBudgetDates(budgetInEffectDate(existing), new Date())
    : null;
  const minimumDate = existingDates?.minimum ?? dates.minimum;
  useEffect(() => {
    if (minimumDate && date < minimumDate) setDate(minimumDate);
  }, [minimumDate, date]);

  // Written verbatim into the directive, so only a number may pass (w0/038).
  const amountOk = isBudgetAmount(amount);
  const amountInvalid = amount.trim().length > 0 && !amountOk;
  // The income sign comes from the ledger's options, which an update from a
  // card does not otherwise wait for: saved before they landed, an income
  // target went out positive and read as a spending cap (w21/303). A failed
  // read stops the wait; the amount then goes as typed.
  const metaSettled = ledgerMeta !== undefined || Boolean(metaError);
  // A budget dated after its account closed never applies (w21/877).
  const closedAt = closedBeforeDate(account, getFormatDate(date), closeDates);
  // And before the account exists: the card would judge months it had no
  // account for (w21/948). Only declared accounts have an open date, so a
  // parent rolled up from its children is never refused.
  const openedAt = closeDates.openedOn?.get(account.trim());
  const opensLater =
    openedAt !== undefined && getFormatDate(date) < openedAt
      ? openedAt
      : undefined;
  const canSubmit =
    closedAt === undefined &&
    opensLater === undefined &&
    account.trim().length > 0 &&
    amountOk &&
    currency.trim().length > 0 &&
    metaSettled &&
    !loading &&
    !saved;

  const pickAccount = () => {
    pushAccountPicker(router, {
      type: "budget",
      current: account,
      // The accounts open on the budget's own date are listed (w21/877).
      entryDate: getFormatDate(date),
      onSelect: (selected) => {
        setAccount(selected);
        setSubmitError(null);
      },
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
      // Settings that failed to load leave the default root, not none: with
      // none an income target went in as a positive number and the card
      // switched to spending rules (w21/878).
      incomeRoot: ledgerMeta?.options.name_income ?? DEFAULT_INCOME_ROOT,
    });

    // A save was already running: this press did nothing (w21/193).
    if (!result) {
      return;
    }

    if (result.ok) {
      haptics.success();
      savedOutRef.current = true;
      setSaved(true);
      // Left during the save: leave the screen they are on alone (w21/194).
      if (!isHere()) {
        return;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        // A cold deep link leaves no back stack: land on the owning screen
        // instead of raising an unhandled GO_BACK (w1/032).
        router.replace("/(app)/budget");
      }
      return;
    }

    haptics.error();
    setSubmitError(result.message || t("budgetSaveFailed"));
  };

  const intervalItems = BUDGET_INTERVALS.map((value) => ({
    value: value as string,
    label: t(intervalLabelKey(value)),
  }));

  // The current value is always an option, so the wheel never falls back to
  // the first one and switches a non-operating currency silently (w21/121).
  const currencyItems = [
    ...budgetCurrencyOptions(
      currencies,
      currency,
      ledgerMeta?.currencies ?? [],
      typedCurrencies,
    ).map((value) => ({ value, label: value })),
    // A commodity the ledger has not posted yet is typed, not picked (w21/234).
    { value: OTHER_CURRENCY, label: t("openAccountOtherCurrency") },
  ];

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
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
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
            value={
              account
                ? isolateAccountPath(account)
                : t("budgetAccountPlaceholder")
            }
            muted={!account}
            spokenValue={account || t("budgetAccountNotSelected")}
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
              accessibilityLabel={t("budgetAmount")}
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                setSubmitError(null);
              }}
              style={styles.amountInput}
              placeholder={budgetAmountPlaceholder(
                isUpdate || existing !== undefined,
                params.currentAmount ?? existing?.amount,
              )}
              placeholderTextColor={theme.controlPlaceholder}
              keyboardType={
                Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
              }
              returnKeyType="done"
              accessibilityHint={
                amountInvalid ? t("budgetAmountInvalid") : undefined
              }
            />
          </View>

          <FormRow
            label={t("currency")}
            value={currency}
            // Locked with the account: the currency is the other half of the
            // budget's identity, so changing it started a second budget and
            // left this one as it was (w21/121).
            onPress={isUpdate ? undefined : () => setPicker("currency")}
          />
        </View>

        {amountInvalid ? (
          <InlineError
            style={styles.error}
            message={t("budgetAmountInvalid")}
          />
        ) : null}
        <Text style={styles.help}>{t("budgetAccountHelp")}</Text>
        {existing ? (
          <Text style={styles.help}>{t("budgetReplacesCurrent")}</Text>
        ) : null}
        {closedAt !== undefined && (
          <InlineError
            style={styles.error}
            message={t("accountPickerClosedOn", {
              name: account,
              date: formatLedgerDate(closedAt, locale),
            })}
          />
        )}
        {opensLater !== undefined && (
          <InlineError
            style={styles.error}
            message={t("accountPickerOpensOn", {
              name: account,
              date: formatLedgerDate(opensLater, locale),
            })}
          />
        )}
        {submitError && (
          <InlineError style={styles.error} message={submitError} />
        )}
      </ScrollView>

      <DatePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={date}
        minimumDate={minimumDate}
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
          } else if (item.value === OTHER_CURRENCY) {
            setPicker(null);
            setOtherCurrencyVisible(true);
          } else {
            setPickedCurrency(item.value);
          }
          setSubmitError(null);
        }}
        onCancel={() => setPicker(null)}
        confirmButtonText={t("done")}
        cancelButtonText={t("cancel")}
      />
      <TextInputModal
        visible={otherCurrencyVisible}
        title={t("openAccountOtherCurrencyTitle")}
        message={t("openAccountOtherCurrencyMessage")}
        placeholder={EXAMPLE_CURRENCY}
        confirmButtonText={t("done")}
        cancelButtonText={t("cancel")}
        validateInput={(input) =>
          input.trim() === ""
            ? false
            : typedCurrencyCode(input) !== null ||
              t("openAccountCurrencyInvalid")
        }
        onConfirm={(input) => {
          const code = typedCurrencyCode(input);
          if (code === null) return;
          setTypedCurrencies((known) =>
            known.includes(code) ? known : [...known, code],
          );
          setPickedCurrency(code);
          setSubmitError(null);
          setOtherCurrencyVisible(false);
        }}
        onCancel={() => setOtherCurrencyVisible(false)}
      />
    </SafeAreaView>
  );
}

/** The income root a ledger has unless its settings say otherwise. */
const DEFAULT_INCOME_ROOT = "Income";

export function AddBudgetScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <AddBudgetScreenImpl />
    </LedgerGuard>
  );
}
