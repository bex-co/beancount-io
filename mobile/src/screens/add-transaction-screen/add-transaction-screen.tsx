import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { amountStyle, fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { i18n } from "@/translations";
import { ScreenWidth } from "@/common/screen-util";
import { QuickAddAccountsSelector } from "@/screens/add-transaction-screen/quick-add-accounts-selector";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast, usePageView } from "@/common/hooks";

const KeypadPadding = 12;
const KeyCellWidth = (ScreenWidth - KeypadPadding * 2) / 3;
const KeyCellHeight = 62;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    containerCenter: {
      flex: 1,
      backgroundColor: theme.white,
      justifyContent: "center",
      alignItems: "center",
    },
    moneyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
    },
    txtCurrencySymbol: {
      fontSize: fontSizes.display,
      fontWeight: fontWeights.medium,
      marginTop: 12,
      marginRight: 2,
    },
    txtMoney: {
      fontSize: fontSizes.hero,
      fontWeight: fontWeights.medium,
      letterSpacing: -1,
    },
    keypad: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: KeypadPadding,
      paddingTop: 8,
      paddingBottom: 4,
    },
    keyCell: {
      width: KeyCellWidth,
      height: KeyCellHeight,
      padding: 4,
    },
    key: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 14,
    },
    keyPressed: {
      backgroundColor: theme.black10,
    },
    nextKey: {
      backgroundColor: theme.primary,
    },
    nextKeyPressed: {
      backgroundColor: theme.primaryDark,
    },
    keyLabel: {
      ...amountStyle,
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.medium,
      color: theme.black,
    },
    nextKeyLabel: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: "#fff",
    },
  });

export function AddTransactionScreen(): JSX.Element {
  usePageView("add_transaction");
  const Keys = [
    { display: "1", value: 1 },
    { display: "2", value: 2 },
    { display: "3", value: 3 },
    { display: "4", value: 4 },
    { display: "5", value: 5 },
    { display: "6", value: 6 },
    { display: "7", value: 7 },
    { display: "8", value: 8 },
    { display: "9", value: 9 },
    { display: "Del", value: 100 },
    { display: "0", value: 0 },
    { display: i18n.t("next"), value: 200 },
  ];

  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const [currentMoney, setCurrentMoney] = React.useState("0.00");
  const [keyValues, setKeyValues] = React.useState<number[]>([]);
  const router = useRouter();
  const toast = useToast();

  let currentAsset = "";
  let currentExpense = "";
  let currentPayee = "";
  const [currentCurrency, setCurrentCurrency] = React.useState("");

  const onChange = ({
    asset,
    expense,
    currency,
    payee,
  }: {
    asset: string;
    expense: string;
    currency: string;
    payee: string;
  }) => {
    currentAsset = asset;
    currentExpense = expense;
    currentPayee = payee;
    setCurrentCurrency(currency);
  };

  const getMoneyByKeyValues = (values: number[]) => {
    let money = "0.00";
    if (values.length > 0) {
      let moneyTmp = values.map((v) => String(v)).join("");
      if (moneyTmp.length === 1) {
        moneyTmp = `00${moneyTmp}`;
      }
      if (moneyTmp.length === 2) {
        moneyTmp = `0${moneyTmp}`;
      }
      money = `${moneyTmp.slice(0, moneyTmp.length - 2)}.${moneyTmp.slice(
        moneyTmp.length - 2,
      )}`;
    }
    return money;
  };

  const currencySymbol = getCurrencySymbol(currentCurrency);
  const moneyColor = currentMoney === "0.00" ? theme.black60 : theme.black;
  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.containerCenter}>
        <View style={styles.moneyRow}>
          <Text style={[styles.txtCurrencySymbol, { color: moneyColor }]}>
            {currencySymbol}
          </Text>
          <AmountText style={[styles.txtMoney, { color: moneyColor }]}>
            {currentMoney}
          </AmountText>
        </View>
      </View>
      <QuickAddAccountsSelector onChange={onChange} />
      <View style={styles.keypad}>
        {Keys.map((key) => {
          const isNext = key.display === i18n.t("next");
          return (
            <View key={key.value} style={styles.keyCell}>
              <Pressable
                style={({ pressed }) => [
                  styles.key,
                  isNext && styles.nextKey,
                  pressed &&
                    (isNext ? styles.nextKeyPressed : styles.keyPressed),
                ]}
                onPress={async () => {
                  if (key.display === "Del" && keyValues.length > 0) {
                    keyValues.pop();
                  } else if (key.value < 10) {
                    if (key.display === "0" && keyValues.length > 0) {
                      keyValues.push(0);
                    } else if (key.value > 0) {
                      keyValues.push(key.value);
                    }
                  }
                  setCurrentMoney(getMoneyByKeyValues(keyValues));
                  setKeyValues(keyValues);

                  if (isNext) {
                    if (currentMoney === "0.00") {
                      toast.showToast({
                        message: i18n.t("amountEmptyError"),
                        type: "text",
                      });
                      return;
                    }
                    await analytics.track("tap_add_transaction_next", {
                      money: currentMoney,
                    });
                    router.replace({
                      pathname: "/add-transaction-next",
                      params: {
                        currentMoney,
                        currentAsset,
                        currentExpense,
                        currentCurrency,
                        currentPayee,
                        // onRefresh,
                      },
                    });
                  }
                }}
              >
                {key.display === "Del" ? (
                  <Feather name="delete" size={22} color={theme.black} />
                ) : (
                  <Text style={isNext ? styles.nextKeyLabel : styles.keyLabel}>
                    {key.display}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
