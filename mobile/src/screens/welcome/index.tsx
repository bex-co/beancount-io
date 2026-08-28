import { Dimensions, View, StyleSheet, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import { Button } from "@/components";
import { PressableScale } from "@/components/pressable-scale";
import {
  useNativeSignIn,
  type NativeSignIn,
} from "@/screens/welcome/use-native-sign-in";

const { height } = Dimensions.get("window");

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      height,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      height: 144,
      width: 144,
    },
    serverButtonArea: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      alignItems: "flex-end",
      paddingHorizontal: 12,
    },
    serverButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 60,
      paddingHorizontal: 20,
      gap: 12,
    },
    buttonContainer: {
      height: 44,
      flexDirection: "row",
      justifyContent: "space-around",
      gap: 10,
    },
    flex: {
      flex: 1,
    },
    error: {
      color: theme.error,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
    },
  });

/**
 * A server problem is named as one — the same words the Server screen's
 * "Test connection" uses — so a stale custom URL does not read as a wrong
 * password. Only a rejection blames the sign-in or sign-up itself.
 */
function failureMessageKey(
  failure: NonNullable<NativeSignIn["failure"]>,
): string {
  switch (failure.reason) {
    case "unreachable":
      return "serverConnectionUnreachable";
    case "incompatible":
      return "serverConnectionIncompatible";
    case "rejected":
      return failure.flow === "sign_up" ? "signUpFailed" : "signInFailed";
  }
}

export function WelcomeScreen(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const { pendingFlow, failure, start } = useNativeSignIn();
  const busy = pendingFlow !== null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.serverButtonArea}>
        <PressableScale
          style={styles.serverButton}
          accessibilityRole="button"
          accessibilityLabel={t("serverSettings")}
          testID="welcome-server-settings"
          hitSlop={8}
          onPress={() => router.push("/auth/server")}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text01} />
        </PressableScale>
      </SafeAreaView>
      <Image source={require("@/assets/images/icon.png")} style={styles.icon} />
      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          <Button
            type="outline"
            style={styles.flex}
            testID="welcome-sign-in"
            loading={pendingFlow === "sign_in"}
            disabled={busy}
            onPress={() => start("sign_in")}
          >
            {t("signIn")}
          </Button>
          <Button
            type="primary"
            style={styles.flex}
            testID="welcome-sign-up"
            loading={pendingFlow === "sign_up"}
            disabled={busy}
            onPress={() => start("sign_up")}
          >
            {t("signUp")}
          </Button>
        </View>
        {failure && (
          <Text style={styles.error}>{t(failureMessageKey(failure))}</Text>
        )}
      </View>
    </View>
  );
}
