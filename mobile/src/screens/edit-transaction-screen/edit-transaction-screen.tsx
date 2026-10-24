import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { InlineError } from "@/components/inline-error";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useApolloClient } from "@apollo/client";
import {
  fontSizes,
  headerActionMaxFontSizeMultiplier,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { useTranslations } from "@/common/hooks/use-translations";
import { useUnsavedChangesGuard } from "@/common/hooks/use-unsaved-changes-guard";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
import { ColorTheme } from "@/types/theme-props";
import {
  GetLedgerEntryContextDocument,
  GetLedgerJournalDocument,
  useGetLedgerEntryContextQuery,
  useUpdateLedgerEntrySourceSliceMutation,
} from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import {
  KeyboardAccessoryBar,
  KEYBOARD_ACCESSORY_BAR_HEIGHT,
} from "@/components/keyboard-accessory-bar";
import { useKeyboardHeight } from "@/components/keyboard-accessory-bar/use-keyboard-height";
import { getKeyboardOverlap } from "@/components/keyboard-accessory-bar/utils";
import CodeEditor, {
  type CodeEditorRef,
  type EditorDocumentSpec,
  type InsertSpec,
} from "@/components/code-editor/code-editor";
import { createEditorRecovery } from "@/components/code-editor/editor-recovery";
import {
  applyEditorEdit,
  createRevisionTracker,
  markRevisionsSaved,
  resetRevisionTracker,
} from "@/components/code-editor/revision-tracker";
import { applySavedIdentity, resolveSaveExit } from "./save-exit";
import { saveToastMessage, selectOutcomeFailure } from "./save-failure";
import { isEntryGone } from "@/screens/transaction-detail-screen/selectors/select-entry-gone";
import {
  isOtherSlice,
  rememberSavedChecksum,
} from "@/screens/transaction-detail-screen/selectors/select-shown-checksum";
import { selectedTransactionVar } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { RouteLedgerUnavailable } from "@/components/route-ledger-unavailable";
import { i18n } from "@/translations";
import { useIsHere } from "@/common/hooks/use-is-here";
import { useRouteParams } from "@/common/hooks/use-route-params";
import * as Clipboard from "expo-clipboard";
import {
  entryLocation,
  relocatedEntryId,
  sameDayTransactionIds,
  type EntryLocation,
} from "./relocate-entry";

const SKELETON_WIDTHS = [220, 160, 280, 120, 200, 260, 140];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    hint: {
      fontSize: fontSizes.sm,
      color: theme.black80,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      lineHeight: 18,
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
    loadErrorText: {
      fontSize: fontSizes.sm,
      color: theme.error,
      padding: 24,
      textAlign: "center",
    },
    errorText: {
      fontSize: fontSizes.sm,
      color: theme.error,
      lineHeight: 18,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    accessoryWrapper: {
      position: "absolute",
      left: 0,
      right: 0,
    },
    saveButton: headerActionStyle(theme),
    saveButtonDisabled: {
      ...headerActionStyle(theme),
      opacity: 0.4,
    },
    cancelButton: {
      fontSize: fontSizes.lg,
      color: theme.black80,
    },
  });

export const EditTransactionScreen = (): JSX.Element => {
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const insets = useSafeAreaInsets();
  const confirmWrite = useLedgerWrite();
  const isHere = useIsHere();
  const client = useApolloClient();
  const { canWrite } = useLedgerAccess();
  const { userId } = useSession();
  const {
    entryHash,
    ledgerId,
    originAccount,
    sha256sum: shownSha,
  } = useRouteParams<{
    entryHash: string;
    ledgerId: string;
    originAccount?: string;
    sha256sum?: string;
  }>();
  const { currencies: operatingCurrencies } = useLedgerMeta(userId, ledgerId);

  // ── Entry context load ──────────────────────────────────────────────────────

  const {
    data,
    loading: contextLoading,
    error: contextError,
    refetch: refetchContext,
  } = useGetLedgerEntryContextQuery({
    variables: { entryHash: entryHash ?? "", ledgerId: ledgerId ?? "" },
    skip: !entryHash || !ledgerId,
    // network-only: the save targets this exact slice + checksum, so editing
    // from a persisted/stale cache would fail checksum validation on the
    // server (or worse, target an entry identity that no longer exists).
    fetchPolicy: "network-only",
  });

  const [initialized, setInitialized] = useState(false);
  const [documentSpec, setDocumentSpec] = useState<EditorDocumentSpec>({
    value: "",
    epoch: 0,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Checksum for the save, seeded from the loaded context. The entry's
  // identity (`entryHash`) is content-derived (beancount `hash_entry`), so a
  // successful save *changes* it: the mutation targets `entryHashRef`, which
  // starts as the route param and moves to the hash the server reports, so a
  // draft typed during a save can still be saved from this screen.
  const shaRef = useRef("");
  const entryHashRef = useRef(entryHash ?? "");
  // Where the entry was last read, to find it again once a change elsewhere
  // retired its ID (w21/823).
  const locationRef = useRef<EntryLocation | null>(null);
  const documentEpochRef = useRef(0);
  const revisionTrackerRef = useRef(createRevisionTracker());
  // The editor's text, kept so iOS killing its web view does not lose the draft
  // (w21/342, as the file editor; w21/621).
  const recoveryRef = useRef(createEditorRecovery());
  const insertSeq = useRef(0);
  const [insertSpec, setInsertSpec] = useState<InsertSpec | null>(null);
  // Set when a successful save navigates back, so the beforeRemove guard does
  // not mistake that navigation for a draft discard.
  const savedOutRef = useRef(false);

  // Seed the editor once per opened entry. A late load or a background
  // refetch must never replace an active draft — only the checksum/identity
  // refs track later context.
  useEffect(() => {
    const context = data?.getLedgerEntryContext;
    if (!context || initialized) return;
    // Another entry's text now answers this ID (w21/672).
    if (isOtherSlice(shownSha, context.sha256sum)) return;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = context.sha256sum;
    locationRef.current = entryLocation(context.entry);
    recoveryRef.current.loaded(context.slice);
    setDocumentSpec({ value: context.slice, epoch });
    setHasUnsavedChanges(false);
    setInitialized(true);
  }, [data, initialized, shownSha]);

  // The changed entry, found at the file and line it was read from: its
  // day's transactions are read, and the one still there is it (w21/823).
  const relocateEntry = useCallback(async () => {
    const at = locationRef.current;
    if (!at || !ledgerId) return null;
    try {
      const journal = await client.query({
        query: GetLedgerJournalDocument,
        variables: {
          ledgerId,
          query: { time: at.date, directiveTypes: ["Transaction"], limit: 50 },
        },
        fetchPolicy: "network-only",
      });
      const read = await Promise.all(
        sameDayTransactionIds(
          (journal.data?.getLedgerJournal?.data ?? []) as unknown[],
          at.date,
        ).map(async (candidate) => {
          try {
            const result = await client.query({
              query: GetLedgerEntryContextDocument,
              variables: { entryHash: candidate, ledgerId },
              fetchPolicy: "network-only",
            });
            return {
              entryHash: candidate,
              context: result.data?.getLedgerEntryContext ?? null,
            };
          } catch {
            return { entryHash: candidate, context: null };
          }
        }),
      );
      const found = relocatedEntryId(
        read.map(({ entryHash: id, context }) => ({
          entryHash: id,
          location: entryLocation(context?.entry),
        })),
        at,
      );
      const context = read.find((c) => c.entryHash === found)?.context;
      return found && context ? { entryHash: found, context } : null;
    } catch {
      return null;
    }
  }, [client, ledgerId]);

  // After a stale-checksum rejection the draft can never be saved as it is:
  // re-read the entry (under its current identity) and reseed the editor, the
  // same reset the effect above performs on first load.
  // Reload finds the entry gone when it was changed or removed elsewhere: its
  // hash no longer resolves. Say so instead of leaving a draft that fails on
  // every save, and refresh the lists behind (w21/028, as w21/013).
  const [entryGone, setEntryGone] = useState(false);
  const handleReload = useCallback(async () => {
    let context;
    try {
      const result = await refetchContext({
        entryHash: entryHashRef.current,
        ledgerId: ledgerId ?? "",
      });
      context = result.data?.getLedgerEntryContext;
    } catch (error: unknown) {
      if (!isEntryGone(error)) return;
    }
    if (!context) {
      // Changed elsewhere: its ID is gone, but it may still be where it was.
      const moved = await relocateEntry();
      if (moved) {
        entryHashRef.current = moved.entryHash;
        context = moved.context;
      }
    }
    if (!context) {
      setHasUnsavedChanges(false);
      setEntryGone(true);
      void invalidateLedgerData(client, "entries");
      return;
    }
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = context.sha256sum;
    locationRef.current = entryLocation(context.entry);
    recoveryRef.current.loaded(context.slice);
    setDocumentSpec({ value: context.slice, epoch });
    setHasUnsavedChanges(false);
    setSaveError(null);
    setInsertSpec(null);
  }, [ledgerId, refetchContext, client, relocateEntry]);

  // The conflict alert's way to keep the user's text (w21/817), as the Files
  // editor's (w21/273): copy it, then load the current version to paste it
  // into and save. "Keep Editing" alone can never save, and "Reload" drops it.
  const copyThenReload = useCallback(
    async (content: string) => {
      // The text now in the editor, which may be newer than the save's.
      const current = recoveryRef.current.latest() || content;
      try {
        await Clipboard.setStringAsync(current);
      } catch {
        // Reloading now would drop text that was not kept.
        Alert.alert(t("ledgerEditorCopyFailed"));
        return;
      }
      await handleReload();
    },
    [handleReload, t],
  );

  // ── Save ────────────────────────────────────────────────────────────────────

  // Everything ledger-derived is refreshed by `invalidateLedgerData` below.
  // Deliberately no entry-context refetch: the save changes the entry's
  // identity, so refetching the context queries this screen and the detail
  // behind it hold would only fire requests for a hash that no longer exists;
  // the detail screen is re-keyed on the way back instead.
  const [updateMutation] = useUpdateLedgerEntrySourceSliceMutation();
  const saveInFlightRef = useRef(false);

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
      setSaveError(null);
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
  // the page restarted from its first props (the original slice, a revision
  // counter at 0 and the last insert), so the draft goes back in under a new
  // epoch and the revision tracker restarts with it (w21/621).
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

  const handleSave = useCallback(
    async (
      content: string,
      epoch: number,
      revision: number,
    ): Promise<boolean> => {
      if (
        !canWrite ||
        epoch !== documentEpochRef.current ||
        saveInFlightRef.current
      )
        return false;

      // An empty edit would replace the entry with a blank line: a delete
      // without Delete's confirmation, reported as saved (w21/120).
      if (!content.trim()) {
        setSaveError(t("editTransactionEmpty"));
        return false;
      }

      const sha = shaRef.current;
      if (!sha) {
        setSaveError(t("editFailed"));
        return false;
      }

      saveInFlightRef.current = true;
      const targetEntryHash = entryHashRef.current;
      // The entry's identity after the save, as reported by the server.
      const saved: { entryHash?: string } = {};
      try {
        const outcome = await confirmWrite({
          perform: async () => {
            const result = await updateMutation({
              variables: {
                input: {
                  entryHash: targetEntryHash,
                  newContent: content,
                  sha256sum: sha,
                },
                ledgerId: ledgerId ?? "",
              },
            });
            const payload = result.data?.updateLedgerEntrySourceSlice;
            if (!payload?.newSha256sum) {
              throw new Error(t("editFailed"));
            }
            saved.entryHash = payload.entryHash;
            // Any follow-up save from this screen must target the entry as it
            // now exists: new checksum, and the new hash when reported.
            const next = applySavedIdentity(
              { entryHash: targetEntryHash, sha256sum: sha },
              payload,
            );
            shaRef.current = next.sha256sum;
            entryHashRef.current = next.entryHash;
            // The detail screen behind adopts this slice as its own, and no other.
            rememberSavedChecksum(next.sha256sum);
            return result;
          },
          loadingMessage: t("saving"),
          successMessage: t("editSuccess"),
          failureMessage: t("editFailed"),
          // The banner below explains a refusal in editor terms; the toast
          // would repeat it with the file's line numbers (w21/507).
          failureMessageFor: (error) =>
            saveToastMessage(error, i18n, t("editFailed")),
          // We navigate back ourselves (only when the save covered the latest
          // edit) because runLedgerWrite's own goBack would fire while the
          // draft still reads dirty and trip the unsaved-changes guard.
          goBackOnSuccess: false,
          afterSuccess: () => invalidateLedgerData(client, "entries"),
        });

        if (!outcome.ok) {
          // The refusal cites lines of the file; the editor shows the entry
          // from line 1 (w21/369).
          const meta = (
            data?.getLedgerEntryContext?.entry as unknown as
              { meta?: { filename?: string; lineno?: number } } | undefined
          )?.meta;
          const failure = selectOutcomeFailure(outcome, i18n, {
            draft: content,
            where:
              meta?.filename && typeof meta.lineno === "number"
                ? {
                    filename: meta.filename,
                    lineno: meta.lineno,
                    lineCount: content.split("\n").length,
                  }
                : undefined,
          });
          if (failure.kind === "conflict") {
            // A draft is never discarded without asking: reload is a choice.
            setSaveError(t("editConflict"));
            Alert.alert("", t("editConflict"), [
              { text: t("ledgerEditorKeepEditing"), style: "cancel" },
              {
                text: t("ledgerEditorCopyReload"),
                onPress: () => void copyThenReload(content),
              },
              {
                text: t("ledgerEditorReload"),
                style: "destructive",
                onPress: () => void handleReload(),
              },
            ]);
          } else {
            // The toast says "couldn't save"; the inline message says why.
            setSaveError(failure.message);
          }
          return false;
        }

        recoveryRef.current.saved(content);
        // Edits typed while the save was in flight are NOT covered by it —
        // stay on the screen with an accurate dirty flag in that case.
        const stillDirty = markRevisionsSaved(
          revisionTrackerRef.current,
          revision,
        );
        if (epoch === documentEpochRef.current) {
          setHasUnsavedChanges(stillDirty);
        }
        if (!stillDirty) {
          savedOutRef.current = true;
          // Against the route's ID, which the detail screen behind holds, not
          // the one this save targeted: after a save that stayed on screen the
          // target had moved, a comment-only save then read "unchanged" and
          // went back to a detail still keyed on the old ID, which showed
          // "changed or removed" (w21/937).
          const exit = resolveSaveExit(entryHash ?? "", saved.entryHash);
          // An edit that kept the entry's hash leaves the detail screen behind
          // with the copy stashed when its row was opened. It predates the
          // edit, and the screen preferred it to the refetched entry, so the
          // save looked lost: drop it, here or not (w21/388).
          if (exit.kind === "unchanged") selectedTransactionVar(null);
          // `dismiss(2)` pops two screens from wherever the user is now; left
          // during "Saving…", they stay where they are (w21/194).
          const here = isHere();
          if (here && exit.kind === "detail") {
            // The write changed the entry's content-derived identity, so the
            // detail screen behind holds a dead entryHash. The server told us
            // the new one: pop back to that screen with its params replaced
            // (expo-router `dismissTo` is a stack POP_TO by route name), so
            // it re-queries the entry under its fresh identity.
            router.dismissTo({
              pathname: "/transaction-detail",
              // `ledger` keeps the replaced params bound to the entry's ledger.
              params: originAccount
                ? {
                    entry_hash: exit.entryHash,
                    ledger: ledgerId,
                    origin_account: originAccount,
                  }
                : { entry_hash: exit.entryHash, ledger: ledgerId },
            });
          } else if (here && exit.kind === "unchanged") {
            // The entry kept its identity (a metadata edit, a comment, a
            // reordered posting): the detail screen behind is still the right
            // one. Its focus refetch can run before the write's invalidation
            // has bumped the revision it checks, and its context was never
            // evicted, so the entry is read again here first: the detail
            // screen watches this cache entry and paints what was saved
            // (w21/251, w21/472).
            await client
              .query({
                query: GetLedgerEntryContextDocument,
                variables: { entryHash: targetEntryHash, ledgerId },
                fetchPolicy: "network-only",
              })
              .catch(() => undefined);
            if (isHere()) {
              if (router.canGoBack()) router.back();
              else router.dismiss(2);
            }
          } else if (here) {
            // The server reported no new identity: land on the journal, which
            // the entries invalidation just refetched, rather than on a detail
            // screen that can only error.
            router.dismiss(2);
          }
        }
        return true;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [
      isHere,
      handleReload,
      copyThenReload,
      canWrite,
      client,
      confirmWrite,
      ledgerId,
      data,
      originAccount,
      router,
      t,
      updateMutation,
    ],
  );

  // ── Unsaved changes guard ───────────────────────────────────────────────────

  // A successful save navigates back itself; that is not a draft discard.
  useUnsavedChangesGuard(hasUnsavedChanges, savedOutRef);

  // ── Keyboard + accessory bar ────────────────────────────────────────────────

  const keyboardHeight = useKeyboardHeight();
  const isKeyboardVisible = keyboardHeight > 0;
  const showAccessory = canWrite && isKeyboardVisible && initialized;
  const keyboardOverlap = getKeyboardOverlap(
    keyboardHeight,
    insets.bottom,
    Platform.OS,
  );
  const editorKeyboardInset = isKeyboardVisible
    ? keyboardOverlap + (showAccessory ? KEYBOARD_ACCESSORY_BAR_HEIGHT : 0)
    : 0;

  const editorRef = useRef<CodeEditorRef>(null);

  const handleInsert = (text: string, cursorOffset?: number) => {
    setInsertSpec({ text, cursorOffset, seq: ++insertSeq.current });
  };

  // ── Header ──────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const saveDisabled = !hasUnsavedChanges;

  // ── Render ──────────────────────────────────────────────────────────────────

  const isFirstLoad = contextLoading && !initialized;
  const contextUnavailable =
    !isFirstLoad &&
    !initialized &&
    (Boolean(contextError) ||
      (!contextLoading && !data?.getLedgerEntryContext));

  // The entry changed or vanished elsewhere before the editor ever loaded it:
  // the context read answers NOT_FOUND (its content hash moved). That is the
  // removed state, not a bare load failure that fails the same on every tap,
  // and the ledger is invalidated so the detail behind shows it on return
  // (w21/253).
  const contextGone = !initialized && isEntryGone(contextError);
  // Or another entry's text answers the ID now (a twin moved onto it, w21/672).
  const contextReplaced =
    !initialized &&
    isOtherSlice(shownSha, data?.getLedgerEntryContext?.sha256sum);
  useEffect(() => {
    if (contextGone) void invalidateLedgerData(client, "entries");
  }, [contextGone, client]);
  useEffect(() => {
    if (contextReplaced) void invalidateLedgerData(client, "entries");
  }, [contextReplaced, client]);

  if (contextReplaced) {
    return (
      <RouteLedgerUnavailable
        title={t("editTransaction")}
        message={t("transactionDetailRemoved")}
      />
    );
  }

  if (entryGone || contextGone) {
    return (
      <RouteLedgerUnavailable
        title={t("editTransaction")}
        message={t("transactionDetailRemoved")}
      />
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("editTransaction"),
          headerLeft: () => (
            <Pressable
              onPress={handleCancel}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
            >
              <Text
                style={styles.cancelButton}
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
              >
                {t("cancel")}
              </Text>
            </Pressable>
          ),
          headerRight: canWrite
            ? () => (
                <Pressable
                  onPress={() => editorRef.current?.requestSave()}
                  hitSlop={8}
                  style={{ paddingHorizontal: 4 }}
                  disabled={saveDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={t("save")}
                  accessibilityState={{ disabled: saveDisabled }}
                >
                  <Text
                    style={
                      saveDisabled
                        ? styles.saveButtonDisabled
                        : styles.saveButton
                    }
                    maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
                  >
                    {t("save")}
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <Text style={styles.hint}>{t("editTransactionSource")}</Text>
      {saveError ? (
        <InlineError style={styles.errorText} message={saveError} />
      ) : null}

      <View style={styles.editorWrapper}>
        {isFirstLoad ? (
          <View style={styles.skeletonWrap}>
            {SKELETON_WIDTHS.map((w, i) => (
              <LoadingTile key={i} height={16} width={w} />
            ))}
          </View>
        ) : contextUnavailable ? (
          <FadeInView>
            <Text style={styles.loadErrorText}>
              {t("editTransactionLoadFailed")}
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
              onReady={handleEditorReady}
              onDraft={handleDraft}
              editorTheme={theme.editor}
              beancount
              keyboardInset={editorKeyboardInset}
              fontScale={fontScale}
              insertSpec={insertSpec}
              jumpToLine={null}
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
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
