import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle } from "@/common/hooks";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerDrawerButton } from "@/components/ledger-drawer";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    navTitle: {
      flex: 1,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
    },
    // Same width as navRight so the centered title stays centered.
    navLeft: {
      flexDirection: "row",
      alignItems: "center",
      width: 64,
      justifyContent: "flex-start",
    },
    navRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      width: 64,
      justifyContent: "flex-end",
    },
    header: {
      backgroundColor: theme.white,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: theme.black10,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 36,
    },
    searchInput: {
      flex: 1,
      marginLeft: 6,
      fontSize: fontSizes.lg,
      color: theme.black90,
    },
    filterButton: {
      paddingLeft: 6,
    },
    // Sits on the funnel's upper-right corner, so an active filter is visible
    // without opening the sheet.
    filterDot: {
      position: "absolute",
      top: -1,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
  });

interface TransactionsNavBarProps {
  onAdd: () => void;
}

export const TransactionsNavBar = ({ onAdd }: TransactionsNavBarProps) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  return (
    <View style={styles.navBar}>
      <View style={styles.navLeft}>
        <LedgerDrawerButton />
      </View>
      <Text style={styles.navTitle}>{t("transactions")}</Text>
      <View style={styles.navRight}>
        <TouchableOpacity onPress={onAdd}>
          <Ionicons name="add" size={26} color={theme.black90} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface TransactionsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  /** Number of active filter groups; anything above zero shows the dot. */
  activeFilterCount: number;
}

/**
 * List header for the transactions tab: a search box with a filter button.
 * Status, date range and account live in the filter modal; directive-level
 * filters (Open/Close/Balance/…) stay on the journal screen, since this list is
 * pinned to transactions.
 */
export const TransactionsHeader = ({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  activeFilterCount,
}: TransactionsHeaderProps) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  return (
    <View style={styles.header}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.black60} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search")}
          placeholderTextColor={theme.black60}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onOpenFilters}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("filters")}
        >
          <Ionicons name="options-outline" size={16} color={theme.black60} />
          {activeFilterCount > 0 && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};
