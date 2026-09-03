/**
 * Write the public v1 OpenAPI document to `docs/openapi/v1.json`.
 *
 * The snapshot is checked in so that a contract change shows up as a diff in
 * the pull request that causes it — "we changed the public API" should be
 * something a reviewer sees, not something a client discovers.
 * `openapi-completeness.test.ts` fails when the file and the live document
 * disagree, so regenerating is part of changing a v1 route, not a chore
 * somebody remembers.
 *
 * Usage: yarn generate-v1-openapi
 */

// Importing the composition root pulls in TypeGraphQL-decorated resolvers, so
// the metadata polyfill has to be loaded before anything else.
import "reflect-metadata";
// Extends Zod with OpenAPI methods before any schema imports.
import "@/shared/zod-openapi-setup";

import Router from "@koa/router";
import fs from "fs";
import path from "path";

import { config } from "@/config/config";
import { setLedgerV1Routes } from "@/features/ledger/api/rest/v1";
import { setApiKeyRoutes } from "@/features/apikeys/api/api-key-rest";
import { generateV1OpenAPIDocument } from "@/server/rest/openapi-registry";

/**
 * Registration only closes over the service layers; nothing calls into them
 * until a request arrives, so a proxy that answers every access with itself is
 * enough and the script needs no database. The real `config` is used, because
 * a few fragments do read it during setup (the OIDC provider validates its
 * issuer) — and because the spec's `servers` block comes from it.
 */
const stub = new Proxy(function stub() {} as never, {
  get: (_target, prop) => (prop === "then" ? undefined : stub),
  apply: () => stub,
  construct: () => stub,
}) as never;

// Register only the fragments that own public v1 declarations. Pulling in the
// whole composition root also initializes unrelated AI transports and their
// runtime-only dependencies, even though OpenAPI generation never calls them.
// `openapi-completeness.test.ts` independently compares the complete live REST
// assembly and `V1_DECLARED_ROUTES` in both directions, so a new v1 fragment
// cannot pass CI merely because this generator forgot it.
const router = new Router();
setLedgerV1Routes(router, stub, config);
setApiKeyRoutes(router, stub, config);

const outputPath = path.resolve(__dirname, "../docs/openapi/v1.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(generateV1OpenAPIDocument(), null, 2) + "\n",
);
console.log(`Wrote ${outputPath}`);
