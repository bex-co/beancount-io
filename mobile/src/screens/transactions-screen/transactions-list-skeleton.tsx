import { StyleSheet, View } from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { LoadingTile } from "@/components/loading-tile";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      // Loading states carry their own background, or the list flashes the
      // wrong color on the first frame in dark mode.
      backgroundColor: theme.white,
    },
    // Mirrors DateSectionHeader: same band color and vertical padding.
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: theme.black10,
    },
    sectionHeaderTile: {
      height: 13,
      width: 132,
    },
    // Mirrors EntryRow: 40px icon + 12px vertical padding on each side.
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      marginRight: 12,
    },
    nameWrap: {
      flex: 1,
    },
    amountTile: {
      height: 14,
      width: 68,
      marginLeft: 8,
    },
  });

// Varied widths so the skeleton reads as content rather than stripes.
const ROW_WIDTHS = ["62%", "78%", "45%", "70%", "55%", "84%"] as const;
const ROWS_PER_SECTION = 3;

export const TransactionsListSkeleton = () => {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.container}>
      {ROW_WIDTHS.map((width, index) => (
        <View key={width + index}>
          {index % ROWS_PER_SECTION === 0 && (
            <View style={styles.sectionHeader}>
              <LoadingTile style={styles.sectionHeaderTile} />
            </View>
          )}
          <View style={styles.row}>
            <LoadingTile style={styles.iconTile} />
            <View style={styles.nameWrap}>
              <LoadingTile height={16} style={{ width }} />
            </View>
            <LoadingTile style={styles.amountTile} />
          </View>
        </View>
      ))}
    </View>
  );
};
