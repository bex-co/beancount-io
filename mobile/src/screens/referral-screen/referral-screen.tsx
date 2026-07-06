import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Share,
  Platform,
} from "react-native";
import { Button } from "@/components";
import * as Clipboard from "expo-clipboard";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { CommonMargin } from "@/common/common-margin";
import { ReferralGiftIcon } from "@/screens/referral-screen/components/referral-gift-icon";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle, useToast, usePageView } from "@/common/hooks";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      flex: 1,
    },
    body: {
      margin: contentPadding,
      flex: 1,
      alignItems: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text01,
    },
    summary: {
      fontSize: 16,
      lineHeight: 26,
      textAlign: "center",
      color: theme.black80,
    },
    shareLinkContainer: {
      height: 48,
      width: ScreenWidth - 2 * contentPadding,
      borderColor: theme.black40,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    shareLink: {
      marginHorizontal: contentPadding,
      fontSize: 16,
      color: theme.text01,
      flex: 1,
    },
    copyBtn: {
      height: 48,
      paddingHorizontal: contentPadding,
      justifyContent: "center",
      alignItems: "center",
    },
    copy: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.primary,
    },
    shareBtn: {
      // backgroundColor: theme.white,
      width: ScreenWidth - 2 * contentPadding,
    },
    share: {
      fontWeight: "bold",
      color: theme.primary,
      fontSize: 16,
    },
  });

export const ReferralScreen = () => {
  usePageView("referral");
  const { userId } = useSession();
  const toast = useToast();
  const { t } = useTranslations();
  const shareLink = `beancount.io/sign-up/?src=${Platform.OS}&by=${userId}`;
  const styles = useThemeStyle(getStyles);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <CommonMargin />
        <CommonMargin />
        <ReferralGiftIcon />
        <CommonMargin />
        <Text style={styles.title}>{t("rewardSummary")}</Text>
        <CommonMargin />
        <Text style={styles.summary}>{t("rewardDetail")}</Text>
        <CommonMargin />
        <CommonMargin />
        <View style={styles.shareLinkContainer}>
          <Text numberOfLines={1} style={styles.shareLink}>
            {shareLink}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={async () => {
              await Clipboard.setStringAsync(shareLink);
              toast.showToast({
                message: t("copied"),
                type: "text",
              });
              await analytics.track("tap_share_link_copy", { shareLink });
            }}
          >
            <Text style={styles.copy}>{t("copy")}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}></View>
        <CommonMargin />
        <Button
          style={styles.shareBtn}
          type="outline"
          onPress={async () => {
            await analytics.track("tap_share_link_share", { shareLink });
            Share.share({
              message: `${t("recommend")} ${shareLink}`,
            })
              .then((result) => {
                if (result.action === Share.sharedAction) {
                  if (result.activityType) {
                    // shared with activity type of result.activityType
                  } else {
                    // shared
                  }
                } else if (result.action === Share.dismissedAction) {
                  // dismissed
                }
              })
              .catch((_) => {
                toast.showToast({
                  message: t("shareError"),
                  type: "error",
                });
              });
          }}
        >
          <Text style={styles.share}>{t("share")}</Text>
        </Button>
        <CommonMargin />
      </View>
    </SafeAreaView>
  );
};
