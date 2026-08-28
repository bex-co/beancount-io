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
import { useAddEntriesToRemote } from "@/screens/multi-postings-transaction/hooks/use-add-entries-to-remote";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
import { getCurrencySymbol } from "@/common/currency-util";
import { ColorTheme } from "@/types/theme-props";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListItem } from "@/screens/multi-postings-transaction/list-item";
import { SuggestionChips } from "@/screens/add-transaction-screen/suggestion-chips";
import {
  usePayeeAccountSuggestions,
  type AccountTypes,
} from "@/screens/add-transaction-screen/hooks/use-payee-account-suggestions";
import { useToast } from "@/common/hooks";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { DatePickerModal, LedgerGuard, useLedgerGuard } from "@/components";

import {
  SelectedNarration,
  SelectedPayee,
  runAddTransactionCallback,
} from "@/common/globalFnFactory";
import { pushAccountPicker } from "@/screens/account-picker-screen/push-account-picker";

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
      marginStart: 1,
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
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    doneButton: headerActionStyle(theme),
  });

export const AddTransactionNextScreenComponent = () => {
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
  const confirmWrite = useLedgerWrite();
  const [assets, setAssets] = useState<string>(currentAsset);
  const [expenses, setExpenses] = useState<string>(currentExpense);
  // Seeded from the quick-add screen so a payee chosen early drives the
  // account auto-suggestion (m11) the moment this review screen mounts.
  const [payee, setPayee] = useState<string>(currentPayee ?? "");
  const [date, setDate] = useState<string>(getFormatDate(new Date()));
  const [narration, setNarration] = useState<string>("");
  const { mutate } = useAddEntriesToRemote();

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSuggestions.autoFill]);

  useEffect(() => {
    if (toSuggestions.autoFill) {
      setExpenses(toSuggestions.autoFill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toSuggestions.autoFill]);

  const handleFromChipPress = (account: string) => {
    setAssets(account);
  };

  const handleToChipPress = (account: string) => {
    setExpenses(account);
  };

  const addEntries = async () => {
    // FROM/TO are no longer pre-filled on quick-add, so guard against an empty
    // selection before submitting.
    if (!assets.trim() || !expenses.trim()) {
      toast.showToast({
        message: t("accountEmptyError"),
        type: "text",
      });
      return;
    }
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

    const outcome = await confirmWrite({
      perform: () => mutate({ variables: { entriesInput: params, ledgerId } }),
      // `addEntries` reports rejection in its payload, not by throwing.
      didSucceed: (result) => Boolean(result.data?.addEntries?.success),
      loadingMessage: t("saving"),
      successMessage: t("saveSuccess"),
      failureMessage: t("saveFailed"),
      afterSuccess: runAddTransactionCallback,
    });

    if (!outcome.ok && outcome.error) {
      console.error(`failed to add transaction: ${outcome.error}`);
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
            {currencySymbol === "" && (
              <AmountText style={styles.txtSmallMoney}>
                {` ${currentCurrency}`}
              </AmountText>
            )}
          </View>
          {payee ? <Text style={styles.payee}>{payee}</Text> : null}
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.card}>
          <ListItem
            title={t("from").toUpperCase()}
            content={assets}
            onPress={() => {
              pushAccountPicker(router, {
                type: "assets",
                current: assets,
                onSelect: setAssets,
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
            onPress={() => {
              pushAccountPicker(router, {
                type: "expenses",
                current: expenses,
                onSelect: setExpenses,
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
        <DatePickerModal
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
