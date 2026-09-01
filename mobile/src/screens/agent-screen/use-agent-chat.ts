import { useCallback, useMemo, useRef, useState } from "react";
import { useReactiveVar } from "@apollo/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";

import { getEndpoint } from "@/common/request";
import { sessionVar, ledgerVar, localeVar } from "@/common/vars";
import { useTranslations } from "@/common/hooks/use-translations";
import { oauthTokenManager } from "@/common/oauth/oauth-token-manager";

/**
 * The chat client for `POST /api-gateway/agent` — the same route and the same
 * UIMessage stream the web dashboard consumes, so both clients stay one
 * protocol. See `docs/adrs/ADR002-mobile-ai-assistant.md`.
 *
 * Two things here are deliberate and were measured on device (w1/m32/t001):
 *
 * - `expo/fetch`, not the global `fetch`, because only it exposes a streaming
 *   `response.body` in React Native. Without it the answer arrives in one lump
 *   after the whole turn finishes.
 * - `credentials: "omit"`, because `expo/fetch` otherwise shares the native
 *   cookie store and the app already holds a session cookie for the same
 *   origin. A request that forgot the Authorization header still succeeded on
 *   the smoke run — which would have let a broken auth path look healthy until
 *   the cookie expired. Omitting cookies makes the Bearer token the only
 *   credential, so the header is load-bearing and failures are honest.
 */
const AGENT_SESSION_PREFIX = "aisess_";

/** Server memory is keyed on this; New chat mints a fresh one. */
function generateSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${AGENT_SESSION_PREFIX}${Date.now().toString(36)}${rand}`;
}

export function useAgentChat() {
  const { t } = useTranslations();
  const session = useReactiveVar(sessionVar);
  const ledgerId = useReactiveVar(ledgerVar);
  const locale = useReactiveVar(localeVar);

  const [sessionId, setSessionId] = useState(generateSessionId);

  // Read through refs so a locale or token change does not rebuild the
  // transport mid-stream; `headers` is resolved per request anyway.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const welcome = useMemo<UIMessage>(
    () => ({
      id: "welcome",
      role: "assistant",
      parts: [{ type: "text", text: t("agentWelcome") }],
    }),
    // Seeded once: re-seeding on a locale change would rewrite a message the
    // user may already have replied to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: getEndpoint("api-gateway/agent"),
        credentials: "omit",
        headers: async () => {
          const token = await oauthTokenManager.getAccessToken();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Accept-Language": localeRef.current,
          };
        },
        body: { ledgerId, sessionId },
        fetch: expoFetch as unknown as typeof globalThis.fetch,
      }),
    [ledgerId, sessionId],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
  } = useChat<UIMessage>({
    transport,
    messages: [welcome],
  });

  const startNewChat = useCallback(() => {
    stop();
    setSessionId(generateSessionId());
    setMessages([welcome]);
  }, [stop, setMessages, welcome]);

  const isStreaming = status === "submitted" || status === "streaming";

  return {
    messages,
    sendMessage,
    status,
    isStreaming,
    stop,
    error,
    regenerate,
    startNewChat,
    sessionId,
    ledgerId,
    isSignedIn: Boolean(session),
  };
}
