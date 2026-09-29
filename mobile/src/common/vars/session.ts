import { createPersistentVar } from "@/common/apollo/persistent-var";
import { secureSessionStorage } from "@/common/apollo/secure-session-storage";
import { OAuthAuthorizationError } from "@/common/oauth/authorization-result";
import {
  deserializeSession,
  type Session,
} from "@/common/oauth/session-record";

export { type Session } from "@/common/oauth/session-record";

export const [sessionVar, loadSession, flushSession] =
  createPersistentVar<Session | null>(
    "session",
    null,
    undefined,
    deserializeSession,
    secureSessionStorage,
  );

/** Persist the newest rotated credential before any waiting caller can use it. */
export async function persistSession(
  session: Session,
  isCurrent = () => true,
): Promise<void> {
  if (!isCurrent())
    throw new OAuthAuthorizationError("authorization_context_changed");
  await secureSessionStorage.setItem("session", JSON.stringify(session));
  if (!isCurrent()) {
    await secureSessionStorage.setItem("session", JSON.stringify(sessionVar()));
    throw new OAuthAuthorizationError("authorization_context_changed");
  }
  sessionVar(session);
  await flushSession();
}
