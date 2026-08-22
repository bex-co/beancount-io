import { AppConfig } from "@/config/config";
import Router from "@koa/router";
import { setStripeWebhookHandler } from "@/features/stripe/api/stripe-webhook-handler";
import { setAdminApiRoute } from "@/features/admin/api/admin-api-handler";
import { setV1CompatRedirectRoutes } from "@/features/v1-compat/api/redirect-handler";
import { setLedgerApiHandler } from "@/features/ledger/api/rest/ledger-api-handler";
import { setGitProxyHandler } from "@/features/gitea/api/git-proxy-handler";
import { type AppLayers } from "@/foundation/composition";
import { setMetricHandler } from "@/metrics";
import { setSitemapHandler } from "@/features/sitemap/api/sitemap-handler";
import { setHealthzHandler } from "@/features/healthz/api/healthz-handler";
import { setupAiAgentRoutes } from "@/features/ai-agent/api";
import { setPlaidWebhookHandler } from "@/features/plaid/api/rest/plaid-webhook-handler";
import { setOidcRoutes } from "@/features/oauth/api/oidc-route";
import { restErrorMiddleware } from "./error-middleware";
import { restIdentityMiddleware } from "./identity-middleware";
import { setOpenApiRoutes } from "./openapi-routes";

/**
 * Set up all RESTful API routes
 *
 * This module centralizes all REST API route definitions including:
 * - Health checks
 * - OpenAPI spec + Swagger UI: /api-docs (public), /api-admin-docs (admin) — dev/test only
 * - Admin API
 * - V1 compatibility redirects
 * - Ledger API
 * - Stripe webhooks
 * - Metrics endpoints
 * - Sitemap generation
 * - AI chat endpoints
 * - Plaid webhooks (bank transaction sync notifications)
 * - Git HTTP proxy (translates app credentials to Gitea credentials)
 *
 * Two middlewares wrap everything below: the error adapter (outermost) and the
 * identity resolver, which publishes `ctx.state.identity` for handlers that
 * want the caller. See `server/api/identity.ts` — the one gate GraphQL and MCP
 * share (ADR 0006 D2).
 */
export async function setupRestRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): Promise<void> {
  // Outermost REST error adapter: translates thrown DomainErrors (and unexpected
  // errors) into the standardized `{ ok: false, error }` shape with the correct
  // HTTP status. Registered first so it wraps every REST route below.
  router.use(restErrorMiddleware());

  // Resolve the caller once, for every REST route. Non-blocking by design:
  // public routes (webhooks, health, OIDC ceremony) simply see no identity.
  router.use(restIdentityMiddleware(layers, config));

  // OAuth 2.1 + OIDC provider — dynamic client registration for MCP/AI-agent
  // clients, plus a static client for third-party identity login (e.g. the
  // Discourse forum's "Log in with Beancount")
  setOidcRoutes(router, layers, config);

  // Health check endpoint (deep check of all dependencies)
  setHealthzHandler(router, layers, config);

  // OpenAPI spec + Swagger UI (dev/test only)
  setOpenApiRoutes(router, config);

  // Metrics endpoints (Prometheus)
  setMetricHandler(router, config);

  // Admin API endpoints
  setAdminApiRoute(router, layers, config);

  // Stripe webhook endpoints
  setStripeWebhookHandler(router, layers);

  // Plaid webhook endpoints (bank transaction sync notifications)
  setPlaidWebhookHandler(router, layers);

  // V1 API compatibility redirects (redirects old URLs to new dashboard)
  setV1CompatRedirectRoutes(router, layers, config);

  // Ledger API endpoints
  setLedgerApiHandler(router, layers, config);

  // Sitemap generation for SEO
  setSitemapHandler(router, layers, config);

  // AI agent endpoints (chat, agent streaming, proxy, MCP)
  setupAiAgentRoutes(router, layers, config);

  // Git HTTP proxy (translates app credentials to Gitea credentials)
  // Allows: git clone http://localhost:4104/git/<owner>/<repo>.git
  setGitProxyHandler(router, layers, config);
}
