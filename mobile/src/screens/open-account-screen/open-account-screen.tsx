import { useAccountCloseDates } from "@/common/hooks/use-account-close-dates";
import { formatLedgerDate } from "@/common/date-format";
import { InlineError } from "@/components/inline-error";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
import { CardLoadFailure } from "@/components/card-load-failure";
import { useEffect, useRef, useState } from "react";
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
import {
  AccountCreated,
  runAccountCreatedCallback,
} from "@/common/globalFnFactory";
import { useLedgerRootNames } from "@/common/hooks/use-ledger-root-names";
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
  withAlpha,
} from "@/common/theme";
import { DatePickerModal } from "@/components/date-picker-modal";
import { useLedgerGuard } from "@/components/ledger-guard";
import { Picker } from "@/components/picker";
import { TextInputModal } from "@/components/text-input-modal";
import { getRootIcon } from "@/components/account-type-icon/root-icon";
import type { AccountRoot } from "@/common/account-root";
import type { ColorTheme } from "@/types/theme-props";
import {
  ACCOUNT_ROOT_PREFIXES,
  composeAccountName,
  typedSubPathIssue,
  ledgerRootName,
  openAccountCurrencyChoices,
  typedCurrencyCode,
  peelTypedRoot,
  rootButtonLabel,
  splitPrefillAccountName,
  type AccountNameValidationReason,
  type AccountRootPrefix,
  validateAccountName,
  existingAccountNotice,
  ledgerSpelling,
  openAccountSubmitState,
} from "./account-name";
import { useOpenAccount } from "./use-open-account";
import { getFormatDate } from "@/common/format-util";
import { useToday } from "@/common/hooks/use-today";
import { initialOpenDate } from "./open-date";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";
import { revealAccountVar } from "@/common/vars/reveal-account";
import { useIsHere } from "@/common/hooks/use-is-here";
import { useRouteParams } from "@/common/hooks/use-route-params";

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
      textAlign: LEADING_TEXT_ALIGN,
    },
    value: {
      maxWidth: "58%",
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      textAlign: "right",
    },
    chevron: {
      marginStart: space.xs,
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
      // Leading edge in Persian too; it sat on the left (w0/049).
      textAlign: LEADING_TEXT_ALIGN,
    },
    // An account name is Latin ledger data read left to right: the root comes
    // first and the sub-path follows it, in every app direction. Mirrored,
    // Persian showed "Bank:Checking | Assets:" — the name backwards (w0/049).
    accountInput: {
      direction: "ltr",
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
      paddingStart: space.sm,
      paddingEnd: space.xs,
    },
    prefixIcon: {
      width: 24,
      height: 24,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      marginEnd: space.xs,
    },
    prefixText: {
      color: theme.text01,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
    prefixChevron: {
      marginStart: 2,
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
      // Typed text starts beside the root, inside the left-to-right row.
      textAlign: "left",
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      color: theme.text01,
      fontSize: fontSizes.lg,
    },
    // The composed name, once it is valid: what will actually be written.
    preview: {
      marginTop: space.sm,
      color: theme.black80,
      fontSize: fontSizes.sm,
      lineHeight: 20,
    },
    error: {
      marginTop: space.sm,
      color: theme.error,
      fontSize: fontSizes.sm,
      lineHeight: 20,
    },
  });

type PickerKind = "root" | "currency" | null;

/** A code shown in the empty typed-currency field; a code, not copy. */
const EXAMPLE_CURRENCY = "EUR";

/** The currency picker's row that opens the typed entry (w21/234). */
const OTHER_CURRENCY = "__other_currency__";

