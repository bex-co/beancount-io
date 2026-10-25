import { signInFailureMessageKey } from "@/screens/welcome/failure-message";
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks";
import { prefersStackedLayout, useTheme } from "@/common/theme";
import { contentColumn } from "@/common/content-column";
import { Button } from "@/components";
import { PressableScale } from "@/components/pressable-scale";
import { startGuestVisit } from "@/common/guest/guest-state";
import { getServerUrl, serverUrlOverrideVar } from "@/common/vars/server-url";
import { useReactiveVar } from "@apollo/client";
import { signOutReasonVar } from "@/common/vars/sign-out-reason";
import { isOfficialServerUrl } from "@/common/server-url-validation";
import { useNativeSignIn } from "@/screens/welcome/use-native-sign-in";
import { InlineError } from "@/components/inline-error";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    content: {
      // Capped centered column on iPad; a no-op on phones (w21/m2).
      ...contentColumn,
      flexGrow: 1,
    },
    artwork: {
      flex: 1,
      minHeight: 188,
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      height: 144,
      width: 144,
    },
    serverButtonArea: {
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
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 12,
    },
    // No fixed height: each Button already has a 44pt minimum and grows with
    // its label, and a fixed row height clipped both labels at enlarged text.
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      gap: 10,
    },
    // At accessibility text sizes the two half-width buttons would break
    // "Sign In" mid-phrase, so the actions stack full width instead.
    buttonContainerStacked: {
      flexDirection: "column",
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

export function WelcomeScreen(): JSX.Element {
  useReactiveVar(serverUrlOverrideVar);
  const showExamples = isOfficialServerUrl(getServerUrl());
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const { pendingFlow, failure, start: startSignIn } = useNativeSignIn();
  // Why the app signed the user out, said once; a new sign-in clears it.
  const signOutReason = useReactiveVar(signOutReasonVar);
  const start = (flow: Parameters<typeof startSignIn>[0]) => {
    signOutReasonVar(null);
    startSignIn(flow);
  };
  const busy = pendingFlow !== null;
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);
  // Stacked buttons stretch to the column width; `flex: 1` would instead
  // divide the column's height between them.
  const buttonStyle = stacked ? undefined : styles.flex;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.serverButtonArea}>
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
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.artwork}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
          />
        </View>
        <View style={styles.footer}>
          {showExamples ? (
            <Button
              type="outline"
              testID="welcome-try-example"
              disabled={busy}
              onPress={() => {
                const serverUrl = getServerUrl();
                if (!isOfficialServerUrl(serverUrl)) return;
                startGuestVisit(serverUrl);
                router.push("/examples");
              }}
            >
              {t("guestTryExample")}
            </Button>
          ) : null}
          <View
            style={[
              styles.buttonContainer,
              stacked && styles.buttonContainerStacked,
            ]}
          >
            <Button
              type="outline"
              style={buttonStyle}
              testID="welcome-sign-in"
              loading={pendingFlow === "sign_in"}
              disabled={busy}
              onPress={() => start("sign_in")}
            >
              {t("signIn")}
            </Button>
            <Button
              type="primary"
              style={buttonStyle}
              testID="welcome-sign-up"
              loading={pendingFlow === "sign_up"}
              disabled={busy}
              onPress={() => start("sign_up")}
            >
              {t("signUp")}
            </Button>
          </View>
          {failure && (
            <InlineError
              style={styles.error}
              message={t(signInFailureMessageKey(failure))}
            />
          )}
          {signOutReason === "sessionEnded" && !failure ? (
            <InlineError
              style={styles.error}
              message={t("sessionEndedNotice")}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
