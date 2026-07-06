import { useEffect, useRef } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { Ionicons } from "@expo/vector-icons";
import { actionLogout } from "./logout";
import { useSession } from "@/common/hooks/use-session";

const PROGRESS_DURATION = 2000; // 2 seconds minimum

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
      height: 4,
      backgroundColor: theme.black20,
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 8,
    },
    progressBar: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 2,
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
  const { authToken } = useSession();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: PROGRESS_DURATION,
      useNativeDriver: false,
    }).start(async () => {
      // After animation completes, perform logout and navigate
      if (authToken) {
        await actionLogout(authToken);
      }
      // Reset navigation stack and navigate to welcome
      router.replace("/auth/welcome");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
          <Ionicons name="log-out-outline" size={64} color={theme.primary} />
        </Animated.View>
        <Text style={styles.title}>{t("loggingOut") || "Logging out"}</Text>
        <Text style={styles.subtitle}>
          {t("loggingOutMessage") ||
            "Please wait while we securely log you out..."}
        </Text>
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {t("loggingOutProgress") || "Signing out..."}
        </Text>
      </Animated.View>
    </View>
  );
};
