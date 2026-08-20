import { StyleSheet, View } from "react-native";
import {
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  space,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { FadeOutView } from "@/components/crossfade";
import { LoadingTile } from "@/components/loading-tile";
import { SEARCH_BAR_HEIGHT, SEARCH_BAR_RADIUS } from "@/components/search-bar";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      // Loading states carry their own background, or the list flashes the
      // wrong color on the first frame in dark mode.
      backgroundColor: theme.white,
    },
    searchSkeleton: {
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.sm,
      height: SEARCH_BAR_HEIGHT,
      borderRadius: SEARCH_BAR_RADIUS,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      marginEnd: 12,
    },
    nameWrap: {
      flex: 1,
      marginEnd: space.sm,
    },
    // name lineHeight 22 + count lineHeight 18 + 2pt gap ≈ 42; tiles +
    // vertical margins fill the same box so the list doesn't shift a pixel.
    nameTile: {
      height: 14,
      borderRadius: 7,
      marginVertical: 4,
    },
    countTile: {
      height: 10,
      borderRadius: 5,
      marginVertical: 4,
      width: "42%",
    },
    dateTile: {
      height: 12,
      width: 72,
      borderRadius: 6,
    },
  });

// Varied widths so the skeleton reads as content rather than stripes.
const ROW_WIDTHS = [
  "62%",
  "78%",
  "45%",
  "70%",
  "55%",
  "84%",
  "58%",
  "73%",
] as const;

export function MerchantsListSkeleton() {
  const styles = useThemeStyle(getStyles);

  return (
    <FadeOutView style={styles.container}>
      <LoadingTile style={styles.searchSkeleton} />
      {ROW_WIDTHS.map((width, index) => (
        <View key={`${width}-${index}`} style={styles.row}>
          <LoadingTile style={styles.iconTile} />
          <View style={styles.nameWrap}>
            <LoadingTile style={{ ...styles.nameTile, width }} />
            <LoadingTile style={styles.countTile} />
          </View>
          <LoadingTile style={styles.dateTile} />
        </View>
      ))}
    </FadeOutView>
  );
}
