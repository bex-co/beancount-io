import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { fontSizes, fontWeights } from "@/common/theme";
import type { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    stateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    backLink: {
      marginTop: 16,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.primary,
      textAlign: "center",
    },
  });

/**
 * A retained detail route that belongs to a ledger which is no longer
 * selected (see `common/route-ledger`). Rendered *instead of* the screen body,
 * so nothing from the old ledger is shown or queried under the new one; Back
 * stays usable.
 */
export const RouteLedgerUnavailable = ({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element => {
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const router = useRouter();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen options={{ title }} />
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{message}</Text>
        <Text
          style={styles.backLink}
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          {t("back")}
        </Text>
      </View>
    </SafeAreaView>
  );
};
