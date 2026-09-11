import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useApolloClient } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { fonts, useTheme } from "@/common/theme";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { useLedgerGuard } from "@/components/ledger-guard";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import {
  KeyboardAccessoryBar,
  KEYBOARD_ACCESSORY_BAR_HEIGHT,
} from "@/components/keyboard-accessory-bar";
import { useKeyboardHeight } from "@/components/keyboard-accessory-bar/use-keyboard-height";
import { getKeyboardOverlap } from "@/components/keyboard-accessory-bar/utils";
import {
  decodeLedgerFileContent,
  encodeLedgerFileContent,
} from "@/common/ledger-file-content";
import { isBeancountFile } from "@/common/ledger-file-types";
import {
  useGetLedgerFileQuery,
  useUpdateLedgerFileMutation,
} from "@/generated-graphql/graphql";
import CodeEditor, {
  type CodeEditorRef,
  type EditorDocumentSpec,
  type InsertSpec,
} from "@/components/code-editor/code-editor";
import {
  applyEditorEdit,
  createRevisionTracker,
  markRevisionsSaved,
  resetRevisionTracker,
} from "@/components/code-editor/revision-tracker";
import { isConflictError, filterFileErrors } from "./utils";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";

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
      backgroundColor: theme.white,
    },
    errorHeader: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 8,
    },
    errorSummary: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: theme.error,
      textAlign: LEADING_TEXT_ALIGN,
    },
    errorList: {
      maxHeight: 140,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black40,
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
      textAlign: LEADING_TEXT_ALIGN,
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
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const [expanded, setExpanded] = useState(false);
  const errorCountLabel = t("ledgerEditorErrorCount", {
    count: errors.length,
  });

  return (
    <View style={styles.errorBanner}>
      <TouchableOpacity
        testID="ledger-editor-error-toggle"
        style={styles.errorHeader}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={errorCountLabel}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
      >
        <Ionicons name="warning-outline" size={16} color={theme.error} />
        <Text style={styles.errorSummary}>{errorCountLabel}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.black60}
        />
      </TouchableOpacity>

      {expanded && (
        <ScrollView
          testID="ledger-editor-error-list"
          style={styles.errorList}
          scrollEnabled={errors.length > 3}
        >
          {errors.map((err, i) => (
            <View key={`${err.lineno ?? "unknown"}-${i}`}>
              <TouchableOpacity
                style={styles.errorRow}
                activeOpacity={err.lineno != null ? 0.7 : 1}
                onPress={() => err.lineno != null && onJump(err.lineno)}
              >
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={theme.error}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText} numberOfLines={2}>
                    {err.message}
                  </Text>
                  {err.lineno != null && (
                    <Text
                      style={styles.errorLocation}
                    >{`line ${err.lineno}`}</Text>
                  )}
                </View>
                {err.lineno != null && (
                  <Ionicons
                    name={directionalIcon("arrow-forward")}
                    size={14}
                    color={theme.black60}
                  />
                )}
              </TouchableOpacity>
              {i < errors.length - 1 && <View style={styles.errorDivider} />}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

/**
 * Binds one editor session to one (ledger, path) pair.
 *
 * The session keeps document content, SHA, revision tracker and the one-shot
 * `initialized` guard in component state. Those are only valid for the file
 * they were loaded from, so switching ledgers — an app link can change the
 * selected ledger under a retained screen — must start a fresh session rather
 * than leave the previous ledger's buffer on screen while every read and write
 * now addresses the new one.
 */
export function LedgerFileEditorScreen(): JSX.Element {
  const ledgerId = useLedgerGuard();
  const { path, initialLine } = useLocalSearchParams<{
    path: string;
    initialLine?: string;
  }>();

  return (
    <LedgerFileEditorSession
      key={`${ledgerId}\u0000${path}`}
      ledgerId={ledgerId}
      path={path}
      initialLine={initialLine}
    />
  );
}

function LedgerFileEditorSession({
  ledgerId,
  path,
  initialLine,
}: {
  ledgerId: string;
  path: string;
  initialLine?: string;
}): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { canWrite } = useLedgerAccess();
  const { userId } = useSession();
  const { currencies: operatingCurrencies } = useLedgerMeta(userId, ledgerId);

  const beancount = isBeancountFile(path);

  // ── File load ─────────────────────────────────────────────────────────────

  const {
    data: fileData,
    loading: fileLoading,
    error: fileError,
    refetch,
  } = useGetLedgerFileQuery({
    variables: { ledgerId, path },
    // network-only: editing must open authoritative source, never a stale
    // cached file that could overwrite newer server content on save.
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
  const revisionTrackerRef = useRef(createRevisionTracker());

  useEffect(() => {
    if (!fileData?.getLedgerFile || initialized) return;
    const raw = fileData.getLedgerFile.content ?? "";
    const enc = fileData.getLedgerFile.encoding;
    const fc = decodeLedgerFileContent(raw, enc);
    const fs = fileData.getLedgerFile.sha;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = fs;
    setDocumentSpec({ value: fc, epoch });
    setHasUnsavedChanges(false);
    setInitialized(true);
  }, [fileData, initialized]);

  // ── Save / conflict ───────────────────────────────────────────────────────

  const [updateLedgerFile, { loading: saving }] = useUpdateLedgerFileMutation();
  const saveInFlightRef = useRef(false);
  const client = useApolloClient();
  // A `.bean` save can rewrite every balance in the ledger, but users save
  // repeatedly mid-edit — refetching the whole ledger each time is not
  // affordable. So the save fires only the cheap `errors` scope (this screen
  // renders those), and the full sweep waits until the user leaves.
  const savedThisSessionRef = useRef(false);

  useEffect(
    () => () => {
      if (savedThisSessionRef.current) {
        void invalidateLedgerData(client, "file");
      }
    },
    [client],
  );

  const handleReload = useCallback(async () => {
    const result = await refetch();
    const raw = result.data?.getLedgerFile?.content ?? "";
    const enc = result.data?.getLedgerFile?.encoding;
    const fc = decodeLedgerFileContent(raw, enc);
    const fs = result.data?.getLedgerFile?.sha ?? "";
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = fs;
    setDocumentSpec({ value: fc, epoch });
    setHasUnsavedChanges(false);
  }, [refetch]);

  const handleEdit = useCallback(
    async (epoch: number, revision: number, isDirty: boolean) => {
      const dirty = applyEditorEdit(
        revisionTrackerRef.current,
        documentEpochRef.current,
        epoch,
        revision,
        isDirty,
      );
      if (dirty === null) return;
      setHasUnsavedChanges(dirty);
    },
    [],
  );

  const handleSave = useCallback(
    async (content: string, epoch: number, revision: number) => {
      if (
        !canWrite ||
        epoch !== documentEpochRef.current ||
        saveInFlightRef.current
      )
        return false;

      const sha = shaRef.current;
      if (!sha) {
        Alert.alert(t("ledgerEditorSaveFailed"));
        return false;
      }

      saveInFlightRef.current = true;
      try {
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
          setHasUnsavedChanges(
            markRevisionsSaved(revisionTrackerRef.current, revision),
          );
        }
        // This save stays on the screen and shows no toast, so the haptic is
        // the only confirmation the user gets.
        haptics.success();
        // Without this the banner keeps rendering the errors that existed
        // before the save — it is fetched once at mount, and this screen never
        // remounts while the user edits.
        savedThisSessionRef.current = true;
        void invalidateLedgerData(client, "errors");
        return true;
      } catch (err: unknown) {
        haptics.error();
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
    [canWrite, client, handleReload, ledgerId, path, t, updateLedgerFile],
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

  const keyboardHeight = useKeyboardHeight();

  const isKeyboardVisible = keyboardHeight > 0;
  const showAccessory =
    canWrite && beancount && isKeyboardVisible && initialized;
  const keyboardOverlap = getKeyboardOverlap(keyboardHeight, insets.bottom);
  const editorKeyboardInset = isKeyboardVisible
    ? keyboardOverlap + (showAccessory ? KEYBOARD_ACCESSORY_BAR_HEIGHT : 0)
    : 0;

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
          headerRight: canWrite ? headerRight : undefined,
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
          <FadeInView>
            <Text style={styles.loadErrorText}>
              {t("ledgerEditorLoadFailed")}
            </Text>
          </FadeInView>
        ) : initialized ? (
          <FadeInView fill>
            <CodeEditor
              ref={editorRef}
              readOnly={!canWrite}
              documentSpec={documentSpec}
              onEdit={handleEdit}
              onSave={handleSave}
              editorTheme={theme.editor}
              beancount={beancount}
              keyboardInset={editorKeyboardInset}
              insertSpec={insertSpec}
              jumpToLine={jumpToLine}
              dom={{ style: { flex: 1 } }}
            />
          </FadeInView>
        ) : null}

        {showAccessory && (
          <View style={[styles.accessoryWrapper, { bottom: keyboardOverlap }]}>
            <KeyboardAccessoryBar
              onInsert={handleInsert}
              operatingCurrencies={operatingCurrencies}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
