/**
 * Generate backend-v2 OpenAPI spec by calling all REST handler setup functions
 * to populate the global OpenAPI registry, then writing the spec to idl/.
 *
 * Usage: ts-node -r tsconfig-paths/register scripts/generate-openapi-spec.ts
 */

// Must be first — extends Zod with OpenAPI methods before any schema imports
import "@/shared/zod-openapi-setup";

import Router from "@koa/router";
import fs from "fs";
import path from "path";

// Import all handlers that register OpenAPI routes
import { setHealthzHandler } from "@/features/healthz/api/healthz-handler";
import { setAdminApiRoute } from "@/features/admin/api/admin-api-handler";
import { setStripeWebhookHandler } from "@/features/stripe/api/stripe-webhook-handler";
import { setV1CompatRedirectRoutes } from "@/features/v1-compat/api/redirect-handler";
import { setLedgerApiHandler } from "@/features/ledger/api/rest/ledger-api-handler";
import { setSitemapHandler } from "@/features/sitemap/api/sitemap-handler";

import { generateCombinedOpenAPIDocument } from "@/server/rest/openapi-registry";

const router = new Router();
// Services/clients/workflows are only used inside route callbacks (at request
// time), never during route registration — except a handful of setup
// functions (e.g. setAdminApiRoute) that eagerly construct a service from
// `layers.database.models.*`/`layers.services.*` before registering any
// route. Those property reads must not throw, so the mock is shaped like
// AppLayers one level deep (each leaf can stay `undefined` — nothing calls
// into it during setup).
const mockLayers = {
  database: { db: undefined, models: {} },
  clients: {},
  services: {},
  workflows: {},
} as any;
const mockConfig = {
  env: "development",
  server: { port: 4104 },
  dashboard: { url: "https://beancount.io" },
  gitea: { hostname: "localhost", httpPort: 3000 },
} as any;

// Call each handler to register its routes with the OpenAPI registry.
// Route callbacks reference services/config but are never invoked here.
const handlers: Array<{ name: string; fn: () => void }> = [
  { name: "healthz", fn: () => setHealthzHandler(router, mockLayers, mockConfig) },
  { name: "admin", fn: () => setAdminApiRoute(router, mockLayers, mockConfig) },
  {
    name: "stripe-webhook",
    fn: () => setStripeWebhookHandler(router, mockLayers),
  },
  {
    name: "v1-compat",
    fn: () => setV1CompatRedirectRoutes(router, mockLayers, mockConfig),
  },
  {
    name: "ledger",
    fn: () => setLedgerApiHandler(router, mockLayers, mockConfig),
  },
  {
    name: "sitemap",
    fn: () => setSitemapHandler(router, mockLayers, mockConfig),
  },
];

const failedHandlers: string[] = [];

for (const handler of handlers) {
  try {
    handler.fn();
  } catch (err) {
    failedHandlers.push(handler.name);
    console.error(
      `Failed to register OpenAPI routes for the "${handler.name}" handler:`,
      err instanceof Error ? err.message : err,
    );
  }
}

if (failedHandlers.length > 0) {
  console.error(
    `\nOpenAPI spec generation aborted: ${failedHandlers.join(", ")} handler(s) failed to register their routes (see errors above). ` +
      "This means the generated spec would silently be missing those routes — fix the mock layers in this script, or the handler's setup code, before regenerating.",
  );
  process.exit(1);
}

const doc = generateCombinedOpenAPIDocument();
const outputPath = path.resolve(__dirname, "../../idl/backend-v2.openapi.json");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2) + "\n");
console.log(`Wrote ${outputPath}`);
