import { useCallback } from "react";
import { Redirect, useFocusEffect } from "expo-router";
import {
  EXAMPLE_IDS,
  guestVisitVar,
  updateGuestVisit,
  type GuestView,
} from "@/common/guest/guest-state";
import { useTranslations } from "@/common/hooks/use-translations";
import { LazyTabScreen } from "@/components/lazy-tab-screen";
import {
  LedgerDrawerHeader,
  useLedgerDrawer,
} from "@/components/ledger-drawer";
import { LedgerTabLayout } from "@/components/ledger-tabs";
import { useExamples } from "./examples-layout";
import { ExampleReadScreen } from "./example-ledger-provider";

export function ExampleTabsLayout() {
  const {
    visit,
    availability,
    refresh,
    select,
    requestSignIn,
    exit,
    signInLabel,
    signInPending,
    signInFailed,
  } = useExamples();
  const { t } = useTranslations();
  if (!visit.ledgerId) return <Redirect href="/examples" />;
  return (
    <LedgerTabLayout
      drawerData={{
        ledgerId: visit.ledgerId,
        ledgers: availability
          ? EXAMPLE_IDS.map((id, index) => ({
              id,
              fullName: id,
              name: id.split("/")[1],
              private: false,
              disabled: availability[index] !== "available",
              statusLabel:
                availability[index] === "available"
                  ? undefined
                  : t(
                      availability[index] === "connection"
                        ? "guestConnectionError"
                        : "guestUnavailable",
                    ),
            }))
          : [],
        loading: availability === null,
        error: Boolean(availability?.includes("connection")),
        refetch: refresh,
        onSelect: (id) => {
          const example = EXAMPLE_IDS.find((candidate) => candidate === id);
          if (example) select(example);
        },
        guest: {
          serverUrl: visit.serverUrl,
          signInLabel,
          signInPending,
          signInFailed,
          onSignIn: requestSignIn,
          onExit: exit,
        },
      }}
    />
  );
}

/** Real tab routes preserve visited screens and remember the focused view for OAuth. */
export function ExampleTabScreen({
  view,
  children,
}: {
  view: GuestView;
  children: JSX.Element;
}) {
  const { openDrawer } = useLedgerDrawer();
  const { t } = useTranslations();
  useFocusEffect(
    useCallback(() => {
      // Refocusing after the sign-in browser must not invalidate its continuation.
      if (guestVisitVar()?.view !== view) updateGuestVisit({ view });
    }, [view]),
  );
  return (
    <LazyTabScreen>
      <ExampleReadScreen
        errorHeader={<LedgerDrawerHeader title={t(view)} />}
        onChoose={openDrawer}
      >
        {children}
      </ExampleReadScreen>
    </LazyTabScreen>
  );
}
