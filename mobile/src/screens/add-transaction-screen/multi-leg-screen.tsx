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
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
  SelectedLegAccount,
  SelectedNarration,
  SelectedPayee,
} from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useAddEntriesToRemote } from "@/screens/add-transaction-screen/hooks/use-add-entries-to-remote";
import { ListItem } from "@/screens/add-transaction-screen/list-item";
import {
  type Leg,
  addLeg,
  buildEntryInput,
  createInitialLegs,
  makeLeg,
  removeLeg,
  remainder,
  toggleLastLegAuto,
  updateLegAccount,
  updateLegAmount,
  validateLegs,
} from "@/screens/add-transaction-screen/multi-leg-utils";

const SIGN_TOGGLE_SIZE = 28;
const LEG_ROW_PADDING_V = 14;

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
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    legRow: {
      backgroundColor: theme.white,
      paddingVertical: LEG_ROW_PADDING_V,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    legRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    legAccountWrap: {
      flex: 1,
    },
    legAccount: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    legAccountPlaceholder: {
      color: theme.black40,
      fontWeight: fontWeights.regular,
    },
    legAmountWrap: {
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
    legAmountInput: {
      ...amountStyle,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      textAlign: "right",
      padding: 0,
      minWidth: 88,
    },
    legAutoTag: {
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
    addLegRow: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addLegText: {
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
    skeletonLegRow: {
      paddingVertical: LEG_ROW_PADDING_V,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      // Real leg rows always contain the sign-toggle circle (or its
      // placeholder); match it so rows don't grow when data lands.
      minHeight: SIGN_TOGGLE_SIZE + 2 * LEG_ROW_PADDING_V,
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

const LegRow = ({
  leg,
  index,
  isLast,
  canRemove,
  onPickAccount,
  onChangeAmount,
  onToggleAuto,
  onRemove,
}: {
  leg: Leg;
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

  const isNegative = leg.amountInput.startsWith("-");
  const absValue = isNegative ? leg.amountInput.slice(1) : leg.amountInput;
  const hasAmount = leg.amountCents !== 0;
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
      <View style={[styles.legRow, index > 0 && styles.legRowDivider]}>
        <TouchableOpacity
          style={styles.legAccountWrap}
          activeOpacity={0.6}
          onPress={onPickAccount}
        >
          <Text
            style={[
              styles.legAccount,
              !leg.account && styles.legAccountPlaceholder,
            ]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {leg.account || t("legAccount")}
          </Text>
        </TouchableOpacity>

        <View style={styles.legAmountWrap}>
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
            style={[styles.legAmountInput, { color: amountColor }]}
            maxFontSizeMultiplier={amountMaxFontSizeMultiplier}
            value={absValue}
            onChangeText={handleAbsValueChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.black60}
            selectTextOnFocus
          />
          {isLast && leg.isAuto ? (
            <TouchableOpacity onPress={onToggleAuto} hitSlop={8}>
              <Text style={styles.legAutoTag}>{t("autoLabel")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
};

export const MultiLegScreenComponent = () => {
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

  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const [legs, setLegs] = useState<Leg[]>([
    makeLeg({ isAuto: false }),
    makeLeg({ isAuto: true }),
  ]);
  const [seeded, setSeeded] = useState(false);
  const [date, setDate] = useState(getFormatDate(new Date()));
  const [payee, setPayee] = useState("");
  const [narration, setNarration] = useState("");
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (!seeded && !metaLoading && assets.length > 0) {
      const secondAccount =
        expenses.length > 0
          ? expenses[0]
          : assets.length > 1
            ? assets[1]
            : assets[0];
      setLegs(createInitialLegs(assets[0], secondAccount));
      setSeeded(true);
    }
  }, [seeded, metaLoading, assets]);

  const rem = remainder(legs);
  const isBalanced = rem === 0;
  const validationError = validateLegs(legs);
  const canSave = validationError === null;

  const handleSave = async () => {
    if (!canSave) {
      let msg = t("multiLegInvalidBalance");
      if (validationError === "missingAccount")
        msg = t("multiLegMissingAccount");
      else if (validationError === "zeroAmount") msg = t("multiLegZeroAmount");
      toast.showToast({ message: msg, type: "error" });
      return;
    }

    await analytics.track("tap_split_done", { legCount: legs.length });

    try {
      const cancel = toast.showToast({ message: t("saving"), type: "loading" });
      const entry = buildEntryInput(legs, { date, payee, narration, currency });
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

  const pickAccountForLeg = (index: number) => {
    SelectedLegAccount.setFn((account: string) => {
      setLegs((prev) => updateLegAccount(prev, index, account));
    });
    router.push({
      pathname: "/(app)/account-picker",
      params: { type: "leg" },
    });
  };

  const formatRemainder = (cents: number) => {
    const abs = Math.abs(cents);
    const sign = cents < 0 ? "-" : cents > 0 ? "+" : "";
    return `${sign}${currencySymbol}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("multiLegTitle"),
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
      <ScrollView keyboardShouldPersistTaps="handled">
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
                  style={[styles.skeletonLegRow, i > 0 && styles.legRowDivider]}
                >
                  <LoadingTile style={styles.skeletonAccountTile} width={w} />
                  <LoadingTile style={styles.skeletonAmountTile} />
                  <View style={{ width: 30 }} />
                </View>
              ))}
            </>
          ) : (
            legs.map((leg, i) => (
              <LegRow
                key={leg.id}
                leg={leg}
                index={i}
                isLast={i === legs.length - 1}
                canRemove={legs.length > 2}
                onPickAccount={() => pickAccountForLeg(i)}
                onChangeAmount={(input) =>
                  setLegs((prev) => updateLegAmount(prev, i, input))
                }
                onToggleAuto={() => setLegs((prev) => toggleLastLegAuto(prev))}
                onRemove={() => setLegs((prev) => removeLeg(prev, i))}
              />
            ))
          )}
          <TouchableOpacity
            style={styles.addLegRow}
            activeOpacity={0.6}
            onPress={() => setLegs((prev) => addLeg(prev))}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={theme.primary}
            />
            <Text style={styles.addLegText}>{t("addLeg")}</Text>
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

      <DateTimePickerModal
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

export const MultiLegScreen = memo(function () {
  return (
    <LedgerGuard>
      <MultiLegScreenComponent />
    </LedgerGuard>
  );
});

MultiLegScreen.displayName = "MultiLegScreen";
