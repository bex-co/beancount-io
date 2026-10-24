import {
  isAuthTeardownError,
  ledgerWriteFailureMessage,
} from "@/common/ledger-refusal";
import { useGuest } from "@/common/guest/guest-context";
import { isLedgerGone, isWriteForbidden } from "@/common/graphql-error-codes";
import { disclosureAccessibility } from "@/common/accessibility";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Redirect, Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useApolloClient } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import {
  fonts,
  headerActionMaxFontSizeMultiplier,
  useTheme,
} from "@/common/theme";
import { registerUnsavedEditsGuard } from "@/common/unsaved-edits-guard";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
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
  isLosslessLedgerFileContent,
  lineEndingOf,
  withLineEnding,
  type LineEnding,
  isOverEditLimit,
  isUnreadableLargeFile,
} from "@/common/ledger-file-content";
import { createEditorRecovery } from "@/components/code-editor/editor-recovery";
import { isBeancountFile } from "@/common/ledger-file-types";
import {
  useCreateLedgerFileMutation,
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
import { isConflictFailure } from "@/common/ledger-conflict";
import { queryLedgerErrors } from "@/common/ledger-errors-read";
import {
  errorHint,
  errorMessageWithHint,
  firstNewLedgerError,
} from "@/common/new-ledger-error";
import {
  editorPathLine,
  fileBannerErrors,
  readOnlyNoticeColors,
} from "./utils";
import { selectLedgerFileEditorState } from "./select-editor-state";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";
import { useRouteParams } from "@/common/hooks/use-route-params";
import { bindRouteLedger } from "@/common/route-ledger";
import { RouteLedgerUnavailable } from "@/components/route-ledger-unavailable";

// ─── Styles ──────────────────────────────────────────────────────────────────

const SKELETON_WIDTHS = [260, 180, 300, 140, 220, 280, 160, 240, 190, 310];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // Quiet, non-blocking: a read-only file is still worth reading.
    readOnlyBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: readOnlyNoticeColors(theme).background,
    },
    readOnlyText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: readOnlyNoticeColors(theme).foreground,
      textAlign: LEADING_TEXT_ALIGN,
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
    errorHint: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.black80,
      marginTop: 2,
    },
    errorLocation: {
      fontSize: 11,
      fontFamily: fonts.mono,
      color: theme.black80,
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
    pathLine: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      fontFamily: fonts.mono,
      fontSize: 12,
      // Text, not a placeholder: black60 was 1.78:1 in light (w21/702).
      color: theme.black80,
    },
    savingText: {
      fontSize: 14,
      color: theme.black80,
      paddingHorizontal: 12,
    },
    loadErrorText: {
      fontSize: 14,
      color: theme.error,
      padding: 24,
      textAlign: "center",
    },
    unavailableActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 24,
    },
    unavailableAction: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primary,
    },
  });

// ─── Error panel ─────────────────────────────────────────────────────────────

