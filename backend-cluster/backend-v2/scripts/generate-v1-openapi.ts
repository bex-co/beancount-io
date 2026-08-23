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
import { REST_FRAGMENTS } from "@/server/api/composition-root";
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

// Every REST fragment, not a hand-kept list of the v1 ones: the document is
// filtered by tag, so registering everything and filtering is the same result
// with none of the drift. A fragment added without being listed here is
// exactly the bug `openapi-completeness.test.ts` exists to catch, and this
// script should not be able to cause it.
const router = new Router();
for (const fragment of REST_FRAGMENTS) {
  fragment.register(router, { layers: stub, config });
}

const outputPath = path.resolve(__dirname, "../docs/openapi/v1.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(generateV1OpenAPIDocument(), null, 2) + "\n",
);
console.log(`Wrote ${outputPath}`);
