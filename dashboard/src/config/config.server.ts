/**
 * Server-only configuration, resolved at RUNTIME rather than at build time.
 *
 * `src/config/config.ts` is isomorphic: every value there goes through
 * `import.meta.env`, which Vite substitutes during the build. That is correct
 * for browser-facing values (they have to be baked into the client bundle
 * anyway), but wrong for the API URL the SSR server dials:
 *
 *   - it is an in-cluster address that differs per environment, and
 *   - a deployed SSR server should not have to reach the backend over the
 *     public URL — hairpinning from a pod back through its own ingress is
 *     blocked outright on Kubernetes platforms that deny pod->node egress.
 *
 * So the SSR API URL is read from `process.env` at boot. `import.meta.env`
 * remains the fallback so `yarn dev` keeps working from `.env` unchanged.
 */

function resolveSsrApiUrl(): string {
  const fromRuntime =
    typeof process !== "undefined" ? process.env?.SSR_API_URL : undefined;
  return (
    fromRuntime ||
    import.meta.env.VITE_SSR_API_URL ||
    import.meta.env.VITE_API_URL ||
    // Same last-resort default the OAuth proxy carried before this module
    // existed, so `yarn dev` and tests keep working with no env at all.
    "http://localhost:4104/api-gateway/"
  );
}

export interface ServerConfig {
  /** API base URL the SSR server dials for its own data fetching. */
  apiUrl: string;
  /**
   * HMAC key for the short-lived PKCE transaction cookie. Read only at request
   * time so the same production image can receive it from the deployment
   * secret store when the container starts.
   */
  oauthTransactionSecret(): string;
}

function resolveOAuthTransactionSecret(): string {
  const value = process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET?.trim();
  if (value && Buffer.byteLength(value, "utf8") >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DASHBOARD_OAUTH_TRANSACTION_SECRET must contain at least 32 bytes",
    );
  }
  // Local-only fallback. A restart invalidates an in-flight authorization, but
  // no durable credential; deployed environments must use the branch above.
  return "beancount-dashboard-local-oauth-transaction-only";
}

export const serverConfig: ServerConfig = {
  apiUrl: resolveSsrApiUrl(),
  oauthTransactionSecret: resolveOAuthTransactionSecret,
};