type FileError = {
  message: string;
  lineno: number | null | undefined;
  hint?: string | null;
};

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
        {...disclosureAccessibility(expanded, t)}
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
          // A message is shown whole (w21/312), so a list of even one long row
          // can outgrow `maxHeight` and has to scroll.
          scrollEnabled
        >
          {errors.map((err, i) => {
            const body = (
              <>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={theme.error}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorText}>{err.message}</Text>
                  {errorHint(err) && (
                    // The engine's fix, when it has one (w21/424).
                    <Text style={styles.errorHint}>{errorHint(err)}</Text>
                  )}
                  {err.lineno != null && (
                    // Translated, as the banner's count is (w21/091).
                    <Text style={styles.errorLocation}>
                      {t("ledgerEditorErrorLine", { line: err.lineno })}
                    </Text>
                  )}
                </View>
                {err.lineno != null && (
                  <Ionicons
                    name={directionalIcon("arrow-forward")}
                    size={14}
                    color={theme.black60}
                  />
                )}
              </>
            );
            return (
              <View key={`${err.lineno ?? "unknown"}-${i}`}>
                {err.lineno != null ? (
                  <TouchableOpacity
                    style={styles.errorRow}
                    activeOpacity={0.7}
                    onPress={() => onJump(err.lineno!)}
                    // A row that jumps to its line is a button; the label keeps
                    // the warning and arrow glyphs out of its name (w21/141).
                    accessibilityRole="button"
                    accessibilityHint={t("ledgerEditorJumpToLine", {
                      line: err.lineno,
                    })}
                    accessibilityLabel={`${errorMessageWithHint(err)}, ${t("ledgerEditorErrorLine", { line: err.lineno })}`}
                  >
                    {body}
                  </TouchableOpacity>
                ) : (
                  // No line to jump to: plain text, not a disabled button
                  // VoiceOver reads as "dimmed" (w21/276, w21/428).
                  <View
                    style={styles.errorRow}
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={errorMessageWithHint(err)}
                  >
                    {body}
                  </View>
                )}
                {i < errors.length - 1 && <View style={styles.errorDivider} />}
              </View>
            );
          })}
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
  const guest = useGuest();
  const { path, initialLine, ledger } = useRouteParams<{
    path?: string;
    initialLine?: string;
    ledger?: string;
  }>();
  const { t } = useTranslations();
  const binding = bindRouteLedger(ledger, ledgerId);

  // Opened by URL without a file there is nothing to edit; the Files tab lists
  // what can be opened.
  if (!path) {
    return (
      <Redirect
        href={guest ? "/examples/(tabs)/ledger" : "/(app)/(tabs)/ledger"}
      />
    );
  }

  // A link to another ledger's file, before the switch lands or for a ledger
  // that cannot be read: the file in the selected ledger is a different file
  // (w21/199). Send no request.
  if (binding.status === "mismatch") {
    return (
      <RouteLedgerUnavailable
        title={path}
        message={t("fileEditorUnavailable")}
      />
    );
  }

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
  // Keys the notice text so a live text-size change remeasures it without
  // remounting this session or its editor (see DateSectionHeader).
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const guest = useGuest();
  const { canWrite: canWriteLedger } = useLedgerAccess();
  // A file that does not round-trip as UTF-8 opens read-only: saving it would
  // replace its non-UTF-8 bytes with U+FFFD (w21/042).
  const [lossy, setLossy] = useState(false);
  // A file the server sent no text for: read-only, never an empty document to
  // type over (w21/185).
  const [tooLarge, setTooLarge] = useState(false);
  // One the server would refuse to save back, though it opens (w21/186).
  const [overLimit, setOverLimit] = useState(false);
  const canWrite = canWriteLedger && !lossy && !tooLarge && !overLimit;
  const { currencies: operatingCurrencies } = useLedgerReadContext(ledgerId);

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
  const lineEndingRef = useRef<LineEnding>("\n");
  const documentEpochRef = useRef(0);
  const revisionTrackerRef = useRef(createRevisionTracker());
  // The latest text the editor reported, to put back if its web view restarts
  // (w21/342).
  const recoveryRef = useRef(createEditorRecovery());
  // The accessory bar's last insert. Cleared once the editor reports the edit
  // it made: a web view that restarts is handed its first props again, and the
  // insert would be applied a second time at the top of the file.
  const [insertSpec, setInsertSpec] = useState<InsertSpec | null>(null);

  useEffect(() => {
    if (!fileData?.getLedgerFile || initialized) return;
    const raw = fileData.getLedgerFile.content ?? "";
    const enc = fileData.getLedgerFile.encoding;
    const fc = decodeLedgerFileContent(raw, enc);
    setLossy(!isLosslessLedgerFileContent(raw, enc));
    setTooLarge(
      isUnreadableLargeFile(
        fileData.getLedgerFile.content,
        fileData.getLedgerFile.size,
      ),
    );
    setOverLimit(isOverEditLimit(fileData.getLedgerFile.size));
    lineEndingRef.current = lineEndingOf(fc);
    const fs = fileData.getLedgerFile.sha;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = fs;
    recoveryRef.current.loaded(fc);
    setDocumentSpec({ value: fc, epoch });
    setHasUnsavedChanges(false);
    setInitialized(true);
  }, [fileData, initialized]);

  // ── Save / conflict ───────────────────────────────────────────────────────

  const [updateLedgerFile, { loading: saving }] = useUpdateLedgerFileMutation();
  const [createLedgerFile] = useCreateLedgerFileMutation();
  const saveInFlightRef = useRef(false);
  const client = useApolloClient();
  // A `.bean` save can rewrite every balance in the ledger, but users save
  // repeatedly mid-edit — refetching the whole ledger each time is not
  // affordable. So the save fires only the cheap `errors` scope (this screen
  // renders those), and the full sweep waits until the user leaves.
  const savedThisSessionRef = useRef(false);
  const { errors: allErrors, loaded: errorsLoaded } = useLedgerErrors(ledgerId);

  // A raw save is never refused — this editor is how a broken ledger gets
  // repaired, and repair can pass through invalid states — but it must not
  // pass for a clean save either (w21/m1). Refresh the errors this screen and
  // the Home bell render, and warn with the first one the save added, as the
  // dashboard's write outcome does.
  const reportNewErrors = useCallback(
    async (before: typeof allErrors | null) => {
      await invalidateLedgerData(client, "errors");
      let after: typeof allErrors | undefined;
      try {
        after = await queryLedgerErrors(client, ledgerId);
      } catch {
        return;
      }
      const first = firstNewLedgerError(before, after);
      if (!first) return;
      Alert.alert(
        t("ledgerEditorSaveLeftErrorsTitle"),
        t("ledgerEditorSaveLeftErrors", { error: first.message }),
        [
          { text: t("done"), style: "cancel" },
          {
            text: t("ledgerEditorViewErrors"),
            onPress: () => router.navigate("/(app)/notifications"),
          },
        ],
      );
    },
    [client, ledgerId, router, t],
  );

  // Set when the screen goes, so a save still in flight can finish the sweep
  // the unmount could not: that ran first with `savedThisSessionRef` still
  // false, and nothing swept afterwards (w21/195).
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (savedThisSessionRef.current) {
        void invalidateLedgerData(client, "file");
      }
    };
  }, [client]);

  // Swap the remote text in: the buffer, the sha and the flags that follow the
  // text, under a new epoch.
  const applyRemoteFile = useCallback(
    (file: {
      content?: string | null;
      encoding?: string | null;
      size?: number | null;
      sha?: string | null;
    }) => {
      const raw = file.content ?? "";
      const enc = file.encoding;
      const fc = decodeLedgerFileContent(raw, enc);
      setLossy(!isLosslessLedgerFileContent(raw, enc));
      setTooLarge(isUnreadableLargeFile(file.content, file.size));
      setOverLimit(isOverEditLimit(file.size));
      lineEndingRef.current = lineEndingOf(fc);
      const fs = file.sha ?? "";
      const epoch = documentEpochRef.current + 1;
      documentEpochRef.current = epoch;
      resetRevisionTracker(revisionTrackerRef.current);
      shaRef.current = fs;
      recoveryRef.current.loaded(fc);
      setDocumentSpec({ value: fc, epoch });
      setHasUnsavedChanges(false);
    },
    [],
  );

  const handleReload = useCallback(async (): Promise<boolean> => {
    // The error strip follows the cache after mount; a reload that swaps in
    // the remote text must refresh it too, or it keeps a fixed error at a line
    // that no longer exists (w21/048).
    void invalidateLedgerData(client, "errors");
    // A reload that fails (a flaky network) says so and changes nothing: the
    // buffer and the sha stay, and the text is not lost (w21/446).
    const result = await refetch().catch(() => null);
    if (!result?.data?.getLedgerFile) {
      Alert.alert(t("ledgerEditorLoadFailed"));
      return false;
    }
    applyRemoteFile(result.data.getLedgerFile);
    return true;
  }, [applyRemoteFile, client, refetch, t]);

  // Coming back to this editor after the file was saved from another one (View
  // errors opens Notifications, whose error row opens a second editor on the
  // same file) leaves this copy outdated, and a save from it hits the conflict.
  // With nothing unsaved and no save running, return to the remote text when its
  // sha has moved (w21/544).
  const unsavedRef = useRef(false);
  unsavedRef.current = hasUnsavedChanges;
  const focusedBeforeRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!initialized) return undefined;
      if (!focusedBeforeRef.current) {
        focusedBeforeRef.current = true;
        return undefined;
      }
      if (unsavedRef.current || saveInFlightRef.current) return undefined;
      let live = true;
      void refetch()
        .then((result) => {
          const file = result.data?.getLedgerFile;
          if (!live || !file?.sha || file.sha === shaRef.current) return;
          if (unsavedRef.current || saveInFlightRef.current) return;
          applyRemoteFile(file);
          void invalidateLedgerData(client, "errors");
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [applyRemoteFile, client, initialized, refetch]),
  );

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
      // The editor has made the edit, so the insert that asked for it is spent.
      setInsertSpec(null);
    },
    [],
  );

  // The editor's text shortly after it changes; a draft from before a reload
  // (an older epoch) is dropped.
  const handleDraft = useCallback(async (text: string, epoch: number) => {
    if (epoch === documentEpochRef.current) recoveryRef.current.draft(text);
  }, []);

  // The editor's page is up. The second time is iOS having killed its web view:
  // the page restarted from its first props (the original text and a revision
  // counter at 0), so the draft goes back in under a new epoch, and the revision
  // tracker restarts with it (w21/342).
  const handleEditorReady = useCallback(async () => {
    const plan = recoveryRef.current.ready();
    if (!plan) return;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    setDocumentSpec({
      value: plan.value,
      epoch,
      savedValue: plan.savedValue,
    });
    setInsertSpec(null);
  }, []);

  // The conflict alert's way out for the user's text (w21/273): copy it and
  // load the remote version, or save it over that version.
  const copyThenReload = useCallback(
    async (content: string) => {
      // The text now in the editor, which may be newer than the save's (w21/689).
      const current = recoveryRef.current.latest() || content;
      try {
        await Clipboard.setStringAsync(
          withLineEnding(current, lineEndingRef.current),
        );
      } catch {
        // Reloading now would drop text that was not kept.
        Alert.alert(t("ledgerEditorCopyFailed"));
        return;
      }
      if (await handleReload()) haptics.success();
    },
    [handleReload, t],
  );

  const handleSaveRef = useRef<
    | ((
        content: string,
        epoch: number,
        revision: number,
        viaRestore?: boolean,
      ) => Promise<boolean>)
    | null
  >(null);

  // Overwrite and Recreate write outside the editor's own save. Without a guard
  // of their own, a Save tapped meanwhile sent a stale sha: a false "File
  // Deleted" over a restore that was succeeding, or a "File Changed" that held
  // the guard and dropped Overwrite's own save (w21/578). While one runs, Save
  // is ignored and the header says "Saving…".
  const restoringRef = useRef(false);
  const [restoring, setRestoring] = useState(false);
  const startRestore = (): boolean => {
    if (restoringRef.current || saveInFlightRef.current) return false;
    restoringRef.current = true;
    setRestoring(true);
    return true;
  };
  const endRestore = () => {
    restoringRef.current = false;
    setRestoring(false);
  };

  // A save that bypassed the editor's own (Overwrite, Recreate) leaves its
  // saved-text baseline at the text first loaded, so reverting the edit read
  // as no change: Save stayed grey and Back left without asking (w21/522). The
  // editor is handed the text it had, against the text just saved.
  const rebaseOnSaved = useCallback((latest: string, saved: string) => {
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    setDocumentSpec({ value: latest, epoch, savedValue: saved });
    setHasUnsavedChanges(latest !== saved);
    setInsertSpec(null);
  }, []);

  // Take the sha of the version on the server, not its text, and save over it.
  const overwriteRemote = useCallback(
    async (content: string, epoch: number, revision: number) => {
      if (!startRestore()) return;
      try {
        try {
          const result = await refetch();
          const current = result.data?.getLedgerFile?.sha;
          if (!current) throw new Error("no sha");
          shaRef.current = current;
        } catch {
          Alert.alert(t("ledgerEditorSaveFailed"));
          return;
        }
        if (await handleSaveRef.current?.(content, epoch, revision, true)) {
          // What is in the editor now, which includes anything typed while it saved.
          rebaseOnSaved(recoveryRef.current.latest(), content);
        }
      } finally {
        endRestore();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rebaseOnSaved, refetch, t],
  );

  // The file was deleted or moved elsewhere (w21/378): the text goes back as a
  // new file at the same path, or to the clipboard, and is never dropped.
  const copyDraft = useCallback(
    async (content: string) => {
      try {
        await Clipboard.setStringAsync(
          withLineEnding(content, lineEndingRef.current),
        );
        haptics.success();
      } catch {
        Alert.alert(t("ledgerEditorCopyFailed"));
      }
    },
    [t],
  );

  // The changed-elsewhere alert: keep editing, copy and reload, or overwrite the
  // remote after a confirmation. A save that lost a race and a Recreate that
  // found the file already back (w21/564) both end here.
  const presentConflict = useCallback(
    (content: string, epoch: number, revision: number) => {
      Alert.alert(
        t("ledgerEditorConflictTitle"),
        t("ledgerEditorConflictMessage"),
        [
          { text: t("ledgerEditorKeepEditing"), style: "cancel" },
          {
            text: t("ledgerEditorCopyReload"),
            onPress: () => void copyThenReload(content),
          },
          {
            text: t("ledgerEditorOverwrite"),
            style: "destructive",
            onPress: () =>
              Alert.alert(
                t("ledgerEditorOverwriteTitle"),
                t("ledgerEditorOverwriteMessage"),
                [
                  { text: t("cancel"), style: "cancel" },
                  {
                    text: t("ledgerEditorOverwrite"),
                    style: "destructive",
                    onPress: () =>
                      void overwriteRemote(content, epoch, revision),
                  },
                ],
              ),
          },
        ],
      );
    },
    [copyThenReload, overwriteRemote, t],
  );

  const recreateFile = useCallback(
    async (content: string, epoch: number, revision: number) => {
      // No `saving(content)`: this retries a save that already marked its text
      // the latest, and anything typed since is newer (w21/707).
      if (!startRestore()) return;
      try {
        const result = await createLedgerFile({
          variables: {
            ledgerId,
            path,
            content: encodeLedgerFileContent(
              withLineEnding(content, lineEndingRef.current),
            ),
            message: `restore ${path}`,
          },
        });
        const newSha = result.data?.createLedgerFile?.sha;
        if (!newSha) throw new Error(t("ledgerEditorSaveFailed"));
        shaRef.current = newSha;
        recoveryRef.current.saved(content);
        if (epoch === documentEpochRef.current) {
          setHasUnsavedChanges(
            markRevisionsSaved(revisionTrackerRef.current, revision),
          );
        }
        haptics.success();
        savedThisSessionRef.current = true;
        if (epoch === documentEpochRef.current)
          rebaseOnSaved(recoveryRef.current.latest(), content);
        void invalidateLedgerData(client, "file");
      } catch (err: unknown) {
        if (isAuthTeardownError(err)) return;
        haptics.error();
        // Someone else put the file back first: the server says CONFLICT, which
        // is the changed-elsewhere case, not a bodiless "Save failed" (w21/564).
        if (isConflictFailure(err)) {
          presentConflict(content, epoch, revision);
          return;
        }
        Alert.alert(
          t("ledgerEditorSaveFailed"),
          ledgerWriteFailureMessage(err, { t }) ?? undefined,
        );
      } finally {
        endRestore();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      client,
      createLedgerFile,
      ledgerId,
      path,
      presentConflict,
      rebaseOnSaved,
      t,
    ],
  );

  const handleSave = useCallback(
    async (
      content: string,
      epoch: number,
      revision: number,
      viaRestore = false,
    ) => {
      if (
        !canWrite ||
        epoch !== documentEpochRef.current ||
        saveInFlightRef.current ||
        (restoringRef.current && !viaRestore)
      )
        return false;

      const sha = shaRef.current;
      if (!sha) {
        Alert.alert(t("ledgerEditorSaveFailed"));
        return false;
      }

      saveInFlightRef.current = true;
      // An Overwrite resends the text of the save it retries, which marked it
      // the latest when it began; marked again, it put back the text typed
      // since (w21/707).
      if (!viaRestore) recoveryRef.current.saving(content);
      // Read before sending: the refresh after the save replaces it.
      const before = errorsLoaded ? allErrors : null;
      try {
        const result = await updateLedgerFile({
          variables: {
            ledgerId,
            path,
            content: encodeLedgerFileContent(
              withLineEnding(content, lineEndingRef.current),
            ),
            sha,
            message: `edit ${path}`,
          },
        });
        const newSha = result.data?.updateLedgerFile?.sha;
        if (!newSha) throw new Error(t("ledgerEditorSaveFailed"));

        shaRef.current = newSha;
        recoveryRef.current.saved(content);
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
        if (unmountedRef.current) {
          // Left during "Saving…": sweep now, and no alert over another screen.
          void invalidateLedgerData(client, "file");
          return true;
        }
        void reportNewErrors(before);
        return true;
      } catch (err: unknown) {
        // Signed out mid-save: Welcome says why (w21/119).
        if (isAuthTeardownError(err)) return false;
        haptics.error();
        if (isConflictFailure(err)) {
          presentConflict(content, epoch, revision);
        } else if (isLedgerGone(err)) {
          // Deleted elsewhere: the update can never succeed, and the draft is
          // the only copy (w21/378).
          Alert.alert(
            t("ledgerEditorFileGoneTitle"),
            t("ledgerEditorFileGoneMessage"),
            [
              { text: t("ledgerEditorKeepEditing"), style: "cancel" },
              { text: t("copy"), onPress: () => void copyDraft(content) },
              {
                text: t("ledgerEditorRecreate"),
                onPress: () => void recreateFile(content, epoch, revision),
              },
            ],
          );
        } else if (isWriteForbidden(err)) {
          // Edit access was removed: a retry cannot succeed, and the draft is
          // the only copy (w21/474).
          Alert.alert(
            t("ledgerEditorSaveFailed"),
            t("ledgerEditorAccessRemoved"),
            [
              { text: t("ledgerEditorKeepEditing"), style: "cancel" },
              { text: t("copy"), onPress: () => void copyDraft(content) },
            ],
          );
        } else {
          // The ledger's own text for a refusal, translated copy otherwise;
          // never "Network request failed" (w21/117). A failure with no text
          // of its own still says the draft is safe, instead of an empty alert.
          Alert.alert(
            t("ledgerEditorSaveFailed"),
            ledgerWriteFailureMessage(err, { t }) ??
              t("ledgerEditorSaveFailedHint"),
          );
        }
        return false;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [
      allErrors,
      canWrite,
      copyDraft,
      copyThenReload,
      errorsLoaded,
      ledgerId,
      overwriteRemote,
      path,
      presentConflict,
      recreateFile,
      reportNewErrors,
      t,
      updateLedgerFile,
    ],
  );
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // ── Unsaved changes guard ────────────────────────────────────────────────

  useUnsavedChangesGuard(hasUnsavedChanges);

  // An app link to another ledger switches ledgers before it navigates, which
  // would remount this session clean; it asks here first (w21/090).
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    return registerUnsavedEditsGuard(
      () =>
        new Promise<boolean>((resolve) => {
          Alert.alert(
            t("ledgerEditorUnsavedTitle"),
            t("ledgerEditorUnsavedMessage"),
            [
              {
                text: t("cancel"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("ledgerEditorDiscardChanges"),
                style: "destructive",
                onPress: () => resolve(true),
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        }),
    );
  }, [hasUnsavedChanges, t]);

  // The first load's Reload, for a file that failed or is unavailable.
  const retryLoad = () => {
    void invalidateLedgerData(client, "errors");
    void refetch();
  };

  // ── Keyboard height ──────────────────────────────────────────────────────

  const keyboardHeight = useKeyboardHeight();

  const isKeyboardVisible = keyboardHeight > 0;
  // Every writable file gets the bar: its chevron is the only way to hide
  // the keyboard once the web view's own ✓ is suppressed. Only Beancount
  // files get the insert buttons (w21/144).
  const showAccessory = canWrite && isKeyboardVisible && initialized;
  const keyboardOverlap = getKeyboardOverlap(
    keyboardHeight,
    insets.bottom,
    Platform.OS,
  );
  const editorKeyboardInset = isKeyboardVisible
    ? keyboardOverlap + (showAccessory ? KEYBOARD_ACCESSORY_BAR_HEIGHT : 0)
    : 0;

  // ── Accessory bar insert ─────────────────────────────────────────────────

  const insertSeq = useRef(0);
  const editorRef = useRef<CodeEditorRef>(null);

  const handleInsert = (text: string, cursorOffset?: number) => {
    setInsertSpec({ text, cursorOffset, seq: ++insertSeq.current });
  };

  // ── Jump to line ─────────────────────────────────────────────────────────

  const initialLineNum = initialLine != null ? parseInt(initialLine, 10) : null;
  const [jumpToLine, setJumpToLine] = useState<number | null>(
    !isNaN(initialLineNum ?? NaN) ? initialLineNum : null,
  );
  // Counts the requests: a tap on the row already jumped to sets the same
  // line again, which React skipped, so it did nothing for three seconds
  // (w21/942).
  const [jumpSeq, setJumpSeq] = useState(0);
  const requestJump = useCallback((line: number) => {
    setJumpToLine(line);
    setJumpSeq((seq) => seq + 1);
  }, []);
  // Re-arm the jump only when a link asks for a line, then clear the param:
  // a link opened again sets it anew and jumps again. Re-arming on every
  // focus also fired on an ordinary return to the screen (back from View
  // errors), throwing the cursor to the old line and opening the keyboard
  // (w21/152).
  useEffect(() => {
    const n = !isNaN(initialLineNum ?? NaN) ? initialLineNum : null;
    if (n === null) return;
    requestJump(n);
    router.setParams({ initialLine: undefined });
  }, [initialLineNum, router, requestJump]);
  // Only start the clear-timer once the file is loaded so CodeEditor has a
  // chance to receive the non-null value and scroll before we reset it.
  useEffect(() => {
    if (jumpToLine !== null && initialized) {
      const timer = setTimeout(() => setJumpToLine(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [jumpToLine, jumpSeq, initialized]);

  // ── Errors for this file ─────────────────────────────────────────────────

  const fileName = path.split("/").pop() ?? path;

  const fileErrors: FileError[] = fileBannerErrors(allErrors, path);

  // ── Header right ────────────────────────────────────────────────────────

  const headerRight =
    saving || restoring
      ? () => <Text style={styles.savingText}>{t("ledgerEditorSaving")}</Text>
      : () => (
          <TouchableOpacity
            style={styles.saveBtn}
            accessibilityRole="button"
            disabled={!hasUnsavedChanges}
            onPress={() => editorRef.current?.requestSave()}
          >
            <Text
              style={[
                styles.saveBtnText,
                !hasUnsavedChanges && styles.saveBtnTextDisabled,
              ]}
              maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
            >
              {t("ledgerEditorSave")}
            </Text>
          </TouchableOpacity>
        );

  // ── Render ───────────────────────────────────────────────────────────────

  const editorState = selectLedgerFileEditorState({
    loading: fileLoading,
    hasError: Boolean(fileError),
    hasData: Boolean(fileData),
    hasFile: Boolean(fileData?.getLedgerFile),
    initialized,
  });

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

      {/* The Save button's absence is otherwise the only sign. Yields to the
          error banner so the two never stack. */}
      {!canWrite &&
      (lossy || tooLarge || overLimit || fileErrors.length === 0) &&
      editorState === "content" ? (
        <View style={styles.readOnlyBanner} testID="ledger-editor-read-only">
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={readOnlyNoticeColors(theme).foreground}
          />
          <Text key={fontScale} style={styles.readOnlyText}>
            {t(
              tooLarge
                ? "ledgerEditorTooLarge"
                : overLimit
                  ? "ledgerEditorTooLargeToEdit"
                  : lossy
                    ? "ledgerEditorNotUtf8"
                    : guest
                      ? "guestReadOnlyEditor"
                      : "ledgerReadOnly",
            )}
          </Text>
        </View>
      ) : null}

      {fileErrors.length > 0 && (
        <ErrorBanner errors={fileErrors} onJump={requestJump} />
      )}

      {editorPathLine(path) ? (
        <Text
          testID="ledger-editor-path"
          style={styles.pathLine}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {editorPathLine(path)}
        </Text>
      ) : null}

      <View style={styles.editorWrapper}>
        {editorState === "loading" ? (
          <View style={styles.skeletonWrap}>
            {SKELETON_WIDTHS.map((w, i) => (
              <LoadingTile key={i} height={16} width={w} />
            ))}
          </View>
        ) : editorState === "error" ? (
          <FadeInView>
            <Text style={styles.loadErrorText}>
              {t("ledgerEditorLoadFailed")}
            </Text>
            <View style={styles.unavailableActions}>
              <TouchableOpacity accessibilityRole="button" onPress={retryLoad}>
                <Text style={styles.unavailableAction}>
                  {t("ledgerEditorReload")}
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        ) : editorState === "unavailable" ? (
          <FadeInView>
            <Text style={styles.loadErrorText}>
              {t("ledgerEditorFileUnavailable")}
            </Text>
            <View style={styles.unavailableActions}>
              <TouchableOpacity accessibilityRole="button" onPress={retryLoad}>
                <Text style={styles.unavailableAction}>
                  {t("ledgerEditorReload")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  // Always land on Files for this labeled recovery action —
                  // history existence does not mean the prior screen is Files.
                  router.replace(
                    guest ? "/examples/(tabs)/ledger" : "/(app)/(tabs)/ledger",
                  );
                }}
              >
                <Text style={styles.unavailableAction}>
                  {t("ledgerEditorBackToFiles")}
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        ) : editorState === "content" ? (
          <FadeInView fill>
            <CodeEditor
              ref={editorRef}
              readOnly={!canWrite}
              documentSpec={documentSpec}
              onEdit={handleEdit}
              onSave={handleSave}
              onReady={handleEditorReady}
              onDraft={handleDraft}
              editorTheme={theme.editor}
              beancount={beancount}
              keyboardInset={editorKeyboardInset}
              fontScale={fontScale}
              insertSpec={insertSpec}
              jumpToLine={jumpToLine}
              jumpSeq={jumpSeq}
              // WKWebView adds its own form-navigation bar (∧ ∨ ✓) under the
              // app's insert bar; this editor is a single field, so it is noise.
              dom={{ style: { flex: 1 }, hideKeyboardAccessoryView: true }}
            />
          </FadeInView>
        ) : null}

        {showAccessory && (
          <View style={[styles.accessoryWrapper, { bottom: keyboardOverlap }]}>
            <KeyboardAccessoryBar
              onInsert={handleInsert}
              operatingCurrencies={operatingCurrencies}
              onDismiss={() => editorRef.current?.blur()}
              shortcuts={beancount}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
