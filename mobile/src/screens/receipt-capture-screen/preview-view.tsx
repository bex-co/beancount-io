import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontSizes, fontWeights } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { CHROME } from "./chrome";
import type { CapturedShot } from "./camera-view";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHROME.background },
  image: { flex: 1 },
  actions: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pill: {
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 28,
    backgroundColor: CHROME.pillFill,
    minWidth: 132,
    alignItems: "center",
  },
  pillPressed: { backgroundColor: CHROME.pillFillPressed },
  pillText: {
    color: CHROME.pillText,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
  },
  // Full-screen blocking overlay over the still, not a content area waiting on a
  // query — a spinner is right here, a LoadingTile skeleton would not be.
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CHROME.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 18,
  },
  scrimText: {
    color: CHROME.icon,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    textAlign: "center",
  },
  errorText: {
    color: CHROME.icon,
    fontSize: fontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 6 },
});

export const PreviewView = ({
  shot,
  status,
  errorMessage,
  onRetake,
  onUpload,
  onCancel,
}: {
  shot: CapturedShot;
  status: "preview" | "uploading" | "parsing" | "error";
  errorMessage?: string;
  onRetake: () => void;
  onUpload: () => void;
  onCancel: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();

  const busyLabel =
    status === "uploading"
      ? t("receiptUploading")
      : status === "parsing"
        ? t("receiptParsing")
        : null;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: shot.uri }}
        style={styles.image}
        resizeMode="contain"
      />

      {status === "preview" ? (
        <View style={[styles.actions, { bottom: insets.bottom + 28 }]}>
          <Pressable
            testID="receipt-retake"
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={onRetake}
          >
            <Text style={styles.pillText}>{t("receiptRetake")}</Text>
          </Pressable>
          <Pressable
            testID="receipt-upload"
            style={({ pressed }) => [
              styles.pill,
              pressed && styles.pillPressed,
            ]}
            onPress={onUpload}
          >
            <Text style={styles.pillText}>{t("receiptUpload")}</Text>
          </Pressable>
        </View>
      ) : null}

      {busyLabel ? (
        <View style={styles.scrim}>
          <ActivityIndicator size="large" color={CHROME.icon} />
          <Text style={styles.scrimText}>{busyLabel}</Text>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.scrim}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <View style={styles.errorActions}>
            <Pressable
              testID="receipt-error-cancel"
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.pillText}>{t("receiptCancel")}</Text>
            </Pressable>
            <Pressable
              testID="receipt-error-retake"
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={onRetake}
            >
              <Text style={styles.pillText}>{t("receiptRetake")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};
