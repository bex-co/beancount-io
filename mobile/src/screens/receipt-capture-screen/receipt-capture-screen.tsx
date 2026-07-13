import { memo, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as LegacyFS from "expo-file-system/legacy";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useThemeStyle, usePageView, useToast } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useSession } from "@/common/hooks/use-session";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import {
  SelectedLegAccount,
  AddTransactionCallback,
} from "@/common/globalFnFactory";
import { getFormatDate } from "@/common/format-util";
import { useReceiptWorkflow } from "./use-receipt-workflow";
import {
  buildReceiptPostings,
  receiptErrorKey,
  mimeToExt,
} from "./receipt-utils";
import type { InsertReceiptTransactionInput } from "@/generated-graphql/graphql";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.white },
    progressContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 32,
    },
    progressText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    errorText: {
      fontSize: fontSizes.md,
      color: theme.error,
      textAlign: "center",
      marginBottom: 24,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: theme.primary,
    },
    retryButtonText: {
      color: theme.white,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
    scrollContent: { paddingBottom: 32 },
    section: {
      marginHorizontal: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.black10,
    },
    rowLast: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLabel: {
      fontSize: fontSizes.sm,
      color: theme.black60,
      width: 110,
      flexShrink: 0,
    },
    rowValue: {
      flex: 1,
      fontSize: fontSizes.md,
      color: theme.text01,
    },
    rowValueInput: {
      flex: 1,
      fontSize: fontSizes.md,
      color: theme.text01,
      padding: 0,
    },
    rowValuePlaceholder: {
      flex: 1,
      fontSize: fontSizes.md,
      color: theme.black40,
    },
    sectionTitle: {
      fontSize: fontSizes.sm,
      color: theme.black60,
      fontWeight: fontWeights.medium,
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    confirmButton: {
      margin: 16,
      marginTop: 24,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    confirmButtonDisabled: {
      backgroundColor: theme.black20,
    },
    confirmButtonText: {
      color: theme.white,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
    },
  });

type ReviewState = {
  payee: string;
  date: Date;
  description: string;
  sourceAccount: string;
  targetAccount: string;
  amount: number;
  objectKey: string;
};

const ProgressView = ({ message }: { message: string }) => {
  const styles = useThemeStyle(getStyles);
  return (
    <View style={styles.progressContainer}>
      <ActivityIndicator size="large" />
      <Text style={styles.progressText}>{message}</Text>
    </View>
  );
};

const ErrorView = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>{t("cancel")}</Text>
      </Pressable>
    </View>
  );
};

