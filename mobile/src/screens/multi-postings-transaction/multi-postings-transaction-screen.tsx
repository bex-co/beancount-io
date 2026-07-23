import { memo, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerModal } from "@/components/date-picker-modal";
import {
  amountMaxFontSizeMultiplier,
  amountStyle,
  fontSizes,
  fontWeights,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useThemeStyle, usePageView, useToast } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { getFormatDate } from "@/common/format-util";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { LoadingTile } from "@/components/loading-tile";
import {
  AddTransactionCallback,
  SelectedPostingAccount,
  SelectedNarration,
  SelectedPayee,
} from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useAddEntriesToRemote } from "@/screens/multi-postings-transaction/hooks/use-add-entries-to-remote";
import { ListItem } from "@/screens/multi-postings-transaction/list-item";
import {
  type Posting,
  addPosting,
  buildEntryInput,
  createInitialPostings,
  createPrefilledPostings,
  makePosting,
  removePosting,
  remainder,
  toggleLastPostingAuto,
  updatePostingAccount,
  updatePostingAmount,
  validatePostings,
} from "./postings-utils";

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
      paddingTop: 12,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.black10,
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
    postingAccountPlaceholder: {
      color: theme.black40,
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
    postingAutoTag: {
      fontSize: fontSizes.xs,
      color: theme.black60,
      marginLeft: 2,
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
    balanceRow: {
      marginHorizontal: 20,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    balanceLabel: {
      fontSize: fontSizes.sm,
      color: theme.black60,
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
  onPickAccount,
  onChangeAmount,
  onToggleAuto,
  onRemove,
}: {
  posting: Posting;
  index: number;
  isLast: boolean;
  canRemove: boolean;
  onPickAccount: () => void;
  onChangeAmount: (input: string) => void;
  onToggleAuto: () => void;
  onRemove: () => void;
}) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  const isNegative = posting.amountInput.startsWith("-");
  const absValue = isNegative
    ? posting.amountInput.slice(1)
    : posting.amountInput;
  const hasAmount = posting.amountCents !== 0;
  const amountColor = !hasAmount
    ? theme.black60
    : isNegative
      ? theme.error
      : theme.success;
  const toggleBg = !hasAmount
    ? theme.black10
    : isNegative
      ? "rgba(229,73,55,0.12)"
      : "rgba(7,163,90,0.12)";

  const handleAbsValueChange = (input: string) => {
    onChangeAmount(isNegative ? `-${input}` : input);
  };

  const handleToggleSign = () => {
    onChangeAmount(isNegative ? absValue : `-${absValue}`);
  };

  const renderDeleteAction = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={onRemove}>
      <Ionicons name="trash-outline" size={20} color="white" />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      renderRightActions={canRemove ? renderDeleteAction : undefined}
      overshootRight={false}
    >
      <View style={[styles.postingRow, index > 0 && styles.postingRowDivider]}>
        <TouchableOpacity
          style={styles.postingAccountWrap}
          activeOpacity={0.6}
          onPress={onPickAccount}
        >
          <Text
            style={[
              styles.postingAccount,
              !posting.account && styles.postingAccountPlaceholder,
            ]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {posting.account || t("postingAccount")}
          </Text>
        </TouchableOpacity>

        <View style={styles.postingAmountWrap}>
          {hasAmount ? (
            <TouchableOpacity
              style={[styles.signToggle, { backgroundColor: toggleBg }]}
              onPress={handleToggleSign}
              hitSlop={8}
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
            placeholderTextColor={theme.black60}
            selectTextOnFocus
          />
          {isLast && posting.isAuto ? (
            <TouchableOpacity onPress={onToggleAuto} hitSlop={8}>
              <Text style={styles.postingAutoTag}>{t("autoLabel")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
};

export const MultiPostingsTransactionScreenComponent = () => {
  usePageView("add_transaction_split");
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const {
    assets,
    expenses,
    currencies,
    loading: metaLoading,
  } = useLedgerMeta(userId, ledgerId);
  const { mutate, error } = useAddEntriesToRemote();

  // Optional prefill, currently supplied by the receipt scanner after the LLM
  // reads a photo. Absent for a plain "new transaction".
  const {
    prefillDate,
    prefillPayee,
    prefillNarration,
    prefillSourceAccount,
    prefillTargetAccount,
    prefillAmount,
  } = useLocalSearchParams<{
    prefillDate?: string;
    prefillPayee?: string;
    prefillNarration?: string;
    prefillSourceAccount?: string;
    prefillTargetAccount?: string;
    prefillAmount?: string;
  }>();

  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const [postings, setPostings] = useState<Posting[]>([
    makePosting({ isAuto: false }),
    makePosting({ isAuto: true }),
  ]);
  const [seeded, setSeeded] = useState(false);
  // Params are available on first render, so seeding these through the state
  // initializers avoids a visible flash of the empty form.
  const [date, setDate] = useState(prefillDate || getFormatDate(new Date()));
  const [payee, setPayee] = useState(prefillPayee ?? "");
  const [narration, setNarration] = useState(prefillNarration ?? "");
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (!seeded && !metaLoading && assets.length > 0) {
      const secondAccount =
        expenses.length > 0
          ? expenses[0]
          : assets.length > 1
            ? assets[1]
            : assets[0];
      // The parser may return no account at all; fall back to the same defaults
      // a blank transaction would get rather than showing empty account rows.
      setPostings(
        prefillAmount
          ? createPrefilledPostings(
              prefillSourceAccount || assets[0],
              prefillTargetAccount || secondAccount,
              prefillAmount,
            )
          : createInitialPostings(assets[0], secondAccount),
      );
      setSeeded(true);
    }
  }, [
    seeded,
    metaLoading,
    assets,
    expenses,
    prefillAmount,
    prefillSourceAccount,
    prefillTargetAccount,
  ]);

  const rem = remainder(postings);
  const isBalanced = rem === 0;
  const validationError = validatePostings(postings);
  const canSave = validationError === null;

  const handleSave = async () => {
    if (!canSave) {
      let msg = t("multiPostingsInvalidBalance");
      if (validationError === "missingAccount")
        msg = t("multiPostingsMissingAccount");
      else if (validationError === "zeroAmount")
        msg = t("multiPostingsZeroAmount");
      toast.showToast({ message: msg, type: "error" });
      return;
    }

    await analytics.track("tap_split_done", { legCount: postings.length });

    try {
      const cancel = toast.showToast({ message: t("saving"), type: "loading" });
      const entry = buildEntryInput(postings, {
        date,
        payee,
        narration,
        currency,
      });
      await mutate({ variables: { entriesInput: [entry], ledgerId } });
      cancel();

      if (!error) {
        toast.showToast({ message: t("saveSuccess"), type: "success" });
        setTimeout(async () => {
          const callback = AddTransactionCallback.getFn();
          if (callback) {
            await callback();
            AddTransactionCallback.deleteFn();
          }
          router.back();
        }, 2000);
      } else {
        toast.showToast({ message: t("saveFailed"), type: "error" });
      }
    } catch {
      toast.showToast({ message: t("saveFailed"), type: "error" });
    }
  };

  const pickAccountForPosting = (index: number) => {
    SelectedPostingAccount.setFn((account: string) => {
      setPostings((prev) => updatePostingAccount(prev, index, account));
    });
    router.push({
      pathname: "/(app)/account-picker",
      params: { type: "posting" },
    });
  };

  const formatRemainder = (cents: number) => {
    const abs = Math.abs(cents);
    const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
    return `${sign}${currencySymbol}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("multiPostingsTitle"),
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={10}>
              <Text
                style={[
                  styles.doneButton,
                  !canSave && styles.doneButtonDisabled,
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
              SelectedPayee.setFn((v: string) => setPayee(v));
              router.navigate({
                pathname: "/(app)/payee-input",
                params: { payee },
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
                params: { narration },
              });
            }}
          />
        </View>

        <View style={styles.card}>
          {metaLoading && !seeded ? (
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
            postings.map((posting, i) => (
              <PostingRow
                key={posting.id}
                posting={posting}
                index={i}
                isLast={i === postings.length - 1}
                canRemove={postings.length > 2}
                onPickAccount={() => pickAccountForPosting(i)}
                onChangeAmount={(input) =>
                  setPostings((prev) => updatePostingAmount(prev, i, input))
                }
                onToggleAuto={() =>
                  setPostings((prev) => toggleLastPostingAuto(prev))
                }
                onRemove={() => setPostings((prev) => removePosting(prev, i))}
              />
            ))
          )}
          <TouchableOpacity
            style={styles.addPostingRow}
            activeOpacity={0.6}
            onPress={() => setPostings((prev) => addPosting(prev))}
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
          <AmountText
            style={[
              styles.balanceAmount,
              { color: isBalanced ? theme.success : theme.error },
            ]}
          >
            {isBalanced ? `✓  ${currencySymbol}0.00` : formatRemainder(rem)}
          </AmountText>
        </View>
      </ScrollView>

      <DatePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={new Date(date)}
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
