import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useListLedgersQuery } from "@/generated-graphql/graphql";
import { useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { Ionicons } from "@expo/vector-icons";
import { analytics } from "@/common/analytics";
import { ledgerVar } from "@/common/vars";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    list: {
      flex: 1,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black10,
    },
    listItemContent: {
      flex: 1,
      marginRight: 12,
    },
    listItemName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.black,
      marginBottom: 4,
    },
    listItemDescription: {
      fontSize: 14,
      color: theme.black60,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    emptyText: {
      fontSize: 16,
      color: theme.black60,
      textAlign: "center",
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    errorText: {
      fontSize: 16,
      color: theme.black60,
      textAlign: "center",
    },
  });

export function LedgerSelectionScreen() {
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  usePageView("ledger_selection");

  const { data, loading, error } = useListLedgersQuery();

  const ledgers = useMemo(() => data?.listLedgers || [], [data?.listLedgers]);

  const handleSelectLedger = async (ledgerId: string) => {
    await analytics.track("select_ledger", { ledgerId });
    ledgerVar(ledgerId);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.black40}
          />
          <Text style={styles.errorText}>
            {error.message || "Failed to load ledgers"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ledgers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={64} color={theme.black40} />
          <Text style={styles.emptyText}>No ledgers available</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={ledgers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = item.id === ledgerVar();
            return (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleSelectLedger(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{item.fullName}</Text>
                  {item.description && (
                    <Text style={styles.listItemDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={theme.primary}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.black40}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
