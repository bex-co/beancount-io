import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme } from "@/types/theme-props";
import {
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
  useCreateLedgerFileMutation,
  useDeleteLedgerFileMutation,
  useGetLedgerDirContentQuery,
} from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { LedgerDrawerHeader } from "@/components/ledger-drawer";
import { useLedgerGuard } from "@/components/ledger-guard";
import { TextInputModal } from "@/components/text-input-modal";
import { analytics } from "@/common/analytics";
import { encodeLedgerFileContent } from "@/common/ledger-file-content";
import {
  buildLedgerFilePath,
  canDeleteLedgerFile,
  isEditable,
  normalizeLedgerFileName,
  popPathStack,
  pushPathStack,
  sortEntries,
} from "./utils";

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
    breadcrumbBack: {
      padding: space.xs,
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
      paddingLeft: gutter,
      paddingRight: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
    },
    rowDim: {
      opacity: 0.4,
    },
    rowIcon: {
      width: 28,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: theme.black,
      lineHeight: 20,
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
      marginLeft: gutter + 28,
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
      color: theme.black60,
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
      color: theme.black60,
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
    headerAction: {
      padding: 4,
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
}: {
  entry: DirEntry;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
}): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const isDir = entry.type === "dir";
  const editable = !isDir && isEditable(entry.name);
  const tappable = isDir || editable;
  const protectedFile = !isDir && !canDeleteLedgerFile(entry.name);

  const iconName = isDir
    ? "folder-outline"
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
      >
        <View style={styles.rowIcon}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {entry.name}
        </Text>
        {tappable && (
          <Ionicons name="chevron-forward" size={18} color={theme.black40} />
        )}
      </TouchableOpacity>

      {!isDir &&
        (protectedFile ? (
          <TouchableOpacity
            style={styles.rowAction}
            accessibilityLabel={t("ledgerMainFileProtected")}
            activeOpacity={0.6}
            onPress={() => Alert.alert(t("ledgerMainFileProtected"))}
          >
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={theme.black40}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.rowAction, deleting && styles.rowActionDisabled]}
            accessibilityLabel={t("ledgerDeleteFile", { name: entry.name })}
            activeOpacity={0.6}
            disabled={deleting}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LedgerFileBrowserScreen(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();
  const toast = useToast();

  // Internal directory navigation stack (root = "")
  const [pathStack, setPathStack] = useState<string[]>([""]);
  const currentPath = pathStack[pathStack.length - 1];
  const inSubDir = pathStack.length > 1;

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const createInFlightRef = useRef(false);
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

  const isFirstLoad = loading && !data;

  const [createLedgerFile, { loading: creating }] =
    useCreateLedgerFileMutation();
  const [deleteLedgerFile] = useDeleteLedgerFileMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      analytics.track("pull_refresh_ledger_files", { path: currentPath });
    } catch (refreshError: unknown) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : t("ledgerLoadError");
      toast.showToast({ message, type: "error" });
    } finally {
      setRefreshing(false);
    }
  }, [currentPath, refetch, t, toast]);

  const isValidNewFilename = useCallback(
    (input: string) => {
      const filename = normalizeLedgerFileName(input);
      return (
        filename !== null && !entries.some((entry) => entry.name === filename)
      );
    },
    [entries],
  );

  const handleCreate = useCallback(
    async (input: string) => {
      const filename = normalizeLedgerFileName(input);
      if (
        !filename ||
        entries.some((entry) => entry.name === filename) ||
        createInFlightRef.current
      )
        return;

      const filePath = buildLedgerFilePath(currentPath, filename);
      createInFlightRef.current = true;
      setCreateModalVisible(false);
      analytics.track("create_ledger_file", { path: filePath });
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
        toast.showToast({
          message: t("ledgerCreateFileSuccess", { name: filename }),
          type: "success",
        });
        await refetch().catch(() => undefined);
        router.push({
          pathname: "/(app)/ledger-file-editor",
          params: { path: createdPath },
        });
      } catch (createError: unknown) {
        const message =
          createError instanceof Error
            ? createError.message
            : t("ledgerCreateFileFailed");
        toast.showToast({ message, type: "error" });
      } finally {
        createInFlightRef.current = false;
      }
    },
    [createLedgerFile, currentPath, entries, ledgerId, refetch, t, toast],
  );

  const confirmDelete = useCallback(
    async (entry: DirEntry) => {
      if (!canDeleteLedgerFile(entry.name) || deleteInFlightRef.current) return;

      deleteInFlightRef.current = true;
      setDeletingPath(entry.path);
      analytics.track("delete_ledger_file", { path: entry.path });
      try {
        await deleteLedgerFile({
          variables: {
            ledgerId,
            path: entry.path,
            sha: entry.sha,
            message: `delete ${entry.path}`,
          },
        });
        toast.showToast({
          message: t("ledgerDeleteFileSuccess", { name: entry.name }),
          type: "success",
        });
        await refetch().catch(() => undefined);
      } catch (deleteError: unknown) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : t("ledgerDeleteFileFailed");
        toast.showToast({ message, type: "error" });
      } finally {
        deleteInFlightRef.current = false;
        setDeletingPath(null);
      }
    },
    [deleteLedgerFile, ledgerId, refetch, t, toast],
  );

  const handleDelete = useCallback(
    (entry: DirEntry) => {
      if (!canDeleteLedgerFile(entry.name)) return;
      analytics.track("delete_ledger_file_prompt", { path: entry.path });
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
    [confirmDelete, t],
  );

  const handleEntryPress = (entry: DirEntry) => {
    if (entry.type === "dir") {
      setPathStack((prev) => pushPathStack(prev, entry.path));
      analytics.track("tap_ledger_dir", { path: entry.path });
    } else if (isEditable(entry.name)) {
      analytics.track("tap_ledger_file", { path: entry.path });
      router.push({
        pathname: "/(app)/ledger-file-editor",
        params: { path: entry.path },
      });
    }
  };

  const handleBack = () => {
    setPathStack((prev) => popPathStack(prev));
  };

  const breadcrumbLabel = inSubDir ? currentPath : "";

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader
        title={t("files")}
        right={
          <TouchableOpacity
            style={styles.headerAction}
            accessibilityLabel={t("ledgerCreateFile")}
            activeOpacity={0.7}
            disabled={creating}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={creating ? theme.black40 : theme.primary}
            />
          </TouchableOpacity>
        }
      />

      {inSubDir && (
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity
            style={styles.breadcrumbBack}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {breadcrumbLabel}
          </Text>
        </View>
      )}

      {isFirstLoad ? (
        <SkeletonList />
      ) : (
        <FlatList
          data={sorted}
          contentContainerStyle={styles.listContent}
          alwaysBounceVertical
          keyExtractor={(item) => item.path}
          renderItem={({ item, index }) => (
            <View>
              <FileRow
                entry={item}
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
                name={error ? "cloud-offline-outline" : "folder-open-outline"}
                size={40}
                color={error ? theme.error : theme.black40}
              />
              <Text style={error ? styles.errorText : styles.emptyText}>
                {error ? t("ledgerLoadError") : t("ledgerEmpty")}
              </Text>
              <Text style={styles.stateHint}>
                {error ? t("ledgerRefreshHint") : t("ledgerEmptyHint")}
              </Text>
              {!error && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  activeOpacity={0.7}
                  disabled={creating}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color={theme.white} />
                  <Text style={styles.emptyActionText}>
                    {t("ledgerCreateFile")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}

      <TextInputModal
        visible={createModalVisible}
        title={t("ledgerCreateFileTitle")}
        message={t("ledgerCreateFileMessage")}
        placeholder={t("ledgerCreateFilePlaceholder")}
        confirmButtonText={t("ledgerCreateFile")}
        cancelButtonText={t("cancel")}
        validateInput={isValidNewFilename}
        onConfirm={(input) => void handleCreate(input)}
        onCancel={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
}
