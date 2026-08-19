import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { fontSizes, fontWeights, gutter, space } from "@/common/theme";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    // The background is the whole point of this screen's existence as a themed
    // component: without it the view is transparent, the platform paints black
    // under it in dark mode, and the default `Text` color is black too — which
    // is how an unmatched route came to read as an unrecoverable black screen
    // rather than as a message.
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: gutter,
    },
    title: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      textAlign: "center",
    },
    body: {
      marginTop: space.xs,
      marginBottom: space.lg,
      fontSize: fontSizes.md,
      color: theme.black80,
      textAlign: "center",
    },
    button: {
      paddingHorizontal: space.lg,
    },
  });

/**
 * Where a link that matches no route lands.
 *
 * Reached by a typo in a deep link, a stale universal link, or a QA script
 * driving a plausible-but-wrong path like `/(app)/(tabs)/index` — `index` is
 * how the file is named, not how the route is addressed, so it resolves to
 * nothing. Expo Router already routed all of those here; what was missing was
 * anything visible on the screen once they arrived.
 *
 * `replace` rather than `push`: the route that got here matched nothing, so
 * there is no sensible thing behind it to go back to. Home is the destination
 * for both states — signed out, `(app)/_layout` redirects on to Welcome.
 */
export default function NotFoundScreen() {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("notFoundTitle")}</Text>
        <Text style={styles.body}>{t("notFoundBody")}</Text>
        <Button style={styles.button} onPress={() => router.replace("/")}>
          {t("notFoundGoHome")}
        </Button>
      </View>
    </SafeAreaView>
  );
}
