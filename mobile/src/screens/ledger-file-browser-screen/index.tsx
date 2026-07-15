import { useState } from "react";
import {
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
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { useGetLedgerDirContentQuery } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { LedgerDrawerHeader } from "@/components/ledger-drawer";
import { useLedgerGuard } from "@/components/ledger-guard";
import { analytics } from "@/common/analytics";
import { isEditable, sortEntries, pushPathStack, popPathStack } from "./utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DirEntry = {
  name: string;
  path: string;
  type: string;
  size: number;
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
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black40,
      backgroundColor: theme.white,
      gap: 4,
    },
    breadcrumbBack: {
      padding: 4,
    },
    breadcrumbText: {
      fontSize: 13,
      color: theme.black80,
      fontWeight: "500",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.white,
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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
      marginLeft: 16 + 28,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    emptyText: {
      fontSize: 15,
      color: theme.black60,
    },
    errorText: {
      fontSize: 14,
      color: theme.error,
      paddingHorizontal: 16,
      paddingVertical: 20,
      textAlign: "center",
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
}: {
  entry: DirEntry;
  onPress: () => void;
}): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const isDir = entry.type === "dir";
  const editable = !isDir && isEditable(entry.name);
  const tappable = isDir || editable;

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

  const inner = (
    <View style={[styles.row, !tappable && styles.rowDim]}>
      <View style={styles.rowIcon}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {entry.name}
      </Text>
      {tappable && (
        <Ionicons name="chevron-forward" size={18} color={theme.black40} />
      )}
    </View>
  );

  if (!tappable) return inner;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LedgerFileBrowserScreen(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const ledgerId = useLedgerGuard();

  // Internal directory navigation stack (root = "")
  const [pathStack, setPathStack] = useState<string[]>([""]);
  const currentPath = pathStack[pathStack.length - 1];
  const inSubDir = pathStack.length > 1;

  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useGetLedgerDirContentQuery({
    variables: { ledgerId, dirPath: currentPath || undefined },
    fetchPolicy: "cache-and-network",
  });

  const entries: DirEntry[] = (data?.getLedgerDirContent ?? []).map((e) => ({
    name: e.name,
    path: e.path,
    type: e.type,
    size: e.size,
  }));

  const sorted = sortEntries(entries);

  const isFirstLoad = loading && !data;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

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
      <LedgerDrawerHeader title={t("ledger")} />

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
      ) : error ? (
        <Text style={styles.errorText}>{t("ledgerLoadError")}</Text>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="folder-open-outline"
            size={40}
            color={theme.black40}
          />
          <Text style={styles.emptyText}>{t("ledgerEmpty")}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.path}
          renderItem={({ item, index }) => (
            <View>
              <FileRow entry={item} onPress={() => handleEntryPress(item)} />
              {index < sorted.length - 1 && <View style={styles.divider} />}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
