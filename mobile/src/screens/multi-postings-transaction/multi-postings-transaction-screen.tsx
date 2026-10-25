import { CardLoadFailure } from "@/components/card-load-failure";
import { breakableAccount } from "@/common/account-util";
import { isolateAccountPath } from "@/common/bidi";
import {
  currencyMinorUnits,
  ledgerPrimaryCurrency,
} from "@/common/currency-util";
import { routeText } from "@/common/route-text";
import { InlineError } from "@/components/inline-error";
import { memo, useEffect, useRef, useState } from "react";
import { createSingleFlight, type SingleFlight } from "@/common/single-flight";
import { useAccountCloseDatesState } from "@/common/hooks/use-account-close-dates";
import { isOpenOn, isSeedableOn } from "@/common/account-close-dates";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerModal } from "@/components/date-picker-modal";
import {
  amountMaxFontSizeMultiplier,
  amountStyle,
  fontSizes,
  fontWeights,
  headerActionMaxFontSizeMultiplier,
  headerActionStyle,
  prefersStackedLayout,
  useTheme,
} from "@/common/theme";
import { contentColumn } from "@/common/content-column";
import { AmountText } from "@/components/amount-text";
import { useThemeStyle, useToast } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
import { getFormatDate, parseFormatDate } from "@/common/format-util";
import { formatMoneyWithCurrency } from "@/common/number-utils";
import { ColorTheme } from "@/types/theme-props";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import {
  runAddTransactionCallback,
  SelectedNarration,
  SelectedPayee,
} from "@/common/globalFnFactory";
import { pushAccountPicker } from "@/screens/account-picker-screen/push-account-picker";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { useSession } from "@/common/hooks/use-session";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useAddEntriesToRemote } from "@/screens/multi-postings-transaction/hooks/use-add-entries-to-remote";
import { ListItem } from "@/screens/multi-postings-transaction/list-item";
import {
  type Posting,
  addPosting,
  buildEntryInput,
  createInitialPostings,
  createRootForPosting,
  createPrefilledPostings,
  defaultPostingAccounts,
  formatRemainderAmount,
  hasNonZeroAmount,
  hasUnparsedAmount,
  isRemainderBalanced,
  lastPostingAutoToggle,
  makePosting,
  postingAmountAccessibility,
  removePosting,
  remainder,
  shouldReseed,
  splitAmountSign,
  toggleLastPostingAuto,
  updatePostingAccount,
  updatePostingAmount,
  validatePostings,
  signedAmountInput,
  typedAmountInput,
} from "./postings-utils";
import { isTransactionDraftDirty, TransactionDraft } from "./draft-dirty";
import { inlineSaveError } from "./inline-save-error";
import { seedPostingsFromPayee } from "./payee-seed";
import { useTwoPostingSuggestions } from "@/screens/add-transaction-screen/hooks/use-two-posting-suggestions";
import { useIsHere } from "@/common/hooks/use-is-here";
import { useRouteParams } from "@/common/hooks/use-route-params";

