import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/common/theme";
import { contentPadding, onePx } from "@/common/screen-util";
import { useTranslations } from "@/common/hooks/use-translations";
import { GiftIcon } from "@/screens/referral-screen/components/gift-icon";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: contentPadding,
      backgroundColor: theme.white,
      marginVertical: contentPadding,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 0.5 * contentPadding,
      color: theme.text01,
    },
    // `minHeight`, not `height`: the summary is a translated sentence, and a
    // fixed 80pt box clipped it in Spanish and at larger OS text sizes. The row
    // now grows with its copy, and the padding keeps the one-line case looking
    // the way the fixed height did.
    section: {
      flexDirection: "row",
      minHeight: 80,
      paddingVertical: 0.75 * contentPadding,
      borderTopColor: theme.black80,
      borderTopWidth: onePx,
      borderBottomColor: theme.black60,
      borderBottomWidth: onePx,
    },
    // `flex: 1` rather than a width computed from `ScreenWidth`: Yoga already
    // knows what is left beside the 80pt gift icon, and the computed figure
    // ignored the real padding as well as any wrapping the copy needs.
    summaryContainer: {
      flex: 1,
      justifyContent: "center",
    },
    summary: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text01,
    },
    // No fixed height — it stretches to whatever the copy makes the row, so the
    // 50x52 icon stays centred beside one line or three.
    imageContainer: {
      width: 80,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export function InviteSection(): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const router = useRouter();
  const { t } = useTranslations();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("inviteFriends")}</Text>
      <TouchableOpacity
        style={styles.section}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t("inviteFriends")}
        onPress={() => {
          router.navigate("/(app)/referral");
        }}
      >
        <View style={styles.summaryContainer}>
          <Text style={styles.summary}>{t("inviteSummary")}</Text>
        </View>
        <View style={styles.imageContainer}>
          <GiftIcon />
        </View>
      </TouchableOpacity>
    </View>
  );
}
