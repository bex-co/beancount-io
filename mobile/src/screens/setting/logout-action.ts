import type { OAuthSession, Session } from "@/common/oauth/session-record";

export type LogoutDependencies = {
  cancelRefreshes: () => Promise<void>;
  revokeOAuth: (session: OAuthSession) => Promise<void>;
  revokeLegacy: (authToken: string) => Promise<void>;
  clearLocalState: () => Promise<void>;
  /** Makes the next sign-in ask which account to use (w21/153). */
  markSignedOut: () => Promise<void>;
  /** How long to wait for the server to acknowledge the revocation. */
  revokeTimeoutMs?: number;
};

/**
 * Revocation can hang for the OS request timeout (about a minute) on a network
 * that accepts connections and answers nothing, and the account stayed on the
 * device until it finished (w21/352). Past this the sign-out goes on without
 * it, as it does for any other revocation failure.
 */
export const REVOKE_TIMEOUT_MS = 5000;

function withinTimeout(pending: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([pending, expired]).finally(() => clearTimeout(timer));
}

/** Remote revocation is best effort; local account isolation always completes. */
export async function performLogout(
  session: Session,
  dependencies: LogoutDependencies,
): Promise<void> {
  await dependencies.cancelRefreshes();
  try {
    const revocation =
      session.kind === "oauth"
        ? dependencies.revokeOAuth(session)
        : dependencies.revokeLegacy(session.authToken);
    // A late failure of the abandoned request must not become an unhandled one.
    revocation.catch(() => undefined);
    await withinTimeout(
      revocation,
      dependencies.revokeTimeoutMs ?? REVOKE_TIMEOUT_MS,
    );
  } catch {
    // Offline sign-out still removes every local credential and cached account.
  }

  // A step of the wipe that fails does not stop the sign-out: it goes on to
  // remember the choice and return, instead of leaving the user "signed in" on
  // a token the server has revoked (w21/967).
  await dependencies.clearLocalState().catch(() => undefined);
  // After the wipe, so it survives it. Best effort: sign-out itself is done.
  await dependencies.markSignedOut().catch(() => undefined);
}
