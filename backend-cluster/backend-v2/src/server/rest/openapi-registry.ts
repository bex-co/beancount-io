import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import { config } from "@/config/config";

// Create a global OpenAPI registry instance
export const registry = new OpenAPIRegistry();

// Register security schemes consistent with implementation
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "JWT Bearer token for authenticated user endpoints",
});

registry.registerComponent("securitySchemes", "adminToken", {
  type: "apiKey",
  in: "header",
  name: "x-admin-token",
  description: "Admin API token for administrative operations",
});

registry.registerComponent("securitySchemes", "apiKey", {
  type: "apiKey",
  in: "header",
  name: "x-api-key",
  description: "API key for authenticated endpoints",
});

const ADMIN_TAG = "Admin API";

/**
 * The tag that marks a route as part of the public v1 contract. Set by
 * `registerV1Route`, so a route is in the published spec exactly when it is
 * mounted by the v1 fragment — not because someone remembered to tag it.
 */
export const V1_TAG = "Ledger v1";

function isAdminRouteDefinition(
  def: (typeof registry.definitions)[number],
): boolean {
  return def.type === "route" && (def.route.tags ?? []).includes(ADMIN_TAG);
}

/**
 * Definitions to include in a document filtered to admin (or non-admin)
 * routes. Non-route definitions (security schemes, schemas, params) must
 * pass through to both documents unconditionally — only `type: "route"`
 * entries get filtered by tag.
 */
function filterDefinitions(wantAdminRoutes: boolean) {
  return registry.definitions.filter(
    (def) =>
      def.type !== "route" || isAdminRouteDefinition(def) === wantAdminRoutes,
  );
}

function getServerConfig() {
  return {
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: "Development server",
      },
      {
        url: "https://api.v3.beancount.io",
        description: "Production server",
      },
    ],
  };
}

/**
 * Generate the public (non-admin) OpenAPI specification document. Served at
 * /api-docs. Admin endpoints have their own document — see
 * generateAdminOpenAPIDocument.
 */
export function generatePublicOpenAPIDocument() {
  const definitions = filterDefinitions(false);
  const generator = new OpenApiGeneratorV3(definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Beancount.io Backend API",
      version: "2.0.0",
      description: `
Backend REST API for Beancount.io - a web-based interface for managing Beancount accounting files.

## Features
- User authentication and authorization
- Ledger file management with Git-based version control
- Stripe webhook integration for payment processing

## Authentication
The API supports multiple authentication methods:
- **Bearer Token**: JWT-based authentication for user endpoints
- **API Key**: API key for authenticated endpoints

Admin operations are documented separately at \`/api-admin-docs\`.
      `.trim(),
      contact: {
        name: "Beancount.io",
        url: "https://github.com/bex-co/beancount-io",
      },
    },
    ...getServerConfig(),
    tags: [
      {
        name: "Authentication",
        description: "User authentication and account management endpoints",
      },
      {
        name: "Ledger",
        description: "Ledger file operations and editor access",
      },
      {
        name: "Stripe Webhooks",
        description: "Stripe payment webhook handlers",
      },
      {
        name: "Health",
        description: "Service health check endpoints",
      },
      {
        name: "SEO",
        description: "Search Engine Optimization endpoints",
      },
    ],
  });
}

/**
 * Generate the admin-only OpenAPI specification document (routes tagged
 * "Admin API"). Served at /api-admin-docs.
 */
export function generateAdminOpenAPIDocument() {
  const definitions = filterDefinitions(true);
  const generator = new OpenApiGeneratorV3(definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Beancount.io Admin API",
      version: "2.0.0",
      description: `
Administrative REST API for Beancount.io support/ops tooling.

## Authentication
All admin endpoints require the **Admin Token** (\`x-admin-token\` header).
      `.trim(),
      contact: {
        name: "Beancount.io",
        url: "https://github.com/bex-co/beancount-io",
      },
    },
    ...getServerConfig(),
    tags: [
      {
        name: "Admin API",
        description:
          "Administrative operations requiring admin token authentication",
      },
    ],
  });
}

