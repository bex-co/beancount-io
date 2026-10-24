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
import { AppState, StyleSheet, View } from "react-native";
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
import { createForegroundRefresher } from "@/common/apollo/foreground-refresh";
import { exampleRoutes } from "./example-routes";
import { InlineError } from "@/components/inline-error";

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
  // A return to the app refreshes the example in place, keeping its stack,
  // filters and open transaction. Remounting on every return threw them away
  // (w21/084); only a failed visit starts over.
  const failed = Boolean(visit.resumeFailure ?? failure);
  useEffect(() => {
    const onChange = createForegroundRefresher({
      refresh: () => {
        if (failed) {
          retry();
          return;
        }
        void client
          .refetchQueries({ include: "active" })
          .catch(() => undefined);
      },
    });
    const subscription = AppState.addEventListener("change", onChange);
    return () => {
      subscription.remove();
      onChange.cancel();
    };
  }, [client, failed, retry]);
  const selectedTransaction = useMemo(
    () => makeVar<StashedTransaction | null>(null),
    [],
  );
  // The filters a journal link named open the example's Transactions filtered
  // (w21/489); a later link replaces them, as a signed-in one does (w21/344).
  const linkFilters = visit.filters;
  const transactionFilters = useMemo(
    () =>
      makeVar<ScopedTransactionFilters>(
        linkFilters ? { ledgerId, filters: linkFilters } : NO_SCOPED_FILTERS,
      ),
    // Seeded once per session; the effect below carries later links.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // They belong to the example the link named and are spent once seeded: left
  // on the visit they followed the guest to every other example and came back
  // after Reset (w21/525).
  useEffect(() => {
    if (!linkFilters) return;
    transactionFilters({ ledgerId, filters: linkFilters });
    updateGuestVisit({ filters: undefined });
  }, [linkFilters, ledgerId, transactionFilters]);
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
        <InlineError
          style={[styles.message, { color: theme.text01 }]}
          message={t(
            failure === "unavailable"
              ? "guestUnavailable"
              : "guestConnectionError",
          )}
        />
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
