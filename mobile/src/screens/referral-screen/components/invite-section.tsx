import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/common/theme";
import { contentPadding, ScreenWidth, onePx } from "@/common/screen-util";
import { useTranslations } from "@/common/hooks/use-translations";
import { GiftIcon } from "@/screens/referral-screen/components/gift-icon";
import { analytics } from "@/common/analytics";
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
    section: {
      flexDirection: "row",
      height: 80,
      borderTopColor: theme.black80,
      borderTopWidth: onePx,
      borderBottomColor: theme.black60,
      borderBottomWidth: onePx,
    },
    summaryContainer: {
      width: ScreenWidth - 2 * contentPadding - 80,
      justifyContent: "center",
    },
    summary: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text01,
    },
    imageContainer: {
      height: 80,
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
        onPress={() => {
          analytics.track("tap_navigate_to_referral", {});
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
