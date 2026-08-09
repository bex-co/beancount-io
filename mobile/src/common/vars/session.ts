import { createPersistentVar } from "@/common/apollo/persistent-var";
import { secureSessionStorage } from "@/common/apollo/secure-session-storage";

export type Session = {
  userId: string;
  authToken: string;
};

export const [sessionVar, loadSession] = createPersistentVar<Session | null>(
  "session",
  null,
  undefined,
  undefined,
  secureSessionStorage,
);
