import { getServerUrl } from "../vars/server-url";
import { persistSession, sessionVar } from "../vars/session";
import { OAuthTokenManager } from "./token-manager";

export const oauthTokenManager = new OAuthTokenManager({
  getSession: sessionVar,
  getServerUrl,
  persistSession,
  onTerminalFailure: async () => {
    const { clearServerScopedState } = await import("../server-url-actions");
    await clearServerScopedState({ refreshAlreadyTerminal: true });
  },
});
