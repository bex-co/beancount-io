import type { Context, Next } from "koa";
import type { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import {
  createAnonymousGiteaClient,
  createGiteaClientFromAuthHeader,
} from "@/features/gitea/service/gitea-client-factory";
import { errorResponse } from "./envelope";

/**
 * Request auth state, mirroring the Python `get_auth_credentials` +
 * `Context.user` (`app/deps/{security,context}.py`): Basic/token headers are
 * forwarded verbatim to Gitea, which is the sole authority. The private
 * `Anonymous` marker instead selects a Gitea client with no credentials.
 */
export interface RequestAuth {
  authType: "basic" | "api_key" | "anonymous";
  /** Original header; forwarded only for Basic/token requests. */
  header: string;
  /** Set only for Basic auth (token-auth requests have no local identity). */
  username?: string;
  password?: string;
}

export function parseAuthorizationHeader(
  header: string | undefined,
): RequestAuth | null {
  if (!header) {
    return null;
  }
  if (header.startsWith("token ")) {
    const token = header.slice(6).trim();
    if (token) {
      return { authType: "api_key", header: `token ${token}` };
    }
    return null;
  }
  // Private backend-v2 -> ledger-v2 protocol for reads that have already been
  // authorized as public. The resulting Gitea client carries no credential,
  // so it cannot read a private repository or perform a write.
  if (header === "Anonymous") {
    return { authType: "anonymous", header };
  }
  if (header.startsWith("Basic ")) {
    const encoded = header.slice(6).trim();
    if (!encoded) {
      return null;
    }
    let username: string | undefined;
    let password: string | undefined;
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const sep = decoded.indexOf(":");
      if (sep >= 0) {
        username = decoded.slice(0, sep);
        password = decoded.slice(sep + 1);
      }
    } catch {
      // Forward as-is; Gitea will reject invalid credentials itself.
    }
    return { authType: "basic", header, username, password };
  }
  return null;
}

/**
 * Koa middleware requiring Gitea-forwardable credentials. 401 text and
 * `WWW-Authenticate` match the Python service exactly.
 */
export async function authMiddleware(ctx: Context, next: Next): Promise<void> {
  const auth = parseAuthorizationHeader(ctx.get("Authorization") || undefined);
  if (!auth) {
    ctx.status = 401;
    ctx.set("WWW-Authenticate", "Basic");
    ctx.body = errorResponse(
      "No authorization header provided. Use 'Basic <credentials>' or 'token <token>'",
    );
    return;
  }
  ctx.state.auth = auth;
  await next();
}

/** The per-request Gitea client for an authenticated request. */
export function giteaClientForRequest(ctx: Context): GiteaApi<unknown> {
  const auth = ctx.state.auth as RequestAuth | undefined;
  if (!auth) {
    throw new Error(
      "giteaClientForRequest called on a route without authMiddleware",
    );
  }
  return auth.authType === "anonymous"
    ? createAnonymousGiteaClient()
    : createGiteaClientFromAuthHeader(auth.header);
}

/**
 * Whether the caller declared this write exempt from the directive limit.
 *
 * Carried as a header rather than a body field so it applies uniformly to every
 * write endpoint without changing their payload shapes.
 *
 * **This header is trusted without authentication** — the service is intended
 * to run on an internal network where only trusted callers can reach it. Do
 * not expose it directly to the public internet without adding authentication
 * for this header or for the write endpoints that honor it; otherwise the
 * per-ledger directive limit becomes opt-out for any authenticated user.
 */
export function directiveLimitExempt(ctx: {
  get(field: string): string;
}): boolean {
  return ctx.get("x-directive-limit-exempt") === "1";
}
