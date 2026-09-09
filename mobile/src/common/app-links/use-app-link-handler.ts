import { useEffect, useRef } from "react";
import { Linking as RnLinking } from "react-native";
import * as ExpoLinking from "expo-linking";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { getServerUrl } from "@/common/vars/server-url";
import { isOAuthCallbackUrl, openAppLinkTarget } from "./open-app-link";
import { setPendingAppLink, takePendingAppLink } from "./pending-app-link";
import { resolveAppLink, type AppLinkTarget } from "./resolve-app-link";
import { canonicalizeIncomingAppLinkUrl } from "./rewrite-system-path";

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
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const open = async (target: AppLinkTarget, sourceUrl: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession || handlingRef.current) return;
    handlingRef.current = true;
    const account = currentSession;
    try {
      await openAppLinkTarget({
        client,
        target,
        sourceUrl,
        isCurrentSession: () => {
          const latest = sessionRef.current;
          return (
            !!latest &&
            latest.userId === account.userId &&
            latest.serverUrl === account.serverUrl
          );
        },
      });
    } finally {
      handlingRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const handleUrl = async (url: string | null) => {
      if (!url || cancelled) return;
      if (isOAuthCallbackUrl(url)) return;

      const candidate = canonicalizeIncomingAppLinkUrl(url) ?? url;
      const target = resolveAppLink(candidate, { serverUrl: getServerUrl() });
      if (!target) return;

      if (!sessionRef.current) {
        setPendingAppLink(target, candidate);
        return;
      }

      await open(target, candidate);
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
