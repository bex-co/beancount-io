import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
} from "@/generated-graphql/graphql";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToast } from "@/common/hooks/use-toast";
import { ColorTheme } from "@/types/theme-props";
import { ledgerVar, sessionVar } from "@/common/vars";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { LoadingTile } from "@/components/loading-tile";
import { useDiscovery } from "./use-discovery";
import { filterLedgers, type DiscoveryTab } from "./discovery-store";

const tabs = ["yours", "starred", "explore"] as const;
const widths = [180, 140, 220, 160, 200];
const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.white },
    tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
    tab: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 2,
      borderBottomColor: theme.white,
    },
    selected: { borderBottomColor: theme.primary },
    text: {
      color: theme.text01,
      fontSize: 15,
      lineHeight: 22,
      textAlign: LEADING_TEXT_ALIGN,
    },
    muted: {
      color: theme.black80,
      fontSize: 13,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    search: {
      margin: 16,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      backgroundColor: theme.controlFill,
    },
    input: {
      flex: 1,
      color: theme.text01,
      minHeight: 48,
      fontSize: 16,
      textAlign: LEADING_TEXT_ALIGN,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black10,
    },
    content: { flex: 1, paddingVertical: 16, gap: 4 },
    title: {
      color: theme.text01,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "600",
      textAlign: LEADING_TEXT_ALIGN,
    },
    action: {
      minWidth: 48,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    state: { padding: 24, alignItems: "center", gap: 12 },
    link: { color: theme.primary, fontSize: 15, lineHeight: 22 },
    dim: { opacity: 0.4 },
  });

