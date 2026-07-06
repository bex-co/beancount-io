import { memo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
} from "react-native";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { getFormatDate } from "@/common/format-util";
import { useAddEntriesToRemote } from "@/screens/add-transaction-screen/hooks/use-add-entries-to-remote";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListItem } from "@/screens/add-transaction-screen/list-item";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useToast, usePageView } from "@/common/hooks";
import { LedgerGuard, List, useLedgerGuard } from "@/components";

import {
  SelectedAssets,
  SelectedExpenses,
  SelectedNarration,
  SelectedPayee,
  AddTransactionCallback,
} from "@/common/globalFnFactory";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    topContainer: {
      height: 260,
      justifyContent: "center",
      alignItems: "center",
    },
    txtMoney: {
      fontSize: 60,
      color: theme.black,
    },
    txtSmallMoney: {
      fontSize: 25,
      color: theme.black,
      fontWeight: "bold",
      marginTop: Platform.OS === "ios" ? 10 : 15,
      letterSpacing: 1,
      marginLeft: 1,
    },
    moneyContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    payee: {
      fontSize: 25,
      color: theme.black,
    },
    date: {
      fontSize: 25,
      color: theme.black80,
    },
    doneButton: {
      fontWeight: "bold",
      color: theme.primary,
      fontSize: 16,
    },
  });

export const AddTransactionNextScreenComponent = () => {
  usePageView("add_transaction_next");
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const { currentMoney, currentAsset, currentExpense, currentCurrency } =
    useLocalSearchParams<{
      currentMoney: string;
      currentAsset: string;
      currentExpense: string;
      currentCurrency: string;
    }>();
  const styles = getStyles(theme);
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<string>(currentAsset);
  const [expenses, setExpenses] = useState<string>(currentExpense);
  const [payee, setPayee] = useState<string>("");
  const [date, setDate] = useState<string>(getFormatDate(new Date()));
  const [narration, setNarration] = useState<string>("");
  const { mutate, error } = useAddEntriesToRemote();

  const currencySymbol = getCurrencySymbol(currentCurrency);
  const ledgerId = useLedgerGuard();

  const addEntries = async () => {
    await analytics.track("tap_add_transaction_done", {});
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
              <Text style={styles.doneButton}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView>
        <View style={styles.topContainer}>
          <View style={styles.moneyContainer}>
            <Text style={styles.txtMoney}>
              {`${currencySymbol}${currentMoney.split(".")[0]}`}
            </Text>
            <Text style={styles.txtSmallMoney}>
              {`${currentMoney.split(".")[1]}`}
            </Text>
          </View>
          <Text style={styles.payee}>{payee}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <List>
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
          <ListItem
            title={t("to").toUpperCase()}
            content={expenses}
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
          <ListItem
            title={t("date").toUpperCase()}
            content={date}
            onPress={showDatePicker}
          />
          <ListItem
            title={t("payee").toUpperCase()}
            content={payee}
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
        </List>
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
