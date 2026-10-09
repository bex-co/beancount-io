import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApolloProvider, makeVar } from "@apollo/client";
import { Redirect, router } from "expo-router";
import { AppState, StyleSheet, Text, View } from "react-native";
import { GuestContext, useGuest } from "@/common/guest/guest-context";
import { createGuestClient } from "@/common/guest/guest-client";
import {
  updateGuestVisit,
  type ExampleId,
  type GuestReadFailure,
  type GuestView,
  type GuestVisit,
} from "@/common/guest/guest-state";
import { useTranslations } from "@/common/hooks/use-translations";
import { useTheme } from "@/common/theme";
import { Button } from "@/components/button";
import { DashboardScrollView } from "@/components/dashboard-scroll-view";
import {
  NO_SCOPED_FILTERS,
  type ScopedTransactionFilters,
} from "@/screens/transactions-screen/filters/types";
import type { StashedTransaction } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { exampleRoutes } from "./example-routes";

const GuestReadContext = createContext<{
  failure?: GuestReadFailure;
  retry: () => void;
}>({ retry() {} });

function GuestLedgerSession({
  ledgerId,
  visit,
  requestSignIn,
  children,
  retry,
}: {
  ledgerId: ExampleId;
  visit: GuestVisit;
  requestSignIn: () => void;
  children: ReactNode;
  retry: () => void;
}) {
  const [failure, setFailure] = useState<GuestReadFailure>();
  const client = useMemo(
    () => createGuestClient(visit.serverUrl, ledgerId, setFailure),
    [visit.serverUrl, ledgerId],
  );
  const selectedTransaction = useMemo(
    () => makeVar<StashedTransaction | null>(null),
    [],
  );
  const transactionFilters = useMemo(
    () => makeVar<ScopedTransactionFilters>(NO_SCOPED_FILTERS),
    [],
  );
  useEffect(
    () => () => {
      client.stop();
      void client.clearStore();
    },
    [client],
  );
  const navigate = useCallback(
    (view: GuestView) => router.navigate(exampleRoutes[view]),
    [],
  );
  const guest = useMemo(
    () => ({
      ledgerId,
      navigate,
      requestSignIn,
      transactionFilters,
      selectedTransaction,
    }),
    [
      ledgerId,
      navigate,
      requestSignIn,
      transactionFilters,
      selectedTransaction,
    ],
  );
  return (
    <ApolloProvider client={client}>
      <GuestContext.Provider value={guest}>
        <GuestReadContext.Provider
          value={{ failure: visit.resumeFailure ?? failure, retry }}
        >
          {children}
        </GuestReadContext.Provider>
      </GuestContext.Provider>
    </ApolloProvider>
  );
}

/** Keep the anonymous cache and permissions around tabs AND their pushed read screens. */
export function ExampleLedgerProvider({
  children,
  visit,
  requestSignIn,
}: {
  children: ReactNode;
  visit: GuestVisit;
  requestSignIn: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    updateGuestVisit({ resumeFailure: undefined });
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setAttempt((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  if (!visit.ledgerId) return children;
  return (
    <GuestLedgerSession
      key={`${visit.serverUrl}:${visit.ledgerId}:${attempt}`}
      ledgerId={visit.ledgerId}
      visit={visit}
      requestSignIn={requestSignIn}
      retry={retry}
    >
      {children}
    </GuestLedgerSession>
  );
}

const styles = StyleSheet.create({
  error: { padding: 24, gap: 16, flexGrow: 1, justifyContent: "center" },
  message: { fontSize: 16, lineHeight: 24 },
});

/** Remove stale content on access loss, including content in pushed detail routes. */
export function ExampleReadScreen({
  children,
  errorHeader,
  onChoose,
}: {
  children: ReactNode;
  errorHeader?: ReactNode;
  onChoose?: () => void;
}) {
  const guest = useGuest();
  const { failure, retry } = useContext(GuestReadContext);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  if (!guest) return <Redirect href="/examples" />;
  if (!failure) return children;
  return (
    <View
      testID="guest-read-error"
      style={{ flex: 1, backgroundColor: theme.white }}
    >
      {errorHeader}
      <DashboardScrollView
        contentContainerStyle={styles.error}
        refreshing={false}
        onRefresh={retry}
      >
        <Text
          accessibilityRole="alert"
          style={[styles.message, { color: theme.text01 }]}
        >
          {t(
            failure === "unavailable"
              ? "guestUnavailable"
              : "guestConnectionError",
          )}
        </Text>
        <Button type="primary" onPress={retry}>
          {t("discoveryRetry")}
        </Button>
        <Button
          type="outline"
          onPress={
            onChoose ??
            (() => {
              updateGuestVisit({ ledgerId: null, resumeFailure: undefined });
              router.replace("/examples");
            })
          }
        >
          {t("guestChooseExample")}
        </Button>
      </DashboardScrollView>
    </View>
  );
}