export function LedgerSelectionScreen() {
  const router = useRouter();
  const client = useApolloClient();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const toast = useToast();
  const selected = useReactiveVar(ledgerVar);
  const { store, state } = useDiscovery();
  const [tab, setTab] = useState<DiscoveryTab>("yours");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const mounted = useRef(true);
  const openingRef = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const remoteQuery = tab === "explore" ? debounced : "";
  useEffect(() => {
    void store.load(tab, remoteQuery);
  }, [store, tab, remoteQuery]);
  const waitingForSearch = tab === "explore" && query.trim() !== debounced;
  const items = waitingForSearch
    ? []
    : tab === "explore"
      ? state.items
      : filterLedgers(state.items, query);
  const showError = () =>
    toast.showToast({ message: t("discoveryActionError"), type: "error" });
  const open = async (id: string) => {
    if (openingRef.current) return;
    openingRef.current = true;
    const account = sessionVar();
    setOpening(id);
    try {
      // Confirm readability before changing the current workspace. A revoked
      // result leaves the current ledger selected and the picker usable.
      await client.query<GetLedgerQuery>({
        query: GetLedgerDocument,
        variables: { ledgerId: id },
        fetchPolicy: "network-only",
      });
      const current = sessionVar();
      if (
        !mounted.current ||
        !account ||
        current?.userId !== account.userId ||
        current.serverUrl !== account.serverUrl
      )
        return;
      ledgerVar(id);
      router.replace("/(app)/(tabs)");
    } catch {
      if (mounted.current) showError();
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(null);
    }
  };
  const skeleton = (
    <View accessibilityLabel={t("discoveryLoading")}>
      {widths.map((width, index) => (
        <View key={width} style={styles.row}>
          <View style={styles.content}>
            <LoadingTile
              width={width}
              height={16}
              style={{ marginVertical: 4 }}
            />
            <LoadingTile
              width={widths[(index + 1) % widths.length]}
              height={12}
              style={{ marginVertical: 4 }}
            />
            <LoadingTile width={60} height={12} style={{ marginVertical: 4 }} />
          </View>
          <LoadingTile
            width={24}
            height={24}
            style={{ marginHorizontal: 12 }}
          />
        </View>
      ))}
    </View>
  );
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
      <View style={styles.tabs}>
        {tabs.map((value) => (
          <Pressable
            key={value}
            testID={`discovery-tab-${value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            style={[styles.tab, tab === value && styles.selected]}
            onPress={() => {
              setTab(value);
              setQuery("");
              setDebounced("");
            }}
          >
            <Text style={styles.text}>{t(`discoveryTab_${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={theme.black80} />
        <TextInput
          testID="discovery-search"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t("discoverySearch")}
          placeholderTextColor={theme.controlPlaceholder}
          accessibilityLabel={t("discoverySearch")}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable
            style={styles.action}
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel={t("discoveryClear")}
          >
            <Ionicons name="close-circle" size={20} color={theme.black80} />
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <ThemedRefreshControl
            refreshing={state.refreshing}
            onRefresh={() => {
              void store.load(tab, remoteQuery, true);
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              testID={`discovery-open-${item.fullName}`}
              style={styles.content}
              accessibilityRole="button"
              accessibilityLabel={t("discoveryOpen", { name: item.fullName })}
              accessibilityState={{
                selected: item.id === selected,
                disabled: opening !== null,
                busy: opening === item.id,
              }}
              disabled={opening !== null}
              onPress={() => {
                void open(item.id);
              }}
            >
              <Text numberOfLines={1} style={styles.title}>
                {item.fullName}
              </Text>
              <Text numberOfLines={1} style={styles.muted}>
                {item.description ?? ""}
              </Text>
              <Text style={styles.muted}>
                {t(item.private ? "discoveryPrivate" : "discoveryPublic")}
                {item.id === selected ? ` · ${t("discoveryCurrent")}` : ""}
              </Text>
            </Pressable>
            <Pressable
              testID={`discovery-star-${item.fullName}`}
              style={[
                styles.action,
                (state.pending.has(item.id) || item.isStarred == null) &&
                  styles.dim,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(
                item.isStarred ? "discoveryUnstar" : "discoveryStar",
                { name: item.fullName },
              )}
              accessibilityState={{
                selected: item.isStarred === true,
                disabled: state.pending.has(item.id) || item.isStarred == null,
                busy: state.pending.has(item.id),
              }}
              disabled={state.pending.has(item.id) || item.isStarred == null}
              onPress={() => {
                void store.toggle(item).catch(showError);
              }}
            >
              <Ionicons
                name={item.isStarred ? "star" : "star-outline"}
                size={24}
                color={item.isStarred ? theme.primary : theme.black80}
              />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          state.loading || waitingForSearch ? (
            skeleton
          ) : (
            <View style={styles.state}>
              <Ionicons
                name={
                  state.error
                    ? "cloud-offline-outline"
                    : tab === "starred"
                      ? "star-outline"
                      : "search-outline"
                }
                size={40}
                color={theme.black80}
              />
              <Text style={styles.text}>
                {t(
                  state.error
                    ? "discoveryLoadError"
                    : query.trim()
                      ? "discoveryNoMatches"
                      : `discoveryEmpty_${tab}`,
                )}
              </Text>
              {!state.error && tab === "starred" && !query.trim() ? (
                <Pressable
                  style={styles.action}
                  onPress={() => setTab("explore")}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>{t("discoveryTab_explore")}</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.state}>
            {state.error ? (
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                onPress={() => {
                  void (state.hasMore
                    ? store.loadMore()
                    : store.load(tab, remoteQuery, true));
                }}
              >
                <Text style={styles.link}>{t("discoveryRetry")}</Text>
              </Pressable>
            ) : null}
            {state.hasMore && !waitingForSearch ? (
              <Pressable
                testID="discovery-load-more"
                accessibilityRole="button"
                style={styles.action}
                disabled={state.loadingMore}
                onPress={() => {
                  void store.loadMore();
                }}
              >
                <Text style={styles.link}>
                  {t(
                    state.loadingMore
                      ? "discoveryLoading"
                      : "discoveryLoadMore",
                  )}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
