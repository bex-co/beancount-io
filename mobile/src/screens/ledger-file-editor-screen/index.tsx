import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useFocusEffect,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme } from "@/types/theme-props";
import { fonts, useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { useLedgerGuard } from "@/components/ledger-guard";
import { LoadingTile } from "@/components/loading-tile";
import { KeyboardAccessoryBar } from "@/components/keyboard-accessory-bar";
import { analytics } from "@/common/analytics";
import {
  decodeLedgerFileContent,
  encodeLedgerFileContent,
} from "@/common/ledger-file-content";
import {
  useGetLedgerFileQuery,
  useUpdateLedgerFileMutation,
} from "@/generated-graphql/graphql";
import CodeEditor, {
  type CodeEditorRef,
  type EditorDocumentSpec,
  type InsertSpec,
} from "@/components/code-editor/code-editor";
import { isConflictError, filterFileErrors } from "./utils";

// ─── Styles ──────────────────────────────────────────────────────────────────

const SKELETON_WIDTHS = [260, 180, 300, 140, 220, 280, 160, 240, 190, 310];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    editorWrapper: {
      flex: 1,
      position: "relative",
    },
    skeletonWrap: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
    },
    errorBanner: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black40,
      maxHeight: 140,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      color: theme.error,
      lineHeight: 16,
    },
    errorLocation: {
      fontSize: 11,
      fontFamily: fonts.mono,
      color: theme.black60,
    },
    errorDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
      marginHorizontal: 12,
    },
    accessoryWrapper: {
      position: "absolute",
      left: 0,
      right: 0,
    },
    saveBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.primary,
    },
    saveBtnTextDisabled: {
      color: theme.black40,
    },
    savingText: {
      fontSize: 14,
      color: theme.black60,
      paddingHorizontal: 12,
    },
    loadErrorText: {
      fontSize: 14,
      color: theme.error,
      padding: 24,
      textAlign: "center",
    },
  });

// ─── Error panel ─────────────────────────────────────────────────────────────

type FileError = { message: string; lineno: number | null | undefined };

