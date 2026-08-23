import { createPersistentVar } from "@/common/apollo/persistent-var";
import { secureSessionStorage } from "@/common/apollo/secure-session-storage";

export type Session = {
  userId: string;
  authToken: string;
  /** The normalized base URL that issued this bearer token. */
  serverUrl?: string;
};

export const [sessionVar, loadSession, flushSession] =
  createPersistentVar<Session | null>(
    "session",
    null,
    undefined,
    undefined,
    secureSessionStorage,
  );