const SIGN_TOGGLE_SIZE = 28;
const POSTING_ROW_PADDING_V = 14;

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
    // Cards bring their own 12px bottom margin; match it at the top so the
    // header-to-card gap equals the card-to-card gap.
    scrollContent: {
      // Capped centered column on iPad; a no-op on phones (w21/1005).
      ...contentColumn,
      paddingTop: 12,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    postingRow: {
      backgroundColor: theme.white,
      paddingVertical: POSTING_ROW_PADDING_V,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    // Accessibility text sizes: the account takes its own lines and the amount
    // controls sit under it at the trailing edge.
    postingRowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    postingAmountWrapStacked: {
      alignSelf: "flex-end",
    },
    postingRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    postingAccountWrap: {
      flex: 1,
    },
    postingAccount: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    // The input placeholder token, not the hairline one (1.34:1, w21/128).
    postingAccountPlaceholder: {
      color: theme.controlPlaceholder,
      fontWeight: fontWeights.regular,
    },
    postingAmountWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    signToggle: {
      width: SIGN_TOGGLE_SIZE,
      height: SIGN_TOGGLE_SIZE,
      borderRadius: SIGN_TOGGLE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    signTogglePlaceholder: {
      width: SIGN_TOGGLE_SIZE,
      height: SIGN_TOGGLE_SIZE,
    },
    signToggleText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      lineHeight: 18,
    },
    // TextInput can't be an AmountText; compose the tokens directly.
    postingAmountInput: {
      ...amountStyle,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      textAlign: "right",
      padding: 0,
      minWidth: 88,
    },
    // The final row's automatic-balance switch is always mounted, so the two
    // states have to be told apart by more than colour: the enabled tag is
    // filled and weighted, the disabled one a plain outline.
    postingAutoTag: {
      fontSize: fontSizes.xs,
      // Secondary text: the hairline colour read 1.34:1 (w21/128).
      color: theme.black80,
      marginStart: 2,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black40,
    },
    postingAutoTagActive: {
      color: theme.black,
      fontWeight: fontWeights.medium,
      backgroundColor: theme.controlSelected,
      borderColor: theme.black60,
    },
    deleteAction: {
      backgroundColor: theme.error,
      justifyContent: "center",
      alignItems: "center",
      width: 72,
    },
    addPostingRow: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addPostingText: {
      fontSize: fontSizes.lg,
      color: theme.primary,
      fontWeight: fontWeights.medium,
    },
    saveError: {
      fontSize: fontSizes.sm,
      color: theme.error,
      lineHeight: 18,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    balanceRow: {
      marginHorizontal: 20,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    balanceLabel: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    balanceAmount: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
    },
    skeletonPostingRow: {
      paddingVertical: POSTING_ROW_PADDING_V,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      // Real posting rows always contain the sign-toggle circle (or its
      // placeholder); match it so rows don't grow when data lands.
      minHeight: SIGN_TOGGLE_SIZE + 2 * POSTING_ROW_PADDING_V,
    },
    skeletonAccountTile: {
      height: 14,
      borderRadius: 7,
    },
    skeletonAmountTile: {
      height: 16,
      width: 72,
      borderRadius: 8,
    },
  });

const PostingRow = ({
  posting,
  index,
  isLast,
  canRemove,
  currency,
  onPickAccount,
  onChangeAmount,
  onToggleAuto,
  onRemove,
}: {
  posting: Posting;
  index: number;
  isLast: boolean;
  canRemove: boolean;
  /** Spoken with the amount, which otherwise reads as a bare number. */
  currency: string;
  onPickAccount: () => void;
  onChangeAmount: (input: string) => void;
  onToggleAuto: () => void;
  onRemove: () => void;
}) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  // At AX2 the account shared its row with the amount controls and read
  // "Asse…cking" / "Ex…ries" (w21/029).
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);
  const { t } = useTranslations();

  // The sign is read from the trimmed text, as the parser reads it: a pasted
  // " -12.50" was saved as negative but shown positive, and the toggle then
  // wrote a second minus (w21/232).
  const { negative: isNegative, absolute: absValue } = splitAmountSign(
    posting.amountInput,
  );
  const hasAmount = hasNonZeroAmount(posting);
  const unparsed = hasUnparsedAmount(posting);
  const amountColor = unparsed
    ? theme.error
    : !hasAmount
      ? theme.black60
      : isNegative
        ? theme.error
        : theme.success;
  const toggleBg = !hasAmount
    ? theme.black10
    : isNegative
      ? "rgba(229,73,55,0.12)"
      : "rgba(7,163,90,0.12)";

  const autoToggle = lastPostingAutoToggle({
    isLast,
    isAuto: posting.isAuto,
  });

  const amountA11y = postingAmountAccessibility({
    account: posting.account,
    amountInput: posting.amountInput,
    index,
    currency,
    t,
  });

  // The sign chosen while the field is empty: clearing a negative amount
  // stores nothing, and the next digits are negative again (w21/728).
  const emptyNegative = useRef(false);
  const shownNegative = absValue === "" ? emptyNegative.current : isNegative;

  const handleAbsValueChange = (input: string) => {
    if (input.trim() === "") emptyNegative.current = shownNegative;
    onChangeAmount(typedAmountInput(input, shownNegative));
  };

  const handleToggleSign = () => {
    if (absValue === "") emptyNegative.current = !shownNegative;
    onChangeAmount(signedAmountInput(absValue, !shownNegative));
  };

  const renderDeleteAction = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={t("removePosting")}
    >
      <Ionicons name="trash-outline" size={20} color="white" />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      renderRightActions={canRemove ? renderDeleteAction : undefined}
      overshootRight={false}
    >
      <View
        style={[
          styles.postingRow,
          stacked && styles.postingRowStacked,
          index > 0 && styles.postingRowDivider,
        ]}
      >
        <TouchableOpacity
          style={stacked ? undefined : styles.postingAccountWrap}
          activeOpacity={0.6}
          onPress={onPickAccount}
          accessibilityRole="button"
          accessibilityLabel={posting.account || t("postingAccount")}
          // The swipe-to-remove has no VoiceOver equivalent: a swipe moves
          // focus there. The row offers it as an action instead (w21/557).
          accessibilityActions={
            canRemove
              ? [{ name: "delete", label: t("removePosting") }]
              : undefined
          }
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "delete") onRemove();
          }}
        >
          <Text
            // Remeasured on a live size change (mobile/AGENTS.md).
            key={`posting-account-${fontScale}`}
            style={[
              styles.postingAccount,
              !posting.account && styles.postingAccountPlaceholder,
            ]}
            numberOfLines={stacked ? 2 : 1}
            // Stacked, the leaf is what tells two accounts apart.
            ellipsizeMode={stacked ? "head" : "middle"}
          >
            {posting.account
              ? stacked
                ? isolateAccountPath(breakableAccount(posting.account))
                : isolateAccountPath(posting.account)
              : t("postingAccount")}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.postingAmountWrap,
            stacked && styles.postingAmountWrapStacked,
          ]}
        >
          {hasAmount ? (
            <TouchableOpacity
              style={[styles.signToggle, { backgroundColor: toggleBg }]}
              onPress={handleToggleSign}
              hitSlop={8}
              accessibilityRole="button"
              // Which posting, and the sign it has now as a value: every toggle
              // sounded alike, and "Selected" was the only clue that the sign
              // was negative (w21/561).
              accessibilityLabel={
                posting.account
                  ? t("postingSignToggle", { account: posting.account })
                  : t("toggleAmountSign")
              }
              accessibilityValue={{
                text: isNegative ? t("signMinus") : t("signPlus"),
              }}
            >
              <Text style={[styles.signToggleText, { color: amountColor }]}>
                {isNegative ? "−" : "+"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.signTogglePlaceholder} />
          )}
          <TextInput
            style={[styles.postingAmountInput, { color: amountColor }]}
            maxFontSizeMultiplier={amountMaxFontSizeMultiplier}
            value={absValue}
            onChangeText={handleAbsValueChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.controlPlaceholder}
            selectTextOnFocus
            accessibilityLabel={amountA11y.label}
            accessibilityValue={{ text: amountA11y.value }}
            accessibilityHint={
              unparsed ? t("multiPostingsAmountFormat") : t("postingAmountHint")
            }
          />
          {/* Mounted for the whole life of the final row, not only while it is
              automatic: gating the mount on `isAuto` made the switch vanish the
              moment it was turned off, so the reverse transition
              `toggleLastPostingAuto` implements was unreachable. */}
          {autoToggle.rendered ? (
            <TouchableOpacity
              onPress={onToggleAuto}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("autoLabel")}
              accessibilityState={{ selected: autoToggle.selected }}
            >
              <Text
                style={[
                  styles.postingAutoTag,
                  autoToggle.selected && styles.postingAutoTagActive,
                ]}
              >
                {t("autoLabel")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
};

const MultiPostingsTransactionScreenComponent = () => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const confirmWrite = useLedgerWrite();
  const isHere = useIsHere();
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const {
    data: ledgerMeta,
    assets,
    expenses,
    currencies,
    loading: metaLoading,
    error: metaError,
    refetch: metaRefetch,
  } = useLedgerMeta(userId, ledgerId);
  // A failed first read leaves no accounts and a blind currency: not an empty
  // ledger to save into (w21/861).
  const metaFailed = Boolean(metaError) && ledgerMeta === undefined;
  const { mutate } = useAddEntriesToRemote();

  // Optional prefill, currently supplied by the receipt scanner after the LLM
  // reads a photo. Absent for a plain "new transaction".
  const {
    prefillDate,
    prefillPayee,
    prefillNarration,
    prefillSourceAccount,
    prefillTargetAccount,
    prefillAmount,
  } = useRouteParams<{
    prefillDate?: string;
    prefillPayee?: string;
    prefillNarration?: string;
    prefillSourceAccount?: string;
    prefillTargetAccount?: string;
    prefillAmount?: string;
  }>();

  // A ledger without an operating currency is in the currency it holds, not
  // in USD (w21/415, w21/520).
  const currency = ledgerPrimaryCurrency(
    currencies,
    ledgerMeta?.currencies ?? [],
  );
  // Amounts are written at the currency's own minor unit (w21/231).
  const minorUnits = currencyMinorUnits(currency);

  const [postings, setPostings] = useState<Posting[]>(() => [
    makePosting({ isAuto: false }),
    makePosting({ isAuto: true }),
  ]);
  const [seeded, setSeeded] = useState(false);
  // Params are available on first render, so seeding these through the state
  // initializers avoids a visible flash of the empty form.
  const [date, setDate] = useState(prefillDate || getFormatDate(new Date()));
  const [payee, setPayee] = useState(prefillPayee ?? "");
  const [narration, setNarration] = useState(prefillNarration ?? "");
  // How the form opened, for the discard guard. Seeding replaces the postings
  // once accounts load, so the snapshot's postings follow it (below).
  const [initialDraft, setInitialDraft] = useState<TransactionDraft>(() => ({
    date,
    payee,
    narration,
    postings,
  }));
  const savedOutRef = useRef(false);
  // A committed save disables Done: a cold-link form that fails to leave must
  // never invite a duplicate resubmit (w1/032).
  const [saved, setSaved] = useState(false);
  // Closed from the first Done until the write settles, so a second tap
  // during "Saving…" cannot post the entry again (w21/044).
  const [saving, setSaving] = useState(false);
  const saveFlightRef = useRef<SingleFlight | null>(null);
  saveFlightRef.current ??= createSingleFlight(setSaving);
  // Why the last save failed, until the draft changes (w21/001): the toast
  // alone was gone before a refusal could be read.
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    setSaveError(null);
  }, [date, payee, narration, postings]);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // A picked payee brings its usual accounts while the postings are still as
  // the form opened (w21/023). A receipt's parsed accounts are kept.
  const [seedPayee, setSeedPayee] = useState("");
  const { closeDates, settled: closeDatesSettled } =
    useAccountCloseDatesState(ledgerId);
  const payeeHistory = useTwoPostingSuggestions({
    ledgerId: ledgerId ?? "",
    payee: seedPayee,
  });
  // The accounts the last payee fill produced: picking another payee replaces
  // them unless the user changed one (w21/411).
  const lastPayeeSeedRef = useRef<string[] | null>(null);
  useEffect(() => {
    if (!seedPayee || payeeHistory.loading) return;
    const seededPostings = seedPostingsFromPayee(
      postings,
      initialDraft.postings,
      payeeHistory,
      (account) => isOpenOn(account, date, closeDates),
      lastPayeeSeedRef.current,
    );
    if (seededPostings) {
      lastPayeeSeedRef.current = seededPostings.map((p) => p.account);
      setPostings(seededPostings);
    }
    setSeedPayee("");
  }, [
    seedPayee,
    payeeHistory,
    postings,
    initialDraft.postings,
    date,
    closeDates,
  ]);

  useEffect(() => {
    // Waits for the close dates too, so a cold start cannot seed a closed
    // account (w21/103).
    if (!metaLoading && closeDatesSettled && assets.length > 0) {
      const isOpen = (account: string) => isOpenOn(account, date, closeDates);
      const isSeedable = (account: string) =>
        isSeedableOn(account, date, closeDates);
      const { source, target } = defaultPostingAccounts(
        assets,
        expenses,
        isOpen,
      );
      // The parser may return no account at all, a closed one or one the
      // ledger never opened; fall back
      // to the same defaults a blank transaction would get.
      const seededPostings = prefillAmount
        ? createPrefilledPostings(
            prefillSourceAccount && isSeedable(prefillSourceAccount)
              ? prefillSourceAccount
              : source,
            prefillTargetAccount && isSeedable(prefillTargetAccount)
              ? prefillTargetAccount
              : target,
            prefillAmount,
            minorUnits,
          )
        : createInitialPostings(source, target, minorUnits);
      // Seeded once, then again only while untouched: the first seed can come
      // from last session's persisted ranking (w21/110).
      if (
        seeded &&
        !shouldReseed(postings, initialDraft.postings, seededPostings)
      ) {
        return;
      }
      setPostings(seededPostings);
      setInitialDraft((draft) => ({ ...draft, postings: seededPostings }));
      setSeeded(true);
    }
    // `postings` and the seed are read only to compare; a reseed is driven by
    // the ledger's ranking, the close dates and the date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    seeded,
    metaLoading,
    closeDatesSettled,
    closeDates,
    date,
    assets,
    expenses,
    prefillAmount,
    prefillSourceAccount,
    prefillTargetAccount,
    minorUnits,
  ]);

  const rem = remainder(postings);
  const isBalanced = isRemainderBalanced(rem);
  const validationError = validatePostings(postings);
  // Any row's, not the first problem's: a row with no account before it hid
  // an unreadable amount behind a green "✓ $0.00" (w21/793).
  const amountUnreadable = postings.some(hasUnparsedAmount);
  const canSave = validationError === null && !saved && !metaFailed;
  const hasUnsavedChanges = isTransactionDraftDirty(initialDraft, {
    date,
    payee,
    narration,
    postings,
  });

  // Back on a dirty draft asks first, like the file and transaction editors.
  // A successful Done leaves the screen itself and is not a discard.
  useUnsavedChangesGuard(hasUnsavedChanges, savedOutRef);

  const handleSave = async () => {
    if (metaFailed) {
      toast.showToast({ message: t("ledgerLoadError"), type: "error" });
      return;
    }
    // The write already committed, or is running; stay silent instead of
    // toasting a validation message or writing a second time.
    const flight = saveFlightRef.current!;
    if (savedOutRef.current || flight.busy()) {
      return;
    }
    if (!canSave) {
      let msg = t("multiPostingsInvalidBalance");
      if (validationError === "missingAccount")
        msg = t("multiPostingsMissingAccount");
      else if (validationError === "zeroAmount")
        msg = t("multiPostingsZeroAmount");
      else if (validationError === "invalidAmount")
        msg = t("multiPostingsAmountFormat");
      toast.showToast({ message: msg, type: "error" });
      AccessibilityInfo.announceForAccessibility(msg);
      return;
    }

    const entry = buildEntryInput(postings, {
      date,
      payee,
      narration,
      currency,
    });

    const outcome = await flight.run(() =>
      confirmWrite({
        perform: () =>
          mutate({ variables: { entriesInput: [entry], ledgerId } }),
        // The mutation reports rejection in its payload. The hook's `error` field
        // is a render behind at this point, so a server-rejected split used to
        // toast success — branch on what the server actually returned.
        didSucceed: (result) => Boolean(result.data?.addEntries?.success),
        loadingMessage: t("saving"),
        successMessage: t("saveSuccess"),
        failureMessage: t("saveFailed"),
        afterSuccess: runAddTransactionCallback,
        goBackOnSuccess: false,
      }),
    );
    // Another press already owns the write.
    if (outcome === undefined) return;
    setSaveError(inlineSaveError(outcome));
    if (outcome.ok) {
      // Mark the draft saved before leaving, so the discard guard stays quiet.
      savedOutRef.current = true;
      setSaved(true);
      // The user left during "Saving…": the toast says it saved, and the
      // screen they are on now stays put (w21/194).
      if (!isHere()) return;
      if (router.canGoBack()) {
        router.back();
      } else {
        // A cold deep link leaves no back stack: land on the owning tab
        // instead of raising an unhandled GO_BACK (w1/032).
        router.replace("/(app)/(tabs)/transactions");
      }
    }
  };

  const pickAccountForPosting = (index: number) => {
    pushAccountPicker(router, {
      type: "posting",
      current: postings[index]?.account,
      // A new account opens by this entry's date, not today (w21/008).
      entryDate: date,
      // A new account starts under the root this row calls for (w21/259).
      createRoot: createRootForPosting(postings, index),
      onSelect: (account) =>
        setPostings((prev) => updatePostingAccount(prev, index, account)),
    });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("multiPostingsTitle"),
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              // Still pressable on an invalid draft, which is how the form
              // says what is wrong; never while a save runs or after it.
              // `undefined`, not false: Pressable lets a `disabled` prop of any
              // value overwrite `accessibilityState.disabled`, so false made
              // VoiceOver never say "dimmed" over the grey Done (w21/849).
              disabled={saving || saved ? true : undefined}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("done")}
              accessibilityState={{
                disabled: !canSave || saving,
                busy: saving,
              }}
            >
              <Text
                style={[
                  styles.doneButton,
                  (!canSave || saving || metaFailed) &&
                    styles.doneButtonDisabled,
                ]}
                numberOfLines={1}
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
        // With four or more postings the number pad covered Add posting, the
        // Remainder line and the save errors, and the form was too short to
        // scroll (w21/146). The inset makes it scroll; a downward drag puts
        // the pad, which has no return key, away.
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <ListItem
            title={t("date").toUpperCase()}
            content={date}
            onPress={() => setDatePickerVisible(true)}
          />
          <ListItem
            title={t("payee").toUpperCase()}
            content={payee}
            showDivider
            onPress={() => {
              SelectedPayee.setFn((v: string) => {
                setPayee(v);
                if (!prefillSourceAccount && !prefillTargetAccount) {
                  setSeedPayee(v);
                }
              });
              router.navigate({
                pathname: "/(app)/payee-input",
                params: { payee: routeText(payee) },
              });
            }}
          />
          <ListItem
            title={t("narration").toUpperCase()}
            content={narration}
            showDivider
            onPress={() => {
              SelectedNarration.setFn((v: string) => setNarration(v));
              router.navigate({
                pathname: "/(app)/narration-input",
                params: { narration: routeText(narration) },
              });
            }}
          />
        </View>

        <View style={styles.card}>
          {metaFailed ? (
            <CardLoadFailure
              onRetry={() => void metaRefetch().catch(() => undefined)}
            />
          ) : metaLoading && !seeded ? (
            <>
              {[160, 120].map((w, i) => (
                <View
                  key={i}
                  style={[
                    styles.skeletonPostingRow,
                    i > 0 && styles.postingRowDivider,
                  ]}
                >
                  <LoadingTile style={styles.skeletonAccountTile} width={w} />
                  <LoadingTile style={styles.skeletonAmountTile} />
                  <View style={{ width: 30 }} />
                </View>
              ))}
            </>
          ) : (
            <FadeInView>
              {postings.map((posting, i) => (
                <PostingRow
                  key={posting.id}
                  posting={posting}
                  index={i}
                  isLast={i === postings.length - 1}
                  canRemove={postings.length > 2}
                  currency={currency}
                  onPickAccount={() => pickAccountForPosting(i)}
                  onChangeAmount={(input) =>
                    setPostings((prev) =>
                      updatePostingAmount(prev, i, input, minorUnits),
                    )
                  }
                  onToggleAuto={() =>
                    setPostings((prev) =>
                      toggleLastPostingAuto(prev, minorUnits),
                    )
                  }
                  onRemove={() =>
                    setPostings((prev) => removePosting(prev, i, minorUnits))
                  }
                />
              ))}
            </FadeInView>
          )}
          <TouchableOpacity
            style={styles.addPostingRow}
            activeOpacity={0.6}
            onPress={() => setPostings((prev) => addPosting(prev, minorUnits))}
            accessibilityRole="button"
            accessibilityLabel={t("addPosting")}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={theme.primary}
            />
            <Text style={styles.addPostingText}>{t("addPosting")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t("remainderLabel")}</Text>
          {/* An unparsed amount counts as nothing, so the sum is not a
              verdict: neutral, never a green check (w21/031). */}
          <AmountText
            style={[
              styles.balanceAmount,
              {
                color: amountUnreadable
                  ? theme.black60
                  : isBalanced
                    ? theme.success
                    : theme.error,
              },
            ]}
          >
            {amountUnreadable
              ? "—"
              : isBalanced
                ? `✓  ${formatMoneyWithCurrency(0, currency)}`
                : formatRemainderAmount(rem, currency)}
          </AmountText>
        </View>
        {amountUnreadable ? (
          <InlineError
            style={styles.saveError}
            testID="new-transaction-amount-format"
            message={t("multiPostingsAmountFormat")}
          />
        ) : null}
        {saveError ? (
          <InlineError
            style={styles.saveError}
            testID="new-transaction-save-error"
            message={saveError}
          />
        ) : null}
      </ScrollView>

      <DatePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={parseFormatDate(date)}
        onConfirm={(d) => {
          setDate(getFormatDate(d));
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

export const MultiPostingsTransactionScreen = memo(function () {
  return (
    <LedgerGuard>
      <MultiPostingsTransactionScreenComponent />
    </LedgerGuard>
  );
});

MultiPostingsTransactionScreen.displayName = "MultiPostingsTransactionScreen";
