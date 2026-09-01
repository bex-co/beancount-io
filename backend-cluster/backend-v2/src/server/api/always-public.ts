/**
 * The census of REST mounts that sit outside the scope gate (ADR 0006 D9,
 * test 3).
 *
 * Every entry answers one question — *why is this reachable without a scoped
 * credential?* — and `__tests__/always-public.test.ts` compares this list
 * against what the composition root actually mounted, in both directions. A new
 * ungated route cannot ship until someone writes down why, and a route that
 * moves under the gate cannot leave a stale excuse behind.
 *
 * "Outside the gate" is not the same as "unauthenticated". Several of these
 * carry a credential the scope vocabulary cannot describe — a webhook
 * signature, an `x-api-key`, an admin token, git's own basic auth — and two of
 * them are surface transports whose ops are gated one level in, per field and
 * per tool. Each says which.
 */
export interface AlwaysPublicEntry {
  /** `REST <METHOD> <path>` (ADR 0006 D3). */
  readonly opId: string;
  readonly reason: string;
}

const SIGNATURE_IS_THE_CREDENTIAL =
  "The sender cannot present our bearer token, so the request's own signature is the credential; verification happens in the handler before anything is read.";

const OIDC_CEREMONY =
  "Part of the OAuth 2.1 ceremony itself: requiring a token to obtain a token would close the only door in.";

const ADMIN_TOKEN =
  "Support/ops route behind `x-admin-token` (`apiTokenRequired`), a shared operator secret with no user identity and therefore no scopes to check.";

const DEV_ONLY_DOCS =
  "Documentation route registered only outside production (`setOpenApiRoutes` returns early there); it publishes the contract, never data.";

const PUBLIC_CONTRACT =
  "The published v1 contract (ADR 0006 D8), served in every environment. It describes endpoints rather than exposing any, and requiring a credential to read it would mean a client had to already be integrated in order to learn how to integrate.";

const MCP_TRANSPORT =
  "The MCP transport. One HTTP request carries a whole JSON-RPC conversation, so the request has no single class; the gate runs per tool call inside the assembled registry, which is also what makes a mid-session revocation bite on the next call.";

