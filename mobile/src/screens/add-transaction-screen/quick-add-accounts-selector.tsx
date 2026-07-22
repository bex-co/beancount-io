import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useReactiveVar } from "@apollo/client";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { analytics } from "@/common/analytics";
import { fontSizes } from "@/common/theme";
import { i18n } from "@/translations";
import { ledgerVar } from "@/common/vars";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import {
  SelectedAssets,
  SelectedExpenses,
  SelectedPayee,
} from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import {
  ListItem,
  ListItemSkeleton,
} from "@/screens/multi-postings-transaction/list-item";
import { useTwoPostingSuggestions } from "./hooks/use-two-posting-suggestions";
import { SuggestionChips } from "./suggestion-chips";

type QuickAddAccountsSelectorProps = {
  onChange: ({
    asset,
    expense,
    currency,
    payee,
  }: {
    asset: string;
    expense: string;
    currency: string;
    payee: string;
  }) => void;
};

export const QuickAddAccountsSelector = (
  props: QuickAddAccountsSelectorProps,
) => {
  const router = useRouter();
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        minHeight: 80,
        flexGrow: 0,
        backgroundColor: theme.white,
      },
      center: {
        justifyContent: "center",
        alignItems: "center",
      },
      errorText: {
        fontSize: fontSizes.md,
        color: theme.black60,
        textAlign: "center",
        padding: 16,
      },
      card: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.black10,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: theme.white,
      },
    }),
  );
  const { userId } = useSession();
  const { onChange } = props;
  const [refreshing, setRefreshing] = useState(false);
  const { currencies, error, loading, refetch } = useLedgerMeta(userId);
  // FROM/TO start empty — no pre-filled default. They fill from a payee
  // suggestion or an explicit picker choice.
  const [selectedAssets, setSelectedAssets] = useState<string>("");
  const [selectedExpenses, setSelectedExpenses] = useState<string>("");
  const [selectedPayee, setSelectedPayee] = useState<string>("");

  useEffect(() => {
    const currency = currencies.length > 0 ? currencies[0] : "";
    if (onChange) {
      onChange({
        asset: selectedAssets,
        expense: selectedExpenses,
        currency,
        payee: selectedPayee,
      });
    }
  });

  // Payee → FROM/TO suggestion (quick-add). Derived only from the payee's
  // two-posting (simple) transactions, so the suggestion matches quick-add's
  // own FROM→TO model and ignores multi-leg splits. Picking a payee pre-fills
  // both rows and offers runner-ups as chips. Nothing changes until a payee is
  // chosen; slow/failed queries never block the flow.
  const ledgerId = useReactiveVar(ledgerVar);
  const {
    from: fromSuggestions,
    to: toSuggestions,
    loading: suggestionsLoading,
  } = useTwoPostingSuggestions({
    ledgerId: ledgerId ?? "",
    payee: selectedPayee,
  });

  useEffect(() => {
    if (fromSuggestions.autoFill) {
      setSelectedAssets(fromSuggestions.autoFill);
    }
  }, [fromSuggestions.autoFill]);

  useEffect(() => {
    if (toSuggestions.autoFill) {
      setSelectedExpenses(toSuggestions.autoFill);
    }
  }, [toSuggestions.autoFill]);

  const handleFromChipPress = async (account: string) => {
    setSelectedAssets(account);
    await analytics.track("tap_suggestion_chip", {
      payee: selectedPayee,
      account,
      side: "from",
      source: "history",
    });
  };

  const handleToChipPress = async (account: string) => {
    setSelectedExpenses(account);
    await analytics.track("tap_suggestion_chip", {
      payee: selectedPayee,
      account,
      side: "to",
      source: "history",
    });
  };

  // Skeleton only on first load — during pull-to-refresh the current
  // selections stay visible under the RefreshControl spinner.
  const showSkeleton = loading && !selectedAssets && !selectedExpenses;

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text
          style={styles.errorText}
          onPress={async () => {
            await refetch();
          }}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            try {
              setRefreshing(true);
              await refetch();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={styles.card}>
        {showSkeleton ? (
          <>
            <ListItemSkeleton />
            <ListItemSkeleton showDivider />
            <ListItemSkeleton showDivider />
          </>
        ) : (
          <>
            <ListItem
              title={i18n.t("payee").toUpperCase()}
              content={selectedPayee}
              onPress={async () => {
                analytics.track("tap_payee_picker", {
                  originalPayee: selectedPayee,
                });
                SelectedPayee.setFn((value: string) => {
                  setSelectedPayee(value);
                });
                router.navigate({
                  pathname: "/(app)/payee-input",
                  params: {
                    payee: selectedPayee,
                    simpleOnly: "true",
                  },
                });
              }}
            />
            <ListItem
              title={i18n.t("from").toUpperCase()}
              content={selectedAssets}
              showDivider
              onPress={async () => {
                analytics.track("tap_assets_picker", {
                  originalOption: selectedAssets,
                });
                SelectedAssets.setFn((value: string) => {
                  setSelectedAssets(value);
                });
                router.push({
                  pathname: "/(app)/account-picker",
                  params: {
                    type: "assets",
                    selectedItem: selectedAssets,
                  },
                });
              }}
            />
            {(fromSuggestions.chips.length > 0 || suggestionsLoading) && (
              <SuggestionChips
                chips={fromSuggestions.chips}
                selectedAccount={selectedAssets}
                loading={suggestionsLoading}
                onSelect={handleFromChipPress}
              />
            )}
            <ListItem
              title={i18n.t("to").toUpperCase()}
              content={selectedExpenses}
              showDivider
              onPress={async () => {
                analytics.track("tap_expenses_picker", {
                  originalOption: selectedExpenses,
                });
                SelectedExpenses.setFn((value: string) => {
                  setSelectedExpenses(value);
                });
                router.push({
                  pathname: "/(app)/account-picker",
                  params: {
                    type: "expenses",
                    selectedItem: selectedExpenses,
                  },
                });
              }}
            />
            {(toSuggestions.chips.length > 0 || suggestionsLoading) && (
              <SuggestionChips
                chips={toSuggestions.chips}
                selectedAccount={selectedExpenses}
                loading={suggestionsLoading}
                onSelect={handleToChipPress}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};
