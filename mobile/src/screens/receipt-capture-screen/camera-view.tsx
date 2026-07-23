import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontSizes, fontWeights } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { CHROME, CONTROL_SIZE, SHUTTER_SIZE } from "./chrome";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHROME.background },
  camera: { flex: 1 },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarRight: { flexDirection: "row", gap: 12 },
  control: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: CHROME.buttonFill,
    alignItems: "center",
    justifyContent: "center",
  },
  controlPressed: { opacity: 0.6 },
  shutterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shutter: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: SHUTTER_SIZE / 2,
    backgroundColor: CHROME.shutterFill,
    borderWidth: 4,
    borderColor: CHROME.shutterRing,
  },
  shutterPressed: { opacity: 0.7 },
  denied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  deniedText: {
    color: CHROME.icon,
    fontSize: fontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },
  deniedActions: { flexDirection: "row", gap: 12 },
  pill: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: CHROME.pillFill,
  },
  pillPressed: { backgroundColor: CHROME.pillFillPressed },
  pillText: {
    color: CHROME.pillText,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
  },
});

export type CapturedShot = {
  uri: string;
  mimeType: string;
  filename: string;
};

export const CameraView = ({
  onCapture,
  onPickFromLibrary,
  onClose,
}: {
  onCapture: (shot: CapturedShot) => void;
  onPickFromLibrary: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<ExpoCameraView>(null);
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [capturing, setCapturing] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (!asked.current && permission && !permission.granted) {
      asked.current = true;
      if (permission.canAskAgain) requestPermission();
    }
  }, [permission, requestPermission]);

  const handleShutter = async () => {
    // takePictureAsync resolves well after the tap; without this guard a double
    // tap fires two captures and the second overwrites the preview.
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
      });
      if (photo?.uri) {
        onCapture({
          uri: photo.uri,
          mimeType: "image/jpeg",
          filename: "receipt.jpg",
        });
      }
    } finally {
      setCapturing(false);
    }
  };

  // Still resolving the permission on first mount — show the letterbox rather
  // than flashing the denied copy.
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.denied}>
          <Ionicons name="camera-outline" size={48} color={CHROME.icon} />
          <Text style={styles.deniedText}>{t("receiptCameraPermission")}</Text>
          <View style={styles.deniedActions}>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.pillText}>{t("receiptCancel")}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={() =>
                permission.canAskAgain
                  ? requestPermission()
                  : Linking.openSettings()
              }
            >
              <Text style={styles.pillText}>{t("receiptOpenSettings")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flash}
      />

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <Pressable
          testID="receipt-close"
          accessibilityLabel={t("receiptCancel")}
          style={({ pressed }) => [
            styles.control,
            pressed && styles.controlPressed,
          ]}
          onPress={onClose}
          hitSlop={8}
        >
          <Ionicons name="close" size={26} color={CHROME.icon} />
        </Pressable>

        <View style={styles.topBarRight}>
          <Pressable
            testID="receipt-pick-library"
            accessibilityLabel={t("receiptChooseLibrary")}
            style={({ pressed }) => [
              styles.control,
              pressed && styles.controlPressed,
            ]}
            onPress={onPickFromLibrary}
            hitSlop={8}
          >
            <Ionicons name="image-outline" size={24} color={CHROME.icon} />
          </Pressable>
          <Pressable
            testID="receipt-toggle-flash"
            accessibilityLabel={t("receiptFlash")}
            style={({ pressed }) => [
              styles.control,
              pressed && styles.controlPressed,
            ]}
            onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
            hitSlop={8}
          >
            <Ionicons
              name={flash === "on" ? "flash" : "flash-off"}
              size={24}
              color={CHROME.icon}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.shutterWrap, { bottom: insets.bottom + 36 }]}>
        <Pressable
          testID="receipt-shutter"
          accessibilityLabel={t("receiptTakePhoto")}
          style={({ pressed }) => [
            styles.shutter,
            pressed && styles.shutterPressed,
          ]}
          onPress={handleShutter}
        />
      </View>
    </View>
  );
};
