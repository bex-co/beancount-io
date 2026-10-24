import {
  LEDGER_ERROR_QUERIES,
  refetchNamedQueries,
} from "@/common/apollo/refresh-named-queries";
import { isolatePath } from "@/common/bidi";
import { routeText } from "@/common/route-text";
import { isConflictFailure } from "@/common/ledger-conflict";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { useGuest } from "@/common/guest/guest-context";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  Alert,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
  useNavigation,
  useScrollToTop,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import {
  fontSizes,
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToast } from "@/common/hooks/use-toast";
import {
  GetLedgerDirContentDocument,
  type GetLedgerDirContentQuery,
  useCreateLedgerFileMutation,
  useDeleteLedgerFileMutation,
  useGetLedgerDirContentQuery,
} from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { LedgerDrawerHeader } from "@/components/ledger-drawer";
import { useLedgerGuard } from "@/components/ledger-guard";
import { TextInputModal } from "@/components/text-input-modal";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { haptics } from "@/common/haptics";
import { settleWithin } from "@/common/settle-within";
import { CONNECTION_TIMEOUT_MS } from "@/common/oauth/discovery";
import { encodeLedgerFileContent } from "@/common/ledger-file-content";
import { isOpenableTextEntry } from "@/common/ledger-file-types";
import {
  buildLedgerFilePath,
  canDeleteLedgerFile,
  checkLedgerFileName,
  clashingFileName,
  clashIsFolder,
  deleteEmptiesFolder,
  listingHasFile,
  parentDirectory,
  isFolderGone,
  popPathStack,
  popPathStackFrom,
  pushPathStack,
  sortEntries,
  pathStackForLedger,
  type LedgerPathStack,
} from "./utils";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";
import { ledgerVar } from "@/common/vars";
import { useIsHere } from "@/common/hooks/use-is-here";
import { iconActionSize } from "@/common/theme/spacing";

// ─── Types ────────────────────────────────────────────────────────────────────

type DirEntry = {
  name: string;
  path: string;
  type: string;
  size: number;
  sha: string;
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const SKELETON_WIDTHS = [160, 220, 140, 200, 170, 110, 190];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    breadcrumbRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: sectionHeaderPaddingVertical,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black40,
      backgroundColor: theme.white,
      gap: space.xs,
    },
    // A 44 pt target around the 20 pt icon, not 28 (w21/485).
    breadcrumbBack: {
      minWidth: iconActionSize,
      minHeight: iconActionSize,
      alignItems: "center",
      justifyContent: "center",
    },
    breadcrumbText: {
      fontSize: 13,
      color: theme.black80,
      fontWeight: "500",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.white,
    },
    rowContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
    },
    rowDim: {
      opacity: 0.4,
    },
    rowIcon: {
      width: 28,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 15,
      color: theme.black,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    rowNote: {
      fontSize: fontSizes.sm,
      color: theme.black80,
      lineHeight: 18,
      textAlign: LEADING_TEXT_ALIGN,
    },
    rowAction: {
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
    },
    rowActionDisabled: {
      opacity: 0.35,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
      // Indented to the row's text start: gutter + the icon slot width.
      marginStart: gutter + 28,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
      gap: space.md,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: space.sm,
    },
    emptyText: {
      fontSize: 15,
      color: theme.black80,
    },
    errorText: {
      fontSize: 14,
      color: theme.error,
      paddingHorizontal: gutter,
      paddingVertical: space.xl,
      textAlign: "center",
    },
    stateHint: {
      maxWidth: 280,
      paddingHorizontal: space.xl,
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      color: theme.black80,
    },
    emptyAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: space.sm,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: space.sm,
      backgroundColor: theme.primary,
    },
    emptyActionText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.white,
    },
    listContent: {
      flexGrow: 1,
    },
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonList(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <>
      {SKELETON_WIDTHS.map((w, i) => (
        <View key={i} style={styles.skeletonRow}>
          <LoadingTile height={18} width={18} />
          <LoadingTile height={16} width={w} />
        </View>
      ))}
    </>
  );
}

