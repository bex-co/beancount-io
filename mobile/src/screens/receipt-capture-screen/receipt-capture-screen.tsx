import { memo, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as LegacyFS from "expo-file-system/legacy";
import { useTranslations } from "@/common/hooks/use-translations";
import { haptics } from "@/common/haptics";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useReceiptWorkflow } from "./use-receipt-workflow";
import { receiptErrorKey, mimeToExt } from "./receipt-utils";
import { CameraView, type CapturedShot } from "./camera-view";
import { PreviewView } from "./preview-view";
import { CHROME } from "./chrome";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CHROME.background },
});

/**
 * How long the extracted fields stay up before the form takes over.
 *
 * Long enough to read three fields, short enough that a user scanning a stack
 * of receipts never wants to dismiss it — which is why it self-dismisses and
 * has no tap target at all. Above the motion budget on purpose: this is a dwell,
 * not a transition; the animations inside it are what the budget governs.
 */
const REVEAL_DWELL_MS = 1200;

// Minimal 1×1 white JPEG used in __DEV__ test mode to bypass the camera.
// XCUITest (used by expo-mcp) dismisses native camera UI on attach.
const TEST_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APvSiigD/9k=";

const ReceiptCaptureScreenImpl = () => {
  const { t } = useTranslations();
  const router = useRouter();
  const ledgerId = useLedgerGuard();
  const workflow = useReceiptWorkflow();
  const { testMode } = useLocalSearchParams<{ testMode?: string }>();

  const [shot, setShot] = useState<CapturedShot | null>(null);
  const launched = useRef(false);
  const handedOff = useRef(false);
  const failed = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(t("receiptLibraryPermission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    setShot({
      uri: asset.uri,
      mimeType,
      filename: asset.fileName ?? `receipt.${mimeToExt(mimeType)}`,
    });
  };

  const handleCapture = (captured: CapturedShot) => {
    setShot(captured);
  };

  const handleRetake = () => {
    workflow.reset();
    setShot(null);
    failed.current = false;
  };

  const handleUpload = () => {
    if (!shot) return;
    workflow.startCapture(shot.uri, shot.mimeType, shot.filename, ledgerId);
  };

  useEffect(() => {
    if (!launched.current && __DEV__ && testMode === "1") {
      launched.current = true;
      (async () => {
        try {
          const uri = `${LegacyFS.cacheDirectory}test-receipt.jpg`;
          await LegacyFS.writeAsStringAsync(uri, TEST_JPEG_B64, {
            encoding: LegacyFS.EncodingType.Base64,
          });
          setShot({
            uri,
            mimeType: "image/jpeg",
            filename: "test-receipt.jpg",
          });
          await workflow.startCapture(
            uri,
            "image/jpeg",
            "test-receipt.jpg",
            ledgerId,
          );
        } catch (e) {
          console.error("testMode capture failed:", e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse succeeded — show what was read, then hand the fields to the real
  // transaction editor.
  //
  // `replace`, not `push`: it drops the camera from the stack so the form's
  // own router.back() after saving returns to where the scan started.
  //
  // The reveal is why this is a timer and not a straight `replace`: the parse
  // is the app's one piece of real magic and it used to land in silence. The
  // handoff is deliberately guarded to fire once — a re-render must not
  // re-track the event or queue a second navigation.
  useEffect(() => {
    const phase = workflow.phase;
    if (phase.kind !== "parsed" || handedOff.current) return;
    handedOff.current = true;

    haptics.success();

    revealTimer.current = setTimeout(() => {
      router.replace({
        pathname: "/(app)/add-transaction",
        params: {
          prefillDate: phase.date,
          prefillPayee: phase.payee,
          prefillNarration: phase.description,
          prefillSourceAccount: phase.sourceAccount,
          prefillTargetAccount: phase.targetAccount,
          // Receipts are expenses; normalize so the form always seeds a clean
          // positive total regardless of how the model signed it.
          prefillAmount: Math.abs(phase.amount).toFixed(2),
        },
      });
    }, REVEAL_DWELL_MS);
  }, [workflow.phase, router, ledgerId]);

  // A failed parse should feel different from a successful one, not just read
  // differently. `PreviewView` already renders the reason.
  useEffect(() => {
    if (workflow.phase.kind !== "error" || failed.current) return;
    failed.current = true;
    haptics.error();
  }, [workflow.phase]);

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  const renderBody = () => {
    if (!shot) {
      return (
        <CameraView
          onCapture={handleCapture}
          onPickFromLibrary={pickFromLibrary}
          onClose={() => router.back()}
        />
      );
    }

    const { phase } = workflow;
    // "parsed" holds the reveal until the handoff fires; falling through to
    // "preview" would flash the Retake/Upload buttons back up on the way out.
    const status =
      phase.kind === "uploading"
        ? "uploading"
        : phase.kind === "parsing"
          ? "parsing"
          : phase.kind === "parsed"
            ? "revealed"
            : phase.kind === "error"
              ? "error"
              : "preview";

    return (
      <PreviewView
        shot={shot}
        status={status}
        errorMessage={
          phase.kind === "error" ? t(receiptErrorKey(phase.message)) : undefined
        }
        reveal={
          phase.kind === "parsed"
            ? {
                payee: phase.payee,
                amount: Math.abs(phase.amount).toFixed(2),
                date: phase.date,
              }
            : undefined
        }
        onRetake={handleRetake}
        onUpload={handleUpload}
        onCancel={() => router.back()}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderBody()}
    </View>
  );
};

export const ReceiptCaptureScreen = memo(function ReceiptCaptureScreen() {
  return (
    <LedgerGuard>
      <ReceiptCaptureScreenImpl />
    </LedgerGuard>
  );
});
