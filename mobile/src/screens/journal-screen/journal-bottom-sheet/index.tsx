import React, { useCallback } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useThemeStyle } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { JournalDirectiveType } from "@/screens/transactions-screen/types";
import { EntryContext } from "@/screens/transactions-screen/entry-context";

export const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    backgroundStyle: {
      backgroundColor: theme.white,
    },
    overlayStyle: {
      backgroundColor: theme.overlay,
    },
  });

interface JournalBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  entry: JournalDirectiveType | null;
  ledgerId: string;
}

/**
 * Bottom sheet component for displaying journal entry details (read-only)
 * Shows entry location, balances, and source code
 */
export const JournalBottomSheet: React.FC<JournalBottomSheetProps> = ({
  bottomSheetRef,
  entry,
  ledgerId,
}) => {
  const styles = useThemeStyle(getStyles);
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        style={styles.overlayStyle}
        onPress={() => bottomSheetRef.current?.close()}
      />
    ),
    [bottomSheetRef, styles.overlayStyle],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["50%", "80%"]}
      enablePanDownToClose
      enableDynamicSizing={false}
      backgroundStyle={styles.backgroundStyle}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <EntryContext entry={entry} ledgerId={ledgerId} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};