/**
 * Generate the combined OpenAPI document covering every registered route
 * (admin + non-admin), unfiltered. Not served over HTTP — the runtime docs
 * are split via generatePublicOpenAPIDocument/generateAdminOpenAPIDocument.
 * Used by scripts/generate-openapi-spec.ts to produce
 * idl/backend-v2.openapi.json, which downstream codegen (e.g.
 * backend-v2-admin-cli) consumes.
 */
export function generateCombinedOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Beancount.io Backend API",
      version: "2.0.0",
      description: `
Backend REST API for Beancount.io - a web-based interface for managing Beancount accounting files.

## Features
- User authentication and authorization
- Ledger file management with Git-based version control
- Admin operations for user and ledger management
- Stripe webhook integration for payment processing

## Authentication
The API supports multiple authentication methods:
- **Bearer Token**: JWT-based authentication for user endpoints
- **Admin Token**: Special admin API key for administrative operations
- **API Key**: API key for authenticated endpoints
      `.trim(),
      contact: {
        name: "Beancount.io",
        url: "https://github.com/bex-co/beancount-io",
      },
    },
    ...getServerConfig(),
    tags: [
      {
        name: "Authentication",
        description: "User authentication and account management endpoints",
      },
      {
        name: "Admin API",
        description:
          "Administrative operations requiring admin token authentication",
      },
      {
        name: "Ledger",
        description: "Ledger file operations and editor access",
      },
      {
        name: "Stripe Webhooks",
        description: "Stripe payment webhook handlers",
      },
      {
        name: "Health",
        description: "Service health check endpoints",
      },
      {
        name: "SEO",
        description: "Search Engine Optimization endpoints",
      },
    ],
  });
}

/**
 * Generate the public v1 OpenAPI document — the contract we publish.
 *
 * Filtered to the `Ledger v1` tag rather than to "everything non-admin": the
 * pre-v1 REST routes (`/api-gateway/...`) are internal surface we have not
 * promised anybody, and a public spec that documents them is a public spec that
 * promises them. `scripts/generate-v1-openapi.ts` writes this document to
 * `docs/openapi/v1.json`, and `openapi-completeness.test.ts` fails when the
 * snapshot and the live document disagree.
 */
export function generateV1OpenAPIDocument() {
  const definitions = registry.definitions.filter(
    (def) => def.type !== "route" || (def.route.tags ?? []).includes(V1_TAG),
  );
  const generator = new OpenApiGeneratorV3(definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Beancount.io v1 API",
      version: "1.0.0",
      description: `
The public REST API for Beancount.io ledgers.

Every endpoint addresses a ledger as two path segments — \`/v1/ledgers/{owner}/{name}\` —
and returns JSON. Errors share one shape: \`{ "ok": false, "error": { "code", "message" } }\`.

## Authentication

Send a bearer token: an OAuth 2.1 access token from this server's OIDC provider,
or a session token. Each operation is classified \`read\`, \`write\`, or \`admin\`, and a
token is refused when its scopes (\`ledger.read\`, \`ledger.write\`, \`ledger.admin\`)
do not cover the operation's class.

The one exception is the archive download, which takes a single-use ticket in the
query string instead — a browser following a download link cannot send a header.
      `.trim(),
      contact: {
        name: "Beancount.io",
        url: "https://github.com/bex-co/beancount-io",
      },
    },
    ...getServerConfig(),
    tags: [
      {
        name: V1_TAG,
        description:
          "Ledger resources: query, journal, accounts, statements, files, entries, archives",
      },
    ],
  });
}

/**
 * Helper function to register a route with the OpenAPI registry
 */
export function registerRoute(config: RouteConfig) {
  registry.registerPath(config);
}