export function OpenAccountScreenComponent(): JSX.Element {
  const { t, locale } = useTranslations();
  const router = useRouter();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const {
    data: meta,
    currencies,
    error: metaError,
    refetch: refetchMeta,
  } = useLedgerMeta(userId, ledgerId);
  const { openAccount, loading } = useOpenAccount(ledgerId);
  const isHere = useIsHere();

  // The account picker's "Create <typed>" row lands here with the typed query
  // as `prefill` and its context root (destination pickers suggest Expenses)
  // as `prefillRoot`; `pushOpenAccount` registers who receives the account.
  // `prefillRoot` is validated because route params can arrive from any deep
  // link, not just the picker.
  const { prefill, prefillRoot, openDate } = useRouteParams<{
    prefill?: string;
    prefillRoot?: string;
    openDate?: string;
  }>();
  // The ledger may rename its roots (`option "name_assets" "Activos"`); the
  // state keeps the canonical root, which picks the icon and colour, and the
  // name written is the ledger's own (w21/073).
  const roots = useLedgerRootNames();
  const [seed] = useState(() =>
    splitPrefillAccountName(
      prefill ?? "",
      ACCOUNT_ROOT_PREFIXES.includes(prefillRoot as AccountRootPrefix)
        ? (prefillRoot as AccountRootPrefix)
        : "Assets",
      roots,
    ),
  );

  const [rootPrefix, setRootPrefix] = useState<AccountRootPrefix>(
    seed.rootPrefix,
  );
  const [subPath, setSubPath] = useState(seed.subPath);

  // A cancelled create must not leak its registration into a later visit.
  useEffect(() => () => AccountCreated.deleteFn(), []);
  const [currency, setCurrency] = useState("");
  const [currencyInitialized, setCurrencyInitialized] = useState(false);
  const [date, setDate] = useState(() => initialOpenDate(openDate, new Date()));
  const [picker, setPicker] = useState<PickerKind>(null);
  // Currencies typed through "Other…" this visit, offered with the rest.
  const [typedCurrencies, setTypedCurrencies] = useState<string[]>([]);
  const [otherCurrencyVisible, setOtherCurrencyVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // A committed save disables submit: a cold-link form that fails to leave
  // must never invite a duplicate resubmit (w1/032).
  const [saved, setSaved] = useState(false);
  // Set as the save lands, before it navigates away: leaving after a save is not
  // a discard. A typed name asks before Back drops it, as the other write forms
  // do (w21/631).
  const savedOutRef = useRef(false);
  useUnsavedChangesGuard(!saved && subPath !== seed.subPath, savedOutRef);

  // Defaults once the meta has actually arrived: a failed first read used to
  // settle it on "No currency" for good (w21/085).
  const metaLoaded = meta !== undefined;
  useEffect(() => {
    if (!currencyInitialized && metaLoaded) {
      setCurrency(currencies[0] ?? "");
      setCurrencyInitialized(true);
    }
  }, [currencies, currencyInitialized, metaLoaded]);

  const account = composeAccountName(
    ledgerRootName(rootPrefix, roots),
    subPath,
  );
  const validation = validateAccountName(
    account,
    ACCOUNT_ROOT_PREFIXES.map((root) => ledgerRootName(root, roots)),
  );
  // The typed text, before composition tidies it: "Investments:" is a name
  // still being typed, not a request for `Assets:Investments`.
  const typedIssue = typedSubPathIssue(subPath);
  const nameOk = validation.ok && typedIssue === null;
  // An account the ledger already opens would be opened twice (w0/037).
  const submitState = openAccountSubmitState({
    account,
    nameOk,
    openAccounts: meta?.accounts,
    busy: loading,
  });
  const { alreadyOpen } = submitState;
  const closeDates = useAccountCloseDates(ledgerId);
  const today = useToday();
  // The dates are keyed by the ledger's own spelling (w21/734).
  const existingName = alreadyOpen
    ? ledgerSpelling(account, meta?.accounts)
    : undefined;
  const existing =
    existingName !== undefined
      ? existingAccountNotice(
          closeDates.get(existingName),
          closeDates.openedOn?.get(existingName),
          today,
        )
      : null;
  const canSubmit = submitState.canSubmit && !saved;
  const rootKey = rootPrefix.toLowerCase() as AccountRoot;
  const rootIcon = getRootIcon(rootKey);
  const rootTone = rootIcon.tone(theme);

  const rootItems = ACCOUNT_ROOT_PREFIXES.map((prefix) => {
    const key = prefix.toLowerCase() as AccountRoot;
    const icon = getRootIcon(key);
    const tone = icon.tone(theme);
    const name = ledgerRootName(prefix, roots);
    return {
      value: prefix,
      // A renamed root reads as the ledger names it; the canonical ones keep
      // their translated label.
      label: name === prefix ? t(key) : name,
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
    ...openAccountCurrencyChoices(
      currencies,
      meta?.currencies ?? [],
      typedCurrencies,
    ).map((value) => ({ value, label: value })),
    // A commodity the ledger has not posted yet (a first EUR or stock
    // account) is typed, not picked (w21/234).
    { value: OTHER_CURRENCY, label: t("openAccountOtherCurrency") },
  ];

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitError(null);
    // Taken before the save: leaving during it unmounts the screen, which
    // discards the registration (w21/581).
    const onCreated = AccountCreated.getFn();
    const result = await openAccount({
      account,
      currencies: currency ? [currency] : [],
      date,
    });

    // An open was already running: this press did nothing (w21/193).
    if (!result) return;

    if (result.ok) {
      savedOutRef.current = true;
      setSaved(true);
      // Accounts opens its ancestors and scrolls to it (w21/175).
      revealAccountVar({ ledgerId, account });
      // Pop only this screen, then hand the account to whatever registered via
      // `pushOpenAccount` — the picker's callback delivers the pick and pops
      // its own frame, so no screen ever pops a frame it doesn't own. A plain
      // Accounts-tab open has nothing registered and this is just a back().
      // A cold deep link leaves no back stack: land on the owning tab
      // instead of raising an unhandled GO_BACK (w1/032). Nothing can be
      // registered for the created callback without a pushing picker, so the
      // delivery below is a no-op on that path.
      // Left during the save: pop nothing, but a picker still gets its account
      // (w21/194).
      if (isHere()) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(app)/(tabs)/accounts");
        }
      }
      runAccountCreatedCallback(account, onCreated);
      return;
    }

    setSubmitError(result.message || t("openAccountFailed"));
  };

  const validationMessage =
    subPath.length > 0 && !validation.ok
      ? t(VALIDATION_KEYS[validation.reason])
      : typedIssue === "emptyComponent"
        ? t(VALIDATION_KEYS.emptyComponent)
        : null;
  const namePreview =
    nameOk && !alreadyOpen ? t("openAccountNamePreview", { account }) : null;
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
                numberOfLines={1}
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
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
                accessibilityLabel={rootButtonLabel(
                  t("accountType"),
                  rootPrefix,
                  roots,
                )}
              >
                <View
                  style={[
                    styles.prefixIcon,
                    { backgroundColor: withAlpha(rootTone, 0.18) },
                  ]}
                >
                  <Ionicons name={rootIcon.glyph} size={14} color={rootTone} />
                </View>
                <Text style={styles.prefixText}>
                  {ledgerRootName(rootPrefix, roots)}:
                </Text>
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
                accessibilityLabel={t("account")}
                value={subPath}
                onChangeText={(value) => {
                  const typed = peelTypedRoot(value, rootPrefix, roots);
                  setRootPrefix(typed.rootPrefix);
                  setSubPath(typed.subPath);
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
              <InlineError style={styles.error} message={validationMessage} />
            ) : null}
            {existing ? (
              <InlineError
                style={styles.error}
                message={t(existing.key, {
                  account,
                  ...(existing.date
                    ? { date: formatLedgerDate(existing.date, locale) }
                    : {}),
                })}
              />
            ) : null}
            {namePreview ? (
              <Text style={styles.preview}>{namePreview}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            activeOpacity={0.7}
            onPress={() => setPicker("currency")}
            accessibilityRole="button"
            // The chevron glyph read as "U+F…" in the name (w21/141).
            accessibilityLabel={t("currency")}
            accessibilityValue={{
              text: currency || t("openAccountNoCurrency"),
            }}
          >
            <Text style={styles.label}>{t("currency")}</Text>
            <Text style={styles.value}>
              {currency || t("openAccountNoCurrency")}
            </Text>
            <Ionicons
              style={styles.chevron}
              name={directionalIcon("chevron-forward")}
              size={17}
              color={theme.black60}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, styles.rowDivider]}
            activeOpacity={0.7}
            onPress={() => setDatePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("openDate")}
            accessibilityValue={{ text: getFormatDate(date) }}
          >
            <Text style={styles.label}>{t("openDate")}</Text>
            <Text style={styles.value}>{getFormatDate(date)}</Text>
            <Ionicons
              style={styles.chevron}
              name={directionalIcon("chevron-forward")}
              size={17}
              color={theme.black60}
            />
          </TouchableOpacity>
        </View>

        {submitError ? (
          <InlineError style={styles.error} message={submitError} />
        ) : null}
        {
          // Without the ledger's accounts the form cannot tell whether the name
          // is taken, and Done stayed grey with nothing said (w21/630).
          meta === undefined && metaError ? (
            <CardLoadFailure
              onRetry={() => void refetchMeta().catch(() => {})}
            />
          ) : null
        }
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
          } else if (item.value === OTHER_CURRENCY) {
            setPicker(null);
            setOtherCurrencyVisible(true);
          } else {
            setCurrency(item.value);
            setCurrencyInitialized(true);
          }
          setSubmitError(null);
        }}
        onCancel={() => setPicker(null)}
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
          setCurrency(code);
          setCurrencyInitialized(true);
          setSubmitError(null);
          setOtherCurrencyVisible(false);
        }}
        onCancel={() => setOtherCurrencyVisible(false)}
      />
      <DatePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={date}
        // Not after today: an account opened later is not listed on Accounts
        // until it opens (w21/614), so it read as lost (w21/723).
        maximumDate={new Date()}
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