export const ALWAYS_PUBLIC: readonly AlwaysPublicEntry[] = [
  // --- OAuth / OIDC ------------------------------------------------------
  {
    opId: "REST GET /api-gateway/oauth/interaction/{uid}",
    reason: OIDC_CEREMONY,
  },
  {
    opId: "REST POST /api-gateway/oauth/interaction/{uid}/login",
    reason: `${OIDC_CEREMONY} The scope vocabulary cannot express consent anyway — a delegated scope says what a credential may do, not that a person agreed — so the handler requires a full signed-in session (\`assertSessionIdentity\`) before it will build a Grant.`,
  },
  {
    opId: "REST ALL /api-gateway/oauth/{*path}",
    reason: `${OIDC_CEREMONY} Covers the provider's own endpoints, dynamic client registration included.`,
  },
  {
    opId: "REST GET /.well-known/oauth-authorization-server",
    reason:
      "RFC 8414 requires this document to be readable anonymously — a client reads it precisely because it does not yet have a credential.",
  },
  {
    opId: "REST GET /.well-known/oauth-protected-resource",
    reason:
      "RFC 9728 requires anonymous readability: it is what a 401's `WWW-Authenticate` hint points at, so gating it would make the hint useless.",
  },
  {
    opId: "REST GET /.well-known/oauth-protected-resource/v1",
    reason:
      "RFC 9728 resource-specific discovery metadata; clients need it before they can present a credential to the application API.",
  },
  {
    opId: "REST GET /.well-known/security.txt",
    reason:
      "RFC 9116 security contact metadata; vulnerability reporters and automated security tooling must be able to read it without an application credential.",
  },
  {
    opId: "REST GET /.well-known/mcp.json",
    reason:
      "Public MCP discovery metadata; a client must be able to learn the transport, endpoint, tools, and OAuth URLs before it has a credential.",
  },

  // --- Probes and operator surfaces -------------------------------------
  {
    opId: "REST GET /healthz",
    reason:
      "Liveness probe with constant cost and no user data; the orchestrator calling it holds no credential of any kind.",
  },
  {
    opId: "REST GET /metrics/backend",
    reason:
      "Prometheus scrape behind its own `x-api-key` (`metricsAuthRequired`); the scraper is infrastructure, unrelated to any user identity.",
  },
  {
    opId: "REST GET /metrics/ledger",
    reason:
      "Prometheus scrape behind its own `x-api-key` (`metricsAuthRequired`), proxied from ledger-v2; same reasoning as `/metrics/backend`.",
  },
  {
    opId: "REST GET /api-gateway/v1/openapi.json",
    reason: PUBLIC_CONTRACT,
  },
  { opId: "REST GET /api-docs", reason: DEV_ONLY_DOCS },
  { opId: "REST GET /api-docs/swagger.json", reason: DEV_ONLY_DOCS },
  { opId: "REST GET /api-admin-docs", reason: DEV_ONLY_DOCS },
  { opId: "REST GET /api-admin-docs/swagger.json", reason: DEV_ONLY_DOCS },

  // --- Admin API ---------------------------------------------------------
  { opId: "REST POST /api/admin/login-as", reason: ADMIN_TOKEN },
  { opId: "REST POST /api/admin/unblock-user", reason: ADMIN_TOKEN },
  { opId: "REST POST /api/admin/run-migrations", reason: ADMIN_TOKEN },
  { opId: "REST POST /api/admin/get-signup-otp", reason: ADMIN_TOKEN },
  { opId: "REST GET /api/admin/recent-users", reason: ADMIN_TOKEN },
  { opId: "REST GET /api/admin/active-paid-users", reason: ADMIN_TOKEN },
  { opId: "REST GET /api/admin/stats", reason: ADMIN_TOKEN },
  { opId: "REST POST /api/admin/fix-user-email", reason: ADMIN_TOKEN },
  { opId: "REST POST /api/admin/user-detail", reason: ADMIN_TOKEN },
  {
    opId: "REST GET /api/admin/ledger-limits/{ledgerUsername}",
    reason: ADMIN_TOKEN,
  },
  { opId: "REST POST /api/admin/user-ledgers", reason: ADMIN_TOKEN },

  // --- Webhooks ----------------------------------------------------------
  {
    opId: "REST POST /api-gateway/stripe/webhook",
    reason: `Stripe webhook. ${SIGNATURE_IS_THE_CREDENTIAL}`,
  },
  {
    opId: "REST GET /api-gateway/stripe/webhook",
    reason:
      "GET twin of the Stripe webhook: answers a reachability probe with a fixed string and reads nothing, so there is no caller to scope.",
  },
  {
    opId: "REST POST /api/plaid/webhook",
    reason: `Plaid webhook. ${SIGNATURE_IS_THE_CREDENTIAL}`,
  },
  {
    opId: "REST GET /api/plaid/test_webhook",
    reason:
      "Plaid's own connectivity check, which it calls with no credential to confirm the URL is reachable before delivering real events.",
  },

  // --- SEO and legacy redirects -----------------------------------------
  {
    opId: "REST GET /api-gateway/sitemap.xml",
    reason:
      "SEO artefact served to anonymous crawlers; it lists only ledgers already public.",
  },
  {
    opId: "REST GET /ledger/editor/",
    reason:
      "v1-compat redirect. It verifies the legacy token itself and answers with a 301 to the dashboard; it reads no ledger data, and gating it would break the very old links it exists to rescue.",
  },

  // --- Git over HTTP -----------------------------------------------------
  {
    opId: "REST ALL /git{/*path}",
    reason:
      "Git speaks basic auth, not bearer tokens: the proxy authenticates the git client itself and translates the credential to Gitea's, so there is no OAuth scope in play. Its own policy gates (ADR 0004/0005) are what constrain it.",
  },

  // --- Surface transports ------------------------------------------------
  {
    opId: "REST GET /api-gateway/schema.graphql",
    reason:
      "Publishes the schema's SDL, the same contract GraphQL introspection already exposes. It carries no caller and reads no data.",
  },
  {
    opId: "REST POST /api-gateway/mcp",
    reason: MCP_TRANSPORT,
  },
  {
    opId: "REST GET /api-gateway/mcp",
    reason: MCP_TRANSPORT,
  },
  {
    opId: "REST DELETE /api-gateway/mcp",
    reason: MCP_TRANSPORT,
  },
  {
    opId: "REST ALL /api-gateway/",
    reason:
      "The GraphQL transport. Its ops are gated one level in, per root field, by `graphqlScopeMiddleware` — checking the HTTP mount as well would classify a whole document by its envelope and refuse queries the matrix allows.",
  },
];

/** Fast membership test for the census. */
export const ALWAYS_PUBLIC_OP_IDS: ReadonlySet<string> = new Set(
  ALWAYS_PUBLIC.map((entry) => entry.opId),
);
