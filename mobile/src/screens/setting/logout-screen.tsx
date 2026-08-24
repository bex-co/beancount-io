import { useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { durations, dwellDurations, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { Ionicons } from "@expo/vector-icons";
import { Progress } from "@/components/progress";
import { actionLogout } from "./logout";
import { useSession } from "@/common/hooks/use-session";

/** How far the card travels up as it fades in. */
const ENTER_TRAVEL = 20;

const PROGRESS_HEIGHT = 4;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    content: {
      alignItems: "center",
      width: "100%",
      maxWidth: 300,
    },
    iconContainer: {
      marginBottom: 32,
      opacity: 0.9,
    },
    title: {
      fontSize: 24,
      fontWeight: "600",
      color: theme.black90,
      marginBottom: 12,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: theme.black80,
      textAlign: "center",
      marginBottom: 48,
    },
    progressContainer: {
      width: "100%",
      marginBottom: 8,
    },
    progressText: {
      fontSize: 14,
      color: theme.black60,
      textAlign: "center",
      marginTop: 8,
    },
  });

export const LogoutScreen = () => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const session = useSession();

  // The bar reaching the end *is* the signal to sign out — one animation, not
  // an animation racing a timer. Under reduce-motion the fill lands instantly
  // and so does this, which is the right trade: the dwell exists to make the
  // moment legible, and a user who has asked for less motion is not watching
  // it.
  const onProgressComplete = useCallback(async () => {
    await actionLogout(session);
  }, [session]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={styles.content}
        entering={FadeInDown.duration(durations.base).withInitialValues({
          transform: [{ translateY: ENTER_TRAVEL }],
        })}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="log-out-outline" size={64} color={theme.primary} />
        </View>
        <Text style={styles.title}>{t("loggingOut") || "Logging out"}</Text>
        <Text style={styles.subtitle}>
          {t("loggingOutMessage") ||
            "Please wait while we securely log you out..."}
        </Text>
        <View style={styles.progressContainer}>
          <Progress
            percent={100}
            height={PROGRESS_HEIGHT}
            rounded
            animateOnMount
            duration={dwellDurations.logout}
            trackColor={theme.black20}
            onComplete={onProgressComplete}
          />
        </View>
        <Text style={styles.progressText}>
          {t("loggingOutProgress") || "Signing out..."}
        </Text>
      </Animated.View>
    </View>
  );
};
