import { memo, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import {
  fontSizes,
  fontWeights,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useTranslations } from "@/common/hooks/use-translations";
import { getFormatDate } from "@/common/format-util";
import { useAddEntriesToRemote } from "@/screens/add-transaction-screen/hooks/use-add-entries-to-remote";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListItem } from "@/screens/add-transaction-screen/list-item";
import { SuggestionChips } from "@/screens/add-transaction-screen/suggestion-chips";
import {
  usePayeeAccountSuggestions,
  type AccountTypes,
} from "@/screens/add-transaction-screen/hooks/use-payee-account-suggestions";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useToast, usePageView } from "@/common/hooks";
import { LedgerGuard, useLedgerGuard } from "@/components";

import {
  SelectedAssets,
  SelectedExpenses,
  SelectedNarration,
  SelectedPayee,
  AddTransactionCallback,
} from "@/common/globalFnFactory";

/** Keep only non-empty string arguments (drops undefined option names). */
function pickDefined(...values: (string | undefined)[]): string[] {
  return values.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    topContainer: {
      paddingTop: 36,
      paddingBottom: 28,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    txtMoney: {
      fontSize: fontSizes.hero,
      fontWeight: fontWeights.medium,
      letterSpacing: -1,
      color: theme.black,
    },
    txtSmallMoney: {
      fontSize: fontSizes.xxl,
      color: theme.black,
      fontWeight: fontWeights.medium,
      marginTop: 9,
      letterSpacing: 0.5,
      marginLeft: 1,
    },
    moneyContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    payee: {
      marginTop: 8,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    date: {
      marginTop: 4,
      fontSize: fontSizes.md,
      color: theme.black60,
    },
    card: {
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    doneButton: headerActionStyle(theme),
  });

export const AddTransactionNextScreenComponent = () => {
  usePageView("add_transaction_next");
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const {
    currentMoney,
    currentAsset,
    currentExpense,
    currentCurrency,
    currentPayee,
  } = useLocalSearchParams<{
    currentMoney: string;
    currentAsset: string;
    currentExpense: string;
    currentCurrency: string;
    currentPayee?: string;
  }>();
  const styles = getStyles(theme);
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<string>(currentAsset);
  const [expenses, setExpenses] = useState<string>(currentExpense);
  // Seeded from the quick-add screen so a payee chosen early drives the
  // account auto-suggestion (m11) the moment this review screen mounts.
  const [payee, setPayee] = useState<string>(currentPayee ?? "");
  const [date, setDate] = useState<string>(getFormatDate(new Date()));
  const [narration, setNarration] = useState<string>("");
  const { mutate, error } = useAddEntriesToRemote();

  const currencySymbol = getCurrencySymbol(currentCurrency);
  const ledgerId = useLedgerGuard();
  const { userId } = useSession();
  const { data: ledgerMetaData } = useLedgerMeta(userId, ledgerId);

  const accountTypes = useMemo<AccountTypes>(
    () => ({
      fromPrefixes: pickDefined(
        ledgerMetaData?.options.name_assets,
        ledgerMetaData?.options.name_liabilities,
      ),
      toPrefixes: pickDefined(ledgerMetaData?.options.name_expenses),
    }),
    [ledgerMetaData],
  );

  const {
    from: fromSuggestions,
    to: toSuggestions,
    source: suggestionSource,
    loading: suggestionsLoading,
  } = usePayeeAccountSuggestions({
    ledgerId,
    payee,
    amount: currentMoney,
    date,
    narration,
    accountTypes,
  });

  // Auto-fill each side from the top history match. Re-runs only when the
  // target changes, so a manual pick or chip tap afterwards is preserved.
  useEffect(() => {
    if (fromSuggestions.autoFill) {
      setAssets(fromSuggestions.autoFill);
      analytics.track("payee_account_autofill", {
        payee,
        account: fromSuggestions.autoFill,
        side: "from",
        source: suggestionSource ?? "history",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSuggestions.autoFill]);

  useEffect(() => {
    if (toSuggestions.autoFill) {
      setExpenses(toSuggestions.autoFill);
      analytics.track("payee_account_autofill", {
        payee,
        account: toSuggestions.autoFill,
        side: "to",
        source: suggestionSource ?? "history",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toSuggestions.autoFill]);

  useEffect(() => {
    const chipCount = fromSuggestions.chips.length + toSuggestions.chips.length;
    if (chipCount > 0 && suggestionSource) {
      analytics.track("suggestions_shown", {
        payee,
        source: suggestionSource,
        chipCount,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    suggestionSource,
    fromSuggestions.chips.length,
    toSuggestions.chips.length,
  ]);

  const handleFromChipPress = async (account: string) => {
    setAssets(account);
    await analytics.track("tap_suggestion_chip", {
      payee,
      account,
      side: "from",
      source: suggestionSource ?? "history",
    });
  };

  const handleToChipPress = async (account: string) => {
    setExpenses(account);
    await analytics.track("tap_suggestion_chip", {
      payee,
      account,
      side: "to",
      source: suggestionSource ?? "history",
    });
  };

  const addEntries = async () => {
    await analytics.track("tap_add_transaction_done", {});
    // FROM/TO are no longer pre-filled on quick-add, so guard against an empty
    // selection before submitting.
    if (!assets.trim() || !expenses.trim()) {
      toast.showToast({
        message: t("accountEmptyError"),
        type: "text",
      });
      return;
    }
    try {
      const cancel = toast.showToast({
        message: t("saving"),
        type: "loading",
      });
      const params = [
        {
          date,
          flag: "*",
          narration,
          payee,
          type: "Transaction",
          meta: {},
          postings: [
            {
              amount: `-${currentMoney} ${currentCurrency}`,
              account: assets,
            },
            {
              amount: `${currentMoney} ${currentCurrency}`,
              account: expenses,
            },
          ],
        },
      ];

      await mutate({ variables: { entriesInput: params, ledgerId } });
      // await new Promise(resolve => setTimeout(resolve, 1000));

      cancel();

      if (!error) {
        toast.showToast({
          message: t("saveSuccess"),
          type: "success",
        });
        setTimeout(async () => {
          const callback = AddTransactionCallback.getFn();
          if (callback) {
            await callback();
            AddTransactionCallback.deleteFn();
          }
          router.back();
        }, 2000);
      } else {
        console.error("failed to add transaction", error);
        toast.showToast({
          message: t("saveFailed"),
          type: "error",
        });
      }
    } catch (e) {
      toast.showToast({
        message: t("saveFailed"),
        type: "error",
      });
      // tslint:disable-next-line
      console.error(`failed to create target profile: ${e}`);
    }
  };

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setDate(getFormatDate(date));
    hideDatePicker();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("addTransaction"),
          headerRight: () => (
            <Pressable onPress={addEntries} hitSlop={10}>
              <Text style={styles.doneButton}>{t("done")}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView>
        <View style={styles.topContainer}>
          <View style={styles.moneyContainer}>
            <AmountText style={styles.txtMoney}>
              {`${currencySymbol}${currentMoney.split(".")[0]}`}
            </AmountText>
            <AmountText style={styles.txtSmallMoney}>
              {`${currentMoney.split(".")[1]}`}
            </AmountText>
          </View>
          {payee ? <Text style={styles.payee}>{payee}</Text> : null}
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.card}>
          <ListItem
            title={t("from").toUpperCase()}
            content={assets}
            onPress={async () => {
              await analytics.track("tap_assets_picker", {
                originalOption: assets,
              });
              SelectedAssets.setFn((value: string) => {
                setAssets(value);
              });
              router.push({
                pathname: "/(app)/account-picker",
                params: {
                  type: "assets",
                  selectedItem: assets,
                },
              });
            }}
          />
          {(fromSuggestions.chips.length > 0 || suggestionsLoading) && (
            <SuggestionChips
              chips={fromSuggestions.chips}
              selectedAccount={assets}
              loading={suggestionsLoading}
              onSelect={handleFromChipPress}
            />
          )}
          <ListItem
            title={t("to").toUpperCase()}
            content={expenses}
            showDivider
            onPress={async () => {
              analytics.track("tap_expenses_picker", {
                originalOption: expenses,
              });
              SelectedExpenses.setFn((value: string) => {
                setExpenses(value);
              });
              router.push({
                pathname: "/(app)/account-picker",
                params: {
                  type: "expenses",
                  selectedItem: expenses,
                },
              });
            }}
          />
          {(toSuggestions.chips.length > 0 || suggestionsLoading) && (
            <SuggestionChips
              chips={toSuggestions.chips}
              selectedAccount={expenses}
              loading={suggestionsLoading}
              onSelect={handleToChipPress}
            />
          )}
          <ListItem
            title={t("date").toUpperCase()}
            content={date}
            showDivider
            onPress={showDatePicker}
          />
          <ListItem
            title={t("payee").toUpperCase()}
            content={payee}
            showDivider
            onPress={() => {
              SelectedPayee.setFn((value: string) => {
                setPayee(value);
              });
              router.navigate({
                pathname: "/(app)/payee-input",
                params: {
                  payee,
                },
              });
            }}
          />
          <ListItem
            title={t("narration").toUpperCase()}
            content={narration}
            showDivider
            onPress={() => {
              SelectedNarration.setFn((value: string) => {
                setNarration(value);
              });
              router.navigate({
                pathname: "/(app)/narration-input",
                params: {
                  narration,
                },
              });
            }}
          />
        </View>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={new Date(date)}
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export const AddTransactionNextScreen = memo(function () {
  return (
    <LedgerGuard>
      <AddTransactionNextScreenComponent />
    </LedgerGuard>
  );
});

AddTransactionNextScreen.displayName = "AddTransactionNextScreen";
