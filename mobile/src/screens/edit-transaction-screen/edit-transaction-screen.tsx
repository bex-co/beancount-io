import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useApolloClient } from "@apollo/client";
import { fontSizes, headerActionStyle, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useSession } from "@/common/hooks/use-session";
import { ColorTheme } from "@/types/theme-props";
import {
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
import {
  applyEditorEdit,
  createRevisionTracker,
  markRevisionsSaved,
  resetRevisionTracker,
} from "@/components/code-editor/revision-tracker";
import { applySavedIdentity, resolveSaveExit } from "./save-exit";

const SKELETON_WIDTHS = [220, 160, 280, 120, 200, 260, 140];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    hint: {
      fontSize: fontSizes.sm,
      color: theme.black60,
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
      color: theme.black60,
    },
  });

export const EditTransactionScreen = (): JSX.Element => {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const insets = useSafeAreaInsets();
  const confirmWrite = useLedgerWrite();
  const client = useApolloClient();
  const { canWrite } = useLedgerAccess();
  const { userId } = useSession();
  const { entryHash, ledgerId, originAccount } = useLocalSearchParams<{
    entryHash: string;
    ledgerId: string;
    originAccount?: string;
  }>();
  const { currencies: operatingCurrencies } = useLedgerMeta(userId, ledgerId);

  // ── Entry context load ──────────────────────────────────────────────────────

  const {
    data,
    loading: contextLoading,
    error: contextError,
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
  const documentEpochRef = useRef(0);
  const revisionTrackerRef = useRef(createRevisionTracker());
  // Set when a successful save navigates back, so the beforeRemove guard does
  // not mistake that navigation for a draft discard.
  const savedOutRef = useRef(false);

  // Seed the editor once per opened entry. A late load or a background
  // refetch must never replace an active draft — only the checksum/identity
  // refs track later context.
  useEffect(() => {
    const context = data?.getLedgerEntryContext;
    if (!context || initialized) return;
    const epoch = documentEpochRef.current + 1;
    documentEpochRef.current = epoch;
    resetRevisionTracker(revisionTrackerRef.current);
    shaRef.current = context.sha256sum;
    setDocumentSpec({ value: context.slice, epoch });
    setHasUnsavedChanges(false);
    setInitialized(true);
  }, [data, initialized]);

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
    },
    [],
  );

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
            return result;
          },
          loadingMessage: t("saving"),
          successMessage: t("editSuccess"),
          failureMessage: t("editFailed"),
          // We navigate back ourselves (only when the save covered the latest
          // edit) because runLedgerWrite's own goBack would fire while the
          // draft still reads dirty and trip the unsaved-changes guard.
          goBackOnSuccess: false,
          afterSuccess: () => invalidateLedgerData(client, "entries"),
        });

        if (!outcome.ok) {
          // The toast says "couldn't save"; the inline message says why.
          setSaveError(
            outcome.error instanceof Error
              ? outcome.error.message
              : outcome.message,
          );
          return false;
        }

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
          const exit = resolveSaveExit(targetEntryHash, saved.entryHash);
          if (exit.kind === "detail") {
            // The write changed the entry's content-derived identity, so the
            // detail screen behind holds a dead entryHash. The server told us
            // the new one: pop back to that screen with its params replaced
            // (expo-router `dismissTo` is a stack POP_TO by route name), so
            // it re-queries the entry under its fresh identity.
            router.dismissTo({
              pathname: "/transaction-detail",
              params: originAccount
                ? { entry_hash: exit.entryHash, origin_account: originAccount }
                : { entry_hash: exit.entryHash },
            });
          } else {
            // No usable new identity (an older server echoes the request
            // hash): land on the journal, which the entries invalidation just
            // refetched, rather than on a detail screen that can only error.
            router.dismiss(2);
          }
        }
        return true;
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [
      canWrite,
      client,
      confirmWrite,
      ledgerId,
      originAccount,
      router,
      t,
      updateMutation,
    ],
  );

  // ── Unsaved changes guard ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // A successful save navigates back itself; that is not a draft discard.
      if (savedOutRef.current || !hasUnsavedChanges) return;
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

  // ── Keyboard + accessory bar ────────────────────────────────────────────────

  const keyboardHeight = useKeyboardHeight();
  const isKeyboardVisible = keyboardHeight > 0;
  const showAccessory = canWrite && isKeyboardVisible && initialized;
  const keyboardOverlap = getKeyboardOverlap(keyboardHeight, insets.bottom);
  const editorKeyboardInset = isKeyboardVisible
    ? keyboardOverlap + (showAccessory ? KEYBOARD_ACCESSORY_BAR_HEIGHT : 0)
    : 0;

  const insertSeq = useRef(0);
  const [insertSpec, setInsertSpec] = useState<InsertSpec | null>(null);
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
              <Text style={styles.cancelButton}>{t("cancel")}</Text>
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
                  >
                    {t("save")}
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <Text style={styles.hint}>{t("editTransactionSource")}</Text>
      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

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
              editorTheme={theme.editor}
              beancount
              keyboardInset={editorKeyboardInset}
              insertSpec={insertSpec}
              jumpToLine={null}
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
};
