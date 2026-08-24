import { jwtDecode } from "jwt-decode";
import type { Session } from "@/common/vars/session";

export const createSession = (token: string, serverUrl: string) => {
  const decoded = jwtDecode<{ sub?: string | number }>(token);

  if (!decoded.sub) {
    throw new Error("Token missing required 'sub' claim");
  }

  return {
    kind: "legacy" as const,
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
  if (!session || session.serverUrl !== serverUrl) return undefined;
  if (session.kind === "legacy") return session.authToken;
  const resource = new URL("v1", serverUrl).toString().replace(/\/$/, "");
  return session.resource === resource ? session.accessToken : undefined;
}