function FileRow({
  entry,
  onPress,
  onDelete,
  deleting,
  canWrite,
}: {
  entry: DirEntry;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
  canWrite: boolean;
}): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const isDir = entry.type === "dir";
  const editable = !isDir && isOpenableTextEntry(entry);
  const isLink = entry.type === "symlink" || entry.type === "submodule";
  const tappable = isDir || editable;
  const protectedFile = !isDir && !canDeleteLedgerFile(entry.path);

  const iconName = isDir
    ? "folder-outline"
    : isLink
      ? "link-outline"
      : editable
        ? "code-slash-outline"
        : "document-outline";

  const iconColor = isDir
    ? theme.primary
    : editable
      ? theme.black80
      : theme.black40;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.rowContent, !tappable && styles.rowDim]}
        activeOpacity={0.7}
        disabled={!tappable}
        onPress={onPress}
        accessibilityRole={tappable ? "button" : undefined}
        // The kind tells a folder from a file of the same name (w21/142).
        accessibilityLabel={t(
          isDir ? "ledgerFilesFolderLabel" : "ledgerFilesFileLabel",
          { name: entry.name },
        )}
        accessibilityState={{ disabled: !tappable }}
        accessibilityHint={tappable ? undefined : t("ledgerFileNotText")}
      >
        <View style={styles.rowIcon}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name={iconName}
            size={20}
            color={iconColor}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {entry.name}
          </Text>
          {/* A dimmed row said nothing of why it would not open (w21/771). */}
          {!tappable && (
            <Text style={styles.rowNote} numberOfLines={1}>
              {t("ledgerFileNotText")}
            </Text>
          )}
        </View>
        {tappable && (
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name={directionalIcon("chevron-forward")}
            size={18}
            color={theme.black40}
          />
        )}
      </TouchableOpacity>

      {canWrite &&
        !isDir &&
        (protectedFile ? (
          <TouchableOpacity
            style={styles.rowAction}
            accessibilityRole="button"
            accessibilityLabel={t("ledgerMainFileProtected")}
            activeOpacity={0.6}
            onPress={() => Alert.alert(t("ledgerMainFileProtected"))}
          >
            {/* A button of its own: the hairline grey was 1.34:1 (w21/702). */}
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="lock-closed-outline"
              size={19}
              color={theme.black80}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.rowAction, deleting && styles.rowActionDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t("ledgerDeleteFile", { name: entry.name })}
            accessibilityState={{ disabled: deleting }}
            activeOpacity={0.6}
            disabled={deleting}
            onPress={onDelete}
          >
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="trash-outline"
              size={20}
              color={theme.error}
            />
          </TouchableOpacity>
        ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LedgerFileBrowserScreen(): JSX.Element {
  const listRef = useRef<FlatList<DirEntry>>(null);
  useScrollToTop(listRef);

  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const guest = useGuest();
  const { canWrite } = useLedgerAccess();
  const toast = useToast();
  const client = useApolloClient();

  // Internal directory navigation stack (root = ""), scoped to its ledger so a
  // ledger switch starts at the new ledger's root, never in the old folder.
  const [pathState, setPathState] = useState<LedgerPathStack>(() => ({
    ledgerId,
    stack: [""],
  }));
  const pathStack = pathStackForLedger(pathState, ledgerId);
  const updatePathStack = (next: (stack: string[]) => string[]) =>
    setPathState((prev) => ({
      ledgerId,
      stack: next(pathStackForLedger(prev, ledgerId)),
    }));
  const currentPath = pathStack[pathStack.length - 1];
  const inSubDir = pathStack.length > 1;

  // Android's Back goes up a folder before it leaves the tab, and tapping the
  // Files tab again goes back to the root (w21/274). The folder stack is
  // component state, so without this Back left the tab from any depth.
  const goUp = useCallback(
    () =>
      setPathState((prev) => ({
        ledgerId,
        stack: popPathStack(pathStackForLedger(prev, ledgerId)),
      })),
    [ledgerId],
  );
  useFocusEffect(
    useCallback(() => {
      if (!inSubDir) return undefined;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          goUp();
          return true;
        },
      );
      return () => subscription.remove();
    }, [goUp, inSubDir]),
  );
  const navigation = useNavigation();
  useEffect(() => {
    if (!inSubDir) return undefined;
    return navigation.addListener("tabPress" as never, () => {
      if (navigation.isFocused()) {
        setPathState({ ledgerId, stack: [""] });
      }
    });
  }, [inSubDir, ledgerId, navigation]);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  // Names into other folders found to exist already, shown as "already exists".
  const [knownExisting, setKnownExisting] = useState<string[]>([]);
  const openCreateDialog = useCallback(() => {
    setKnownExisting([]);
    setCreateModalVisible(true);
  }, [setKnownExisting, setCreateModalVisible]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const isHere = useIsHere();
  const createInFlightRef = useRef(false);
  // Which Create attempt is current. Cancel moves it on, so an attempt still
  // waiting on the folder lookup finds itself void and writes nothing (w21/376).
  const createAttemptRef = useRef(0);
  const [lookingUp, setLookingUp] = useState(false);
  const cancelCreate = () => {
    createAttemptRef.current += 1;
    createInFlightRef.current = false;
    setLookingUp(false);
    setCreateModalVisible(false);
  };
  const deleteInFlightRef = useRef(false);

  const { data, loading, error, refetch } = useGetLedgerDirContentQuery({
    variables: { ledgerId, dirPath: currentPath || undefined },
    fetchPolicy: "cache-and-network",
  });

  const entries: DirEntry[] = useMemo(
    () =>
      (data?.getLedgerDirContent ?? []).map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
        sha: entry.sha,
      })),
    [data?.getLedgerDirContent],
  );

  const sorted = useMemo(() => sortEntries(entries), [entries]);

  // A folder removed by another client, or by our own delete, steps up to the
  // nearest folder that still lists (w21/088).
  const folderGone = isFolderGone(error, pathStack);
  useEffect(() => {
    if (folderGone) updatePathStack(popPathStack);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updatePathStack is rebuilt each render
  }, [folderGone, currentPath]);

  const isFirstLoad = loading && !data;

  const [createLedgerFile, { loading: creating }] =
    useCreateLedgerFileMutation();
  const [deleteLedgerFile] = useDeleteLedgerFileMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchNamedQueries(client, LEDGER_ERROR_QUERIES),
      ]);
    } catch {
      // A read: the generic load failure, not the transport's text (w21/117).
      toast.showToast({ message: t("ledgerLoadError"), type: "error" });
    } finally {
      setRefreshing(false);
    }
  }, [client, currentPath, refetch, t, toast]);

  // Create is disabled with the reason under the field, never silently.
  const validateNewFilename = useCallback(
    (input: string): boolean | string => {
      const check = checkLedgerFileName(
        input,
        [...entries.map((entry) => entry.name), ...knownExisting],
        {
          files: entries
            .filter((entry) => entry.type !== "dir")
            .map((entry) => entry.name),
          folders: entries
            .filter((entry) => entry.type === "dir")
            .map((entry) => entry.name),
        },
      );
      if (check.ok) return true;
      switch (check.issue) {
        case "empty":
          return false;
        case "exists":
          return t("ledgerFileNameExists", {
            name: check.existing ?? check.filename,
          });
        case "folderExists":
          return t("ledgerFolderNameExists", { name: check.existing });
        case "extension":
          return t("ledgerFileNameExtension");
        case "git":
          return t("ledgerFileNameGit");
        case "path":
          return t("ledgerFileNamePath");
        case "portable":
          return t("ledgerFileNamePortable");
      }
    },
    [entries, knownExisting, t],
  );

  const handleCreate = useCallback(
    async (input: string) => {
      const check = checkLedgerFileName(
        input,
        [...entries.map((entry) => entry.name), ...knownExisting],
        {
          files: entries
            .filter((entry) => entry.type !== "dir")
            .map((entry) => entry.name),
          folders: entries
            .filter((entry) => entry.type === "dir")
            .map((entry) => entry.name),
        },
      );
      if (!check.ok || !canWrite || createInFlightRef.current) return;
      const { filename } = check;

      const filePath = buildLedgerFilePath(currentPath, filename);
      createInFlightRef.current = true;
      const attempt = (createAttemptRef.current += 1);
      // A name into another folder is checked against that folder's listing
      // while the dialog is still open, so a clash shows under the field with
      // the typed name kept, instead of a failed create after it closed
      // (w21/222). If the listing cannot be read, the server stays the judge.
      if (filename.includes("/")) {
        setLookingUp(true);
        try {
          // Bounded: a hung server must not hold the dialog open for the OS
          // request timeout. Past the bound the server stays the judge.
          const lookup = await settleWithin(
            client.query<GetLedgerDirContentQuery>({
              query: GetLedgerDirContentDocument,
              variables: { ledgerId, dirPath: parentDirectory(filePath) },
              fetchPolicy: "network-only",
            }),
            CONNECTION_TIMEOUT_MS,
          );
          // Cancelled meanwhile: create nothing, open nothing (w21/376).
          if (createAttemptRef.current !== attempt) return;
          if (
            lookup.status === "done" &&
            listingHasFile(
              lookup.value.data?.getLedgerDirContent ?? [],
              filePath,
            )
          ) {
            setKnownExisting((known) => [...known, filename]);
            createInFlightRef.current = false;
            setLookingUp(false);
            return;
          }
        } catch {
          // Unreadable or absent folder: nothing to clash with, or the server
          // will say so.
        }
        if (createAttemptRef.current !== attempt) return;
        setLookingUp(false);
      }
      setCreateModalVisible(false);
      try {
        const result = await createLedgerFile({
          variables: {
            ledgerId,
            path: filePath,
            content: encodeLedgerFileContent(""),
            message: `create ${filePath}`,
          },
        });
        const createdPath = result.data?.createLedgerFile.path ?? filePath;
        haptics.success();
        // The editor opens the *selected* ledger's file. Switched, or left,
        // during the create, the file exists in the ledger it was made in
        // and opening that path elsewhere could edit another ledger's file
        // of the same name (w21/196): say where, and open nothing.
        const stayedHere = ledgerVar() === ledgerId && isHere();
        toast.showToast({
          message: stayedHere
            ? t("ledgerCreateFileSuccess", { name: filename })
            : t("ledgerCreateFileSuccessIn", {
                name: filename,
                ledger: ledgerId,
              }),
          type: "success",
        });
        // Not awaited: the user is on their way into the editor, and the
        // listing behind them repaints as soon as the refetch lands.
        void invalidateLedgerData(client, "file");
        if (!stayedHere) return;
        router.push({
          pathname: guest
            ? "/examples/ledger-file-editor"
            : "/(app)/ledger-file-editor",
          params: { path: routeText(createdPath), ledger: ledgerId },
        });
      } catch (createError: unknown) {
        haptics.error();
        // A file of that name is there already (another device made it, or the
        // list was stale): say so by name, remember it, and refresh the list,
        // where the generic failure toast told the user nothing (w21/564).
        if (isConflictFailure(createError)) {
          const existing = clashingFileName(createError, filename);
          void invalidateLedgerData(client, "file");
          // A folder twin below the first level: named as the folder it is,
          // and not remembered as a name of this folder (w21/989).
          if (clashIsFolder(existing, filePath)) {
            toast.showToast({
              message: t("ledgerFolderNameExists", { name: existing }),
              type: "error",
            });
            return;
          }
          setKnownExisting((known) => [...known, existing]);
          toast.showToast({
            message: t("ledgerFileNameExists", { name: existing }),
            type: "error",
          });
          return;
        }
        const message =
          ledgerWriteFailureMessage(createError, { t }) ??
          t("ledgerCreateFileFailed");
        toast.showToast({ message, type: "error" });
      } finally {
        createInFlightRef.current = false;
      }
    },
    [
      client,
      guest,
      isHere,
      canWrite,
      createLedgerFile,
      currentPath,
      entries,
      knownExisting,
      ledgerId,
      refetch,
      t,
      toast,
    ],
  );

  const confirmDelete = useCallback(
    async (entry: DirEntry) => {
      if (
        !canWrite ||
        !canDeleteLedgerFile(entry.path) ||
        deleteInFlightRef.current
      )
        return;

      deleteInFlightRef.current = true;
      setDeletingPath(entry.path);
      // The folder this delete was tapped in; Back may move on before it ends.
      const tappedIn = pathStack[pathStack.length - 1]!;
      try {
        await deleteLedgerFile({
          variables: {
            ledgerId,
            path: entry.path,
            sha: entry.sha,
            message: `delete ${entry.path}`,
          },
        });
        haptics.success();
        toast.showToast({
          message: t("ledgerDeleteFileSuccess", { name: entry.name }),
          type: "success",
        });
        // The folder's last file takes the folder with it: list its parent.
        if (deleteEmptiesFolder(pathStack, sorted.length)) {
          updatePathStack((stack) => popPathStackFrom(stack, tappedIn));
        }
        // Awaited: the delete buttons stay disabled until the row is actually
        // gone, so a second tap can't resend the sha we just spent.
        await invalidateLedgerData(client, "file");
      } catch (deleteError: unknown) {
        haptics.error();
        // The file changed elsewhere, so the sha in hand is spent and every
        // retry would send it again: refresh the list and say so, instead of
        // the server's "sha does not match [given: …]" (w21/380).
        const changed = isConflictFailure(deleteError);
        if (changed) await invalidateLedgerData(client, "file");
        const message = changed
          ? t("ledgerDeleteFileChanged")
          : (ledgerWriteFailureMessage(
              deleteError,
              { t },
              undefined,
              "delete",
            ) ?? t("ledgerDeleteFileFailed"));
        toast.showToast({ message, type: "error" });
      } finally {
        deleteInFlightRef.current = false;
        setDeletingPath(null);
      }
    },
    [
      canWrite,
      client,
      deleteLedgerFile,
      ledgerId,
      pathStack,
      refetch,
      sorted.length,
      t,
      toast,
      updatePathStack,
    ],
  );

  const handleDelete = useCallback(
    (entry: DirEntry) => {
      if (!canWrite || !canDeleteLedgerFile(entry.path)) return;
      Alert.alert(
        t("ledgerDeleteFileTitle"),
        t("ledgerDeleteFileMessage", { name: entry.name }),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("ledgerDeleteFileConfirm"),
            style: "destructive",
            onPress: () => void confirmDelete(entry),
          },
        ],
      );
    },
    [canWrite, confirmDelete, t],
  );

  const handleEntryPress = (entry: DirEntry) => {
    if (entry.type === "dir") {
      updatePathStack((stack) => pushPathStack(stack, entry.path));
    } else if (isOpenableTextEntry(entry)) {
      router.push({
        pathname: guest
          ? "/examples/ledger-file-editor"
          : "/(app)/ledger-file-editor",
        params: { path: routeText(entry.path), ledger: ledgerId },
      });
    }
  };

  const handleBack = () => {
    updatePathStack(popPathStack);
  };

  const breadcrumbLabel = inSubDir ? currentPath : "";
  // The up button names the folder it goes to; the root has no folder name
  // (w21/277).
  const parentFolder = parentDirectory(currentPath).split("/").pop() ?? "";

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("files")}
        action={
          canWrite && {
            accessibilityLabel: t("ledgerCreateFile"),
            onPress: openCreateDialog,
            icon: (
              <Ionicons
                accessibilityElementsHidden
                importantForAccessibility="no"
                name="add-circle-outline"
                size={26}
                color={creating ? theme.black40 : theme.primary}
              />
            ),
            disabled: creating,
          }
        }
      />

      {inSubDir && (
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity
            style={styles.breadcrumbBack}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              parentFolder
                ? t("ledgerNavigateUpTo", { folder: parentFolder })
                : t("ledgerNavigateUp")
            }
          >
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name={directionalIcon("chevron-back")}
              size={20}
              color={theme.primary}
            />
          </TouchableOpacity>
          <Text
            style={styles.breadcrumbText}
            numberOfLines={1}
            ellipsizeMode="head"
          >
            {isolatePath(breadcrumbLabel)}
          </Text>
        </View>
      )}

      {isFirstLoad ? (
        <SkeletonList />
      ) : (
        <FadeInView fill>
          <FlatList
            ref={listRef}
            data={sorted}
            contentContainerStyle={styles.listContent}
            contentInsetAdjustmentBehavior="automatic"
            alwaysBounceVertical
            keyExtractor={(item) => item.path}
            renderItem={({ item, index }) => (
              <View>
                <FileRow
                  entry={item}
                  canWrite={canWrite}
                  deleting={deletingPath !== null}
                  onPress={() => handleEntryPress(item)}
                  onDelete={() => handleDelete(item)}
                />
                {index < sorted.length - 1 && <View style={styles.divider} />}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name={error ? "cloud-offline-outline" : "folder-open-outline"}
                  size={40}
                  color={error ? theme.error : theme.black40}
                />
                <Text style={error ? styles.errorText : styles.emptyText}>
                  {error ? t("ledgerLoadError") : t("ledgerEmpty")}
                </Text>
                <Text style={styles.stateHint}>
                  {error
                    ? t("ledgerRefreshHint")
                    : t(canWrite ? "ledgerEmptyHint" : "ledgerEmptyHintReader")}
                </Text>
                {!error && canWrite && (
                  <TouchableOpacity
                    style={styles.emptyAction}
                    activeOpacity={0.7}
                    disabled={creating}
                    onPress={openCreateDialog}
                    accessibilityRole="button"
                    accessibilityLabel={t("ledgerCreateFile")}
                    accessibilityState={{ disabled: creating }}
                  >
                    <Ionicons
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      name="add"
                      size={18}
                      color={theme.white}
                    />
                    <Text style={styles.emptyActionText}>
                      {t("ledgerCreateFile")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            refreshControl={
              <ThemedRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          />
        </FadeInView>
      )}

      <TextInputModal
        visible={createModalVisible}
        title={t("ledgerCreateFileTitle")}
        message={t("ledgerCreateFileMessage")}
        placeholder={t("ledgerCreateFilePlaceholder")}
        confirmButtonText={t("ledgerCreateFile")}
        cancelButtonText={t("cancel")}
        validateInput={validateNewFilename}
        busy={lookingUp}
        onConfirm={(input) => void handleCreate(input)}
        onCancel={cancelCreate}
      />
    </View>
  );
}
