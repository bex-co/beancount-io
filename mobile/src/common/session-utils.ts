import { jwtDecode } from "jwt-decode";
import type { Session } from "@/common/vars/session";

export const createSession = (token: string, serverUrl: string) => {
  const decoded = jwtDecode<{ sub?: string | number }>(token);

  if (!decoded.sub) {
    throw new Error("Token missing required 'sub' claim");
  }

  return {
    userId: String(decoded.sub),
    authToken: token,
    serverUrl,
  };
};

/** A bearer credential must never cross from its issuing server to another. */
export function sessionTokenForServer(
  session: Session | null,
  serverUrl: string,
): string | undefined {
  return session?.serverUrl === serverUrl ? session.authToken : undefined;
}
