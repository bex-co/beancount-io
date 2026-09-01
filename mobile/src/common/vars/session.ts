import { createPersistentVar } from "@/common/apollo/persistent-var";
import { secureSessionStorage } from "@/common/apollo/secure-session-storage";
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
export async function persistSession(session: Session): Promise<void> {
  await secureSessionStorage.setItem("session", JSON.stringify(session));
  sessionVar(session);
  await flushSession();
}
