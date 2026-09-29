import { createContext, useCallback, useContext, useEffect } from "react";
import { useReactiveVar } from "@apollo/client";
import { Redirect, Stack, router } from "expo-router";
import { AppState, type ColorValue } from "react-native";
import { StackBackButton } from "@/components/stack-back-button";
import { ExampleLedgerProvider } from "./example-ledger-provider";
import { exampleRoutes } from "./example-routes";
import {
  beginGuestSignIn,
  clearGuestVisit,
  endGuestSignIn,
  guestVisitVar,
  updateGuestVisit,
  type ExampleId,
  type GuestVisit,
} from "@/common/guest/guest-state";
import { getServerUrl, serverUrlOverrideVar } from "@/common/vars/server-url";
import { isOfficialServerUrl } from "@/common/server-url-validation";
import { sessionVar } from "@/common/vars/session";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToast } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import { useNativeSignIn } from "@/screens/welcome/use-native-sign-in";
import {
  useExampleCatalog,
  type ExampleAvailability,
} from "./use-example-catalog";

const ExamplesContext = createContext<{
  visit: GuestVisit;
  availability: ExampleAvailability[] | null;
  refresh: () => Promise<void>;
  select: (id: ExampleId) => void;
  requestSignIn: () => void;
  exit: () => void;
  signInLabel: string;
  signInPending: boolean;
  signInFailed: boolean;
} | null>(null);

export function useExamples() {
  const context = useContext(ExamplesContext);
  if (!context) throw new Error("useExamples requires ExamplesLayout");
  return context;
}

function ExamplesSession({ visit }: { visit: GuestVisit }) {
  const session = useReactiveVar(sessionVar);
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const { showToast } = useToast();
  const { availability, refresh } = useExampleCatalog(visit.serverUrl);
  const { pendingFlow, failure, start } = useNativeSignIn({
    onStart: beginGuestSignIn,
    onSettled: endGuestSignIn,
  });
  const failureMessage = t("signInFailed");
  useEffect(() => {
    if (failure) showToast({ message: failureMessage, type: "error" });
  }, [failure, failureMessage, showToast]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
  const requestSignIn = useCallback(() => {
    if (session) {
      clearGuestVisit();
      router.replace("/(app)/(tabs)");
    } else start("sign_in");
  }, [session, start]);
  const exit = useCallback(() => {
    clearGuestVisit();
    router.replace(session ? "/(app)/(tabs)" : "/auth/welcome");
  }, [session]);
  const select = useCallback((ledgerId: ExampleId) => {
    const current = guestVisitVar();
    if (!current) return;
    updateGuestVisit({ ledgerId, resumeFailure: undefined });
    router.replace(exampleRoutes[current.view]);
  }, []);

  return (
    <ExamplesContext.Provider
      value={{
        visit,
        availability,
        refresh,
        select,
        requestSignIn,
        exit,
        signInLabel: t(session ? "home" : "signIn"),
        signInPending: pendingFlow !== null,
        signInFailed: failure !== null,
      }}
    >
      <ExampleLedgerProvider visit={visit} requestSignIn={requestSignIn}>
        <Stack
          screenOptions={{
            headerTitleStyle: { fontWeight: "bold", color: theme.black },
            headerStyle: { backgroundColor: theme.white },
            headerTintColor: theme.black,
            headerLeft: (props: { tintColor?: ColorValue }) => (
              <StackBackButton
                {...props}
                label={t("back")}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace(exampleRoutes[visit.view]);
                }}
              />
            ),
            contentStyle: { backgroundColor: theme.white },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transaction-detail" />
          <Stack.Screen
            name="transaction-filters"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="ledger-file-editor" />
          <Stack.Screen name="account-detail" />
          <Stack.Screen
            name="account-picker"
            options={{ title: t("accountPicker") }}
          />
        </Stack>
      </ExampleLedgerProvider>
    </ExamplesContext.Provider>
  );
}

export function ExamplesLayout() {
  const visit = useReactiveVar(guestVisitVar);
  useReactiveVar(serverUrlOverrideVar);
  const session = useReactiveVar(sessionVar);
  const serverUrl = getServerUrl();
  if (
    !isOfficialServerUrl(serverUrl) ||
    !visit ||
    visit.serverUrl !== serverUrl
  )
    return <Redirect href={session ? "/(app)/(tabs)" : "/auth/welcome"} />;
  return <ExamplesSession key={visit.serverUrl} visit={visit} />;
}
