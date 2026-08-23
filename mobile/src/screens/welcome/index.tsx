import { Dimensions, View, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import { Button } from "@/components";
import { PressableScale } from "@/components/pressable-scale";
import { LoginOrSignUp } from "@/screens/welcome/auth-modal";

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
    buttonContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 80,
      height: 44,
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: 20,
      gap: 10,
    },
    flex: {
      flex: 1,
    },
  });

export function WelcomeScreen(): JSX.Element {
  usePageView("pre_auth");
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
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
      <View style={styles.buttonContainer}>
        <LoginOrSignUp isSignUp={false} style={styles.flex}>
          <Button type="outline">{t("signIn")}</Button>
        </LoginOrSignUp>
        <LoginOrSignUp isSignUp={true} style={styles.flex}>
          <Button type="primary">{t("signUp")}</Button>
        </LoginOrSignUp>
      </View>
    </View>
  );
}
