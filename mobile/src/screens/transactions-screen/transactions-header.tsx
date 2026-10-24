import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle } from "@/common/hooks";
import { gutter, space, useTheme } from "@/common/theme";
import { iconActionSize } from "@/common/theme/spacing";
import { SearchBar } from "@/components/search-bar";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";

const FILTER_ICON_SIZE = 16;
const FILTER_HIT_SLOP = {
  top: (iconActionSize - FILTER_ICON_SIZE) / 2,
  bottom: (iconActionSize - FILTER_ICON_SIZE) / 2,
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      backgroundColor: theme.white,
    },
    searchBar: {
      marginHorizontal: gutter,
      marginBottom: space.sm,
    },
    // 44 pt wide, taking back the field's trailing padding so the funnel sits
    // where it did; the height is slop (w21/999).
    filterButton: {
      minWidth: iconActionSize,
      marginEnd: -space.md,
      alignItems: "center",
      justifyContent: "center",
    },
    // Sits on the funnel's upper trailing corner, so an active filter is
    // visible without opening the sheet. The funnel is centred in the 44 pt
    // box, 14 pt in from its end.
    filterDot: {
      position: "absolute",
      top: -1,
      end: (iconActionSize - FILTER_ICON_SIZE) / 2 - 2,
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
            style={styles.filterButton}
            onPress={onOpenFilters}
            hitSlop={FILTER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t("filters")}
            // The dot is the only cue that the list is filtered; say it too
            // (w21/305).
            accessibilityValue={
              activeFilterCount > 0
                ? { text: t("filtersActive", { count: activeFilterCount }) }
                : undefined
            }
          >
            <Ionicons
              name="options-outline"
              size={FILTER_ICON_SIZE}
              color={theme.controlPlaceholder}
            />
            {activeFilterCount > 0 && <View style={styles.filterDot} />}
          </TouchableOpacity>
        }
      />
    </View>
  );
};
