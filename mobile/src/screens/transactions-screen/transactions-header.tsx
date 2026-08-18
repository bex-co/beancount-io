import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle } from "@/common/hooks";
import { gutter, space, useTheme } from "@/common/theme";
import { SearchBar } from "@/components/search-bar";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      backgroundColor: theme.white,
    },
    searchBar: {
      marginHorizontal: gutter,
      marginBottom: space.sm,
    },
    // Sits on the funnel's upper trailing corner, so an active filter is
    // visible without opening the sheet.
    filterDot: {
      position: "absolute",
      top: -1,
      end: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
  });

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
      <SearchBar
        style={styles.searchBar}
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={t("search")}
        right={
          <TouchableOpacity
            onPress={onOpenFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("filters")}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={theme.controlPlaceholder}
            />
            {activeFilterCount > 0 && <View style={styles.filterDot} />}
          </TouchableOpacity>
        }
      />
    </View>
  );
};
