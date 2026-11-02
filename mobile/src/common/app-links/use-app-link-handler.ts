import { useEffect, useRef } from "react";
import { Linking as RnLinking } from "react-native";
import { router, type Href } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { getServerUrl } from "@/common/vars/server-url";
import {
  clearGuestVisit,
  startGuestVisit,
  updateGuestVisit,
} from "@/common/guest/guest-state";
import { exampleRoutes } from "@/screens/examples/example-routes";
import { guestLinkVisit } from "./guest-link-visit";
import {
  afterNavigatorReady,
  isOAuthCallbackUrl,
  openAppLinkTarget,
} from "./open-app-link";
import {
  clearPendingAppLink,
  routeIncomingAppLink,
  takePendingAppLink,
} from "./pending-app-link";
import type { AppLinkTarget } from "./resolve-app-link";
import { withAppMarker } from "@/common/site-url";
import { resolveServerLink } from "./server-link";

/**
 * Mount once under Providers. Routes https ledger URLs through the resolver,
 * stashes a pending target while signed out, and replays it after sign-in.
 *
 * Prefer `expo-linking`'s `getLinkingURL` on iOS — Expo Router already uses it
 * for cold start, and React Native's `Linking.getInitialURL` often returns
 * null for Universal Links even when the native linking URL is present.
 */
export function useAppLinkHandler(): void {
  const client = useApolloClient();
  const session = useReactiveVar(sessionVar);
  const handlingRef = useRef(false);
  // The newest link that arrived while another was opening. Last link wins:
  // the earlier one stops at its next checkpoint and this one runs after it,
  // where the second used to be dropped and the user landed on the first
  // link's ledger (w21/298).
  const queuedRef = useRef<{ target: AppLinkTarget; sourceUrl: string } | null>(
    null,
  );
  const generationRef = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const open = async (target: AppLinkTarget, sourceUrl: string) => {
    if (!sessionRef.current) return;
    if (handlingRef.current) {
      queuedRef.current = { target, sourceUrl };
      generationRef.current += 1;
      return;
    }
    handlingRef.current = true;
    let next: { target: AppLinkTarget; sourceUrl: string } | null = {
      target,
      sourceUrl,
    };
    try {
      while (next) {
        queuedRef.current = null;
        const account = sessionRef.current;
        if (!account) break;
        const generation = generationRef.current;
        await openAppLinkTarget({
          client,
          target: next.target,
          sourceUrl: next.sourceUrl,
          isCurrentSession: () => {
            const latest = sessionRef.current;
            return (
              !!latest &&
              latest.userId === account.userId &&
              latest.serverUrl === account.serverUrl &&
              generationRef.current === generation
            );
          },
        });
        next = queuedRef.current;
      }
    } finally {
      handlingRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const handleUrl = async (url: string | null) => {
      if (!url || cancelled) return;
      if (isOAuthCallbackUrl(url)) return;

      const link = resolveServerLink(url, getServerUrl());
      // Another server's link goes to the browser; nothing to replay either.
      if (link.kind === "browser") {
        clearPendingAppLink();
        await RnLinking.openURL(withAppMarker(link.url)).catch(() => undefined);
        return;
      }
      if (link.kind === "ignore") return;
      const { target, url: candidate } = link;

      if (routeIncomingAppLink(target, candidate, !!sessionRef.current)) {
        await open(target, candidate);
        return;
      }
      // Signed out, a link to a public example opens it as a guest instead of
      // waiting behind the sign-in screen (w21/345).
      const serverUrl = getServerUrl();
      const guest = guestLinkVisit(target, serverUrl);
      if (!guest) return;
      clearPendingAppLink();
      startGuestVisit(serverUrl);
      const { detail, ...visit } = guest;
      updateGuestVisit(visit);
      await afterNavigatorReady();
      if (cancelled || sessionRef.current) {
        // Signed in while waiting: the visit is stale.
        clearGuestVisit();
        return;
      }
      router.replace(exampleRoutes[guest.view]);
      // An entry or account link opens its page over the tab it came from.
      if (detail) router.push(detail as Href);
    };

    void handleUrl(ExpoLinking.getLinkingURL());

    void RnLinking.getInitialURL().then((url) => {
      const linkingUrl = ExpoLinking.getLinkingURL();
      // Avoid double-open when expo-linking already delivered the same URL.
      if (url && url !== linkingUrl) {
        void handleUrl(url);
      }
    });

    const subscription = ExpoLinking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open closes over client/session refs
  }, [client]);

  useEffect(() => {
    if (!session) return;
    const pending = takePendingAppLink();
    if (!pending) return;
    void open(pending.target, pending.sourceUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, client]);
}