function ErrorBanner({
  errors,
  onJump,
}: {
  errors: FileError[];
  onJump: (line: number) => void;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  return (
    <ScrollView style={styles.errorBanner} scrollEnabled={errors.length > 3}>
      {errors.map((err, i) => (
        <View key={i}>
          <TouchableOpacity
            style={styles.errorRow}
            activeOpacity={err.lineno != null ? 0.7 : 1}
            onPress={() => err.lineno != null && onJump(err.lineno)}
          >
            <Ionicons name="warning-outline" size={14} color={theme.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText} numberOfLines={2}>
                {err.message}
              </Text>
              {err.lineno != null && (
                <Text style={styles.errorLocation}>{`line ${err.lineno}`}</Text>
              )}
            </View>
            {err.lineno != null && (
              <Ionicons name="arrow-forward" size={14} color={theme.black60} />
            )}
          </TouchableOpacity>
          {i < errors.length - 1 && <View style={styles.errorDivider} />}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function LedgerFileEditorScreen(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const navigation = useNavigation();
  const ledgerId = useLedgerGuard();
  usePageView("ledger_file_editor");

  const { path, initialLine } = useLocalSearchParams<{
    path: string;
    initialLine?: string;
  }>();

  // ── File load ─────────────────────────────────────────────────────────────

  const {
    data: fileData,
    loading: fileLoading,
    error: fileError,
    refetch,
  } = useGetLedgerFileQuery({
    variables: { ledgerId, path },
    fetchPolicy: "network-only",
  });

  const [initialized, setInitialized] = useState(false);
  const [documentSpec, setDocumentSpec] = useState<EditorDocumentSpec>({
    value: "",
    epoch: 0,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const shaRef = useRef("");
  const documentEpochRef = useRef(0);
  const latestEditRevisionRef = useRef(0);
  const savedEditRevisionRef = useRef(0);

  useEffect(() => {
    if (!fileData?.getLedgerFile || initialized) return;
    const raw = fileData.getLedgerFile.content ?? "";
    const enc = fileData.getLedgerFile.encoding;
    const fc = decodeLedgerFileContent(raw, enc);
    const fs = fileData.getLedgerFile.sha;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    latestEditRevisionRef.current = 0;
    savedEditRevisionRef.current = 0;
    shaRef.current = fs;
    setDocumentSpec({ value: fc, epoch });
    setHasUnsavedChanges(false);
    setInitialized(true);
  }, [fileData, initialized]);

  // ── Save / conflict ───────────────────────────────────────────────────────

  const [updateLedgerFile, { loading: saving }] = useUpdateLedgerFileMutation();
  const saveInFlightRef = useRef(false);

  const handleReload = useCallback(async () => {
    const result = await refetch();
    const raw = result.data?.getLedgerFile?.content ?? "";
    const enc = result.data?.getLedgerFile?.encoding;
    const fc = decodeLedgerFileContent(raw, enc);
    const fs = result.data?.getLedgerFile?.sha ?? "";
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    latestEditRevisionRef.current = 0;
    savedEditRevisionRef.current = 0;
    shaRef.current = fs;
    setDocumentSpec({ value: fc, epoch });
    setHasUnsavedChanges(false);
  }, [refetch]);

  const handleEdit = useCallback(
    async (epoch: number, revision: number, isDirty: boolean) => {
      if (
        epoch !== documentEpochRef.current ||
        revision < latestEditRevisionRef.current
      )
        return;
      latestEditRevisionRef.current = revision;
      setHasUnsavedChanges(isDirty);
    },
    [],
  );

  const handleSave = useCallback(
    async (content: string, epoch: number, revision: number) => {
      if (epoch !== documentEpochRef.current || saveInFlightRef.current)
        return false;

      const sha = shaRef.current;
      if (!sha) {
        Alert.alert(t("ledgerEditorSaveFailed"));
        return false;
      }

      saveInFlightRef.current = true;
      try {
        analytics.track("tap_ledger_save", { path });
        const result = await updateLedgerFile({
          variables: {
            ledgerId,
            path,
            content: encodeLedgerFileContent(content),
            sha,
            message: `edit ${path}`,
          },
        });
        const newSha = result.data?.updateLedgerFile?.sha;
        if (!newSha) throw new Error(t("ledgerEditorSaveFailed"));

        shaRef.current = newSha;
        if (epoch === documentEpochRef.current) {
          savedEditRevisionRef.current = Math.max(
            savedEditRevisionRef.current,
            revision,
          );
          setHasUnsavedChanges(
            latestEditRevisionRef.current > savedEditRevisionRef.current,
          );
        }
        analytics.track("ledger_save_success", { path });
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isConflictError(msg)) {
          Alert.alert(
            t("ledgerEditorConflictTitle"),
            t("ledgerEditorConflictMessage"),
            [
              { text: t("ledgerEditorKeepEditing"), style: "cancel" },
              {
                text: t("ledgerEditorReload"),
                style: "destructive",
                onPress: handleReload,
              },
            ],
          );
        } else {
          Alert.alert(t("ledgerEditorSaveFailed"), msg);
        }
        return false;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [handleReload, ledgerId, path, t, updateLedgerFile],
  );

  // ── Unsaved changes guard ────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      Alert.alert(
        t("ledgerEditorUnsavedTitle"),
        t("ledgerEditorUnsavedMessage"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("ledgerEditorDiscardChanges"),
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges, t]);

  // ── Keyboard height ──────────────────────────────────────────────────────

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ── Accessory bar insert ─────────────────────────────────────────────────

  const insertSeq = useRef(0);
  const [insertSpec, setInsertSpec] = useState<InsertSpec | null>(null);
  const editorRef = useRef<CodeEditorRef>(null);

  const handleInsert = (text: string, cursorOffset?: number) => {
    setInsertSpec({ text, cursorOffset, seq: ++insertSeq.current });
  };

  // ── Jump to line ─────────────────────────────────────────────────────────

  const initialLineNum = initialLine != null ? parseInt(initialLine, 10) : null;
  const [jumpToLine, setJumpToLine] = useState<number | null>(
    !isNaN(initialLineNum ?? NaN) ? initialLineNum : null,
  );
  // Re-arm the jump target whenever the screen gains focus.
  // This handles screen reuse: if the user navigates away and back (or
  // the same deep-link fires again), the jump re-triggers instead of
  // being skipped because the state was already cleared.
  useFocusEffect(
    useCallback(() => {
      const n = !isNaN(initialLineNum ?? NaN) ? initialLineNum : null;
      if (n !== null) setJumpToLine(n);
    }, [initialLineNum]),
  );
  // Only start the clear-timer once the file is loaded so CodeEditor has a
  // chance to receive the non-null value and scroll before we reset it.
  useEffect(() => {
    if (jumpToLine !== null && initialized) {
      const timer = setTimeout(() => setJumpToLine(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [jumpToLine, initialized]);

  // ── Errors for this file ─────────────────────────────────────────────────

  const fileName = path.split("/").pop() ?? path;

  const { errors: allErrors } = useLedgerErrors();
  const fileErrors: FileError[] = filterFileErrors(allErrors, path).map(
    (e) => ({ message: e.message, lineno: e.lineno }),
  );

  // ── isDark ───────────────────────────────────────────────────────────────

  const isDark = useTheme().name === "dark";

  // ── Header right ────────────────────────────────────────────────────────

  const headerRight = saving
    ? () => <Text style={styles.savingText}>{t("ledgerEditorSaving")}</Text>
    : () => (
        <TouchableOpacity
          style={styles.saveBtn}
          disabled={!hasUnsavedChanges}
          onPress={() => editorRef.current?.requestSave()}
        >
          <Text
            style={[
              styles.saveBtnText,
              !hasUnsavedChanges && styles.saveBtnTextDisabled,
            ]}
          >
            {t("ledgerEditorSave")}
          </Text>
        </TouchableOpacity>
      );

  // ── Render ───────────────────────────────────────────────────────────────

  const isFirstLoad = fileLoading && !initialized;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: fileName,
          headerRight,
          headerTitleStyle: {
            fontFamily: fonts.mono,
            fontSize: 14,
            color: theme.black,
          },
        }}
      />

      {fileErrors.length > 0 && (
        <ErrorBanner
          errors={fileErrors}
          onJump={(line) => setJumpToLine(line)}
        />
      )}

      <View style={styles.editorWrapper}>
        {isFirstLoad ? (
          <View style={styles.skeletonWrap}>
            {SKELETON_WIDTHS.map((w, i) => (
              <LoadingTile key={i} height={16} width={w} />
            ))}
          </View>
        ) : fileError && !initialized ? (
          <Text style={styles.loadErrorText}>
            {t("ledgerEditorLoadFailed")}
          </Text>
        ) : initialized ? (
          <CodeEditor
            ref={editorRef}
            documentSpec={documentSpec}
            onEdit={handleEdit}
            onSave={handleSave}
            isDark={isDark}
            keyboardHeight={keyboardHeight}
            insertSpec={insertSpec}
            jumpToLine={jumpToLine}
            dom={{ style: { flex: 1 } }}
          />
        ) : null}

        {keyboardHeight > 0 && initialized && (
          <View style={[styles.accessoryWrapper, { bottom: keyboardHeight }]}>
            <KeyboardAccessoryBar onInsert={handleInsert} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
