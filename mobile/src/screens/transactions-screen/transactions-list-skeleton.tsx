import { StyleSheet, View, useWindowDimensions } from "react-native";
import { prefersStackedLayout } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { FadeOutView } from "@/components/crossfade";
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
    // Same restack as EntryRow at accessibility text sizes, so the list does
    // not jump when the rows replace the skeleton.
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    stackedMain: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      marginEnd: 12,
    },
    nameWrap: {
      flex: 1,
    },
    // Rows with a narration carry a second line; alternate rows mirror one.
    secondaryTile: {
      width: "40%",
      marginTop: 4,
    },
    amountTile: {
      height: 14,
      width: 68,
      marginStart: 8,
    },
    amountTileStacked: {
      marginStart: 0,
      marginTop: 6,
    },
  });

// Varied widths so the skeleton reads as content rather than stripes.
const ROW_WIDTHS = ["62%", "78%", "45%", "70%", "55%", "84%"] as const;
const ROWS_PER_SECTION = 3;

export const TransactionsListSkeleton = () => {
  const styles = useThemeStyle(getStyles);
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  return (
    // Fades out over the rows that replace it: the list renders those cells
    // itself, so there is no loaded branch to fade in instead.
    <FadeOutView style={styles.container}>
      {ROW_WIDTHS.map((width, index) => (
        <View key={width + index}>
          {index % ROWS_PER_SECTION === 0 && (
            <View style={styles.sectionHeader}>
              <LoadingTile style={styles.sectionHeaderTile} />
            </View>
          )}
          <View style={[styles.row, stacked && styles.rowStacked]}>
            <View style={stacked ? styles.stackedMain : styles.row}>
              <LoadingTile style={styles.iconTile} />
              <View style={styles.nameWrap}>
                <LoadingTile height={16} style={{ width }} />
                {index % 2 === 0 && (
                  <LoadingTile height={12} style={styles.secondaryTile} />
                )}
              </View>
            </View>
            <LoadingTile
              style={StyleSheet.flatten([
                styles.amountTile,
                stacked && styles.amountTileStacked,
              ])}
            />
          </View>
        </View>
      ))}
    </FadeOutView>
  );
};