const ReviewForm = ({
  review,
  currency,
  ledgerId,
  onConfirm,
}: {
  review: ReviewState;
  currency: string;
  ledgerId: string;
  onConfirm: (
    input: InsertReceiptTransactionInput,
    ledgerId: string,
    objectKey: string,
  ) => void;
}) => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();

  const [payee, setPayee] = useState(review.payee);
  const [date, setDate] = useState(review.date);
  const [description, setDescription] = useState(review.description);
  const [sourceAccount, setSourceAccount] = useState(review.sourceAccount);
  const [targetAccount, setTargetAccount] = useState(review.targetAccount);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // which account slot is being picked: "source" | "target" | null
  const pendingSlot = useRef<"source" | "target" | null>(null);

  const openAccountPicker = (slot: "source" | "target") => {
    pendingSlot.current = slot;
    SelectedLegAccount.setFn((account: string) => {
      if (pendingSlot.current === "source") setSourceAccount(account);
      else setTargetAccount(account);
    });
    router.navigate({
      pathname: "/(app)/account-picker",
      params: { type: "leg" },
    });
  };

  const canConfirm = sourceAccount.length > 0 && targetAccount.length > 0;

  const handleConfirm = () => {
    const input: InsertReceiptTransactionInput = {
      payee,
      date: getFormatDate(date),
      description,
      documentAccount: sourceAccount,
      postings: buildReceiptPostings(
        review.amount,
        targetAccount,
        sourceAccount,
        currency,
      ),
    };
    analytics.track("receipt_confirm", { ledgerId });
    onConfirm(input, ledgerId, review.objectKey);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>{t("transaction")}</Text>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("receiptPayee")}</Text>
          <TextInput
            style={styles.rowValueInput}
            value={payee}
            onChangeText={setPayee}
            placeholder={t("receiptPayee")}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("receiptDate")}</Text>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.rowValue}>{getFormatDate(date)}</Text>
          </Pressable>
        </View>
        <View style={styles.rowLast}>
          <Text style={styles.rowLabel}>{t("receiptDescription")}</Text>
          <TextInput
            style={styles.rowValueInput}
            value={description}
            onChangeText={setDescription}
            placeholder={t("narration")}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("accounts")}</Text>
      <View style={styles.section}>
        <Pressable
          testID="receipt-target-account"
          style={styles.row}
          onPress={() => openAccountPicker("target")}
        >
          <Text style={styles.rowLabel}>{t("receiptTargetAccount")}</Text>
          {targetAccount ? (
            <Text style={styles.rowValue}>{targetAccount}</Text>
          ) : (
            <Text style={styles.rowValuePlaceholder}>{t("legAccount")}</Text>
          )}
        </Pressable>
        <Pressable
          testID="receipt-source-account"
          style={styles.rowLast}
          onPress={() => openAccountPicker("source")}
        >
          <Text style={styles.rowLabel}>{t("receiptSourceAccount")}</Text>
          {sourceAccount ? (
            <Text style={styles.rowValue}>{sourceAccount}</Text>
          ) : (
            <Text style={styles.rowValuePlaceholder}>{t("legAccount")}</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t("receiptAmount")}</Text>
      <View style={styles.section}>
        <View style={styles.rowLast}>
          <Text style={styles.rowLabel}>{t("total")}</Text>
          <Text style={styles.rowValue}>
            {review.amount.toFixed(2)} {currency}
          </Text>
        </View>
      </View>

      <Pressable
        testID="receipt-confirm-button"
        style={[
          styles.confirmButton,
          !canConfirm && styles.confirmButtonDisabled,
        ]}
        onPress={handleConfirm}
        disabled={!canConfirm}
      >
        <Text style={styles.confirmButtonText}>{t("receiptConfirm")}</Text>
      </Pressable>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={date}
        onConfirm={(d) => {
          setDate(d);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </ScrollView>
  );
};

// Minimal 1×1 white JPEG used in __DEV__ test mode to bypass the system photo picker.
const TEST_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APvSiigD/9k=";

const ReceiptCaptureScreenImpl = () => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const { currencies } = useLedgerMeta(userId);
  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const workflow = useReceiptWorkflow();
  const { testMode } = useLocalSearchParams<{ testMode?: string }>();
  usePageView("receipt_capture");

  const launched = useRef(false);

  const launchPicker = async (useCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(t("noContactPermission"));
        router.back();
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(t("noContactPermission"));
        router.back();
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
    }

    if (result.canceled || !result.assets?.[0]) {
      router.back();
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    const filename = asset.fileName ?? `receipt.${mimeToExt(mimeType)}`;

    analytics.track("receipt_image_selected", {
      source: useCamera ? "camera" : "library",
    });
    await workflow.startCapture(asset.uri, mimeType, filename, ledgerId);
  };

  const showPicker = () => {
    const options = [
      t("receiptTakePhoto"),
      t("receiptChooseLibrary"),
      t("receiptCancel"),
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) launchPicker(true);
          else if (idx === 1) launchPicker(false);
          else router.back();
        },
      );
    } else {
      Alert.alert(t("receiptCaptureTitle"), undefined, [
        { text: t("receiptTakePhoto"), onPress: () => launchPicker(true) },
        { text: t("receiptChooseLibrary"), onPress: () => launchPicker(false) },
        {
          text: t("receiptCancel"),
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    }
  };

  useEffect(() => {
    if (!launched.current) {
      launched.current = true;
      if (__DEV__ && testMode === "1") {
        // Bypass the system photo picker for automated E2E testing.
        // XCUITest (used by expo-mcp) dismisses native pickers on attach.
        (async () => {
          try {
            const uri = `${LegacyFS.cacheDirectory}test-receipt.jpg`;
            await LegacyFS.writeAsStringAsync(uri, TEST_JPEG_B64, {
              encoding: LegacyFS.EncodingType.Base64,
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
      } else {
        showPicker();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle success: show toast and navigate back
  useEffect(() => {
    if (workflow.phase.kind === "success") {
      showToast({ message: t("receiptSaveSuccess"), type: "success" });
      AddTransactionCallback.getFn()?.();
      router.back();
    }
  }, [workflow.phase.kind, showToast, t, router]);

  const renderBody = () => {
    const { phase } = workflow;

    if (phase.kind === "uploading") {
      return <ProgressView message={t("receiptUploading")} />;
    }
    if (phase.kind === "parsing") {
      return <ProgressView message={t("receiptParsing")} />;
    }
    if (phase.kind === "confirming") {
      return <ProgressView message={t("saving")} />;
    }
    if (phase.kind === "success") {
      return <ProgressView message={t("receiptSaveSuccess")} />;
    }
    if (phase.kind === "error") {
      const msg = `${t(receiptErrorKey(phase.message))}\n[${phase.message}]`;
      return <ErrorView message={msg} onRetry={() => router.back()} />;
    }
    if (phase.kind === "review") {
      const reviewState: ReviewState = {
        payee: phase.payee,
        date: new Date(phase.date),
        description: phase.description,
        sourceAccount: phase.sourceAccount,
        targetAccount: phase.targetAccount,
        amount: phase.amount,
        objectKey: phase.objectKey,
      };
      return (
        <ReviewForm
          review={reviewState}
          currency={currency}
          ledgerId={ledgerId}
          onConfirm={workflow.confirmTransaction}
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("receiptCaptureTitle"),
          headerStyle: { backgroundColor: theme.white },
          headerTintColor: theme.text01,
          headerTitleStyle: { fontWeight: fontWeights.medium },
        }}
      />
      {renderBody()}
    </SafeAreaView>
  );
};

export const ReceiptCaptureScreen = memo(function ReceiptCaptureScreen() {
  return (
    <LedgerGuard>
      <ReceiptCaptureScreenImpl />
    </LedgerGuard>
  );
});
