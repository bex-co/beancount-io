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

// Must be first — extends Zod with OpenAPI methods before any schema imports
import "@/shared/zod-openapi-setup";

import Router from "@koa/router";
import fs from "fs";
import path from "path";

import {
  setLedgerV1Routes,
  setLedgerV1TicketRoutes,
} from "@/features/ledger/api/rest/v1";
import { generateV1OpenAPIDocument } from "@/server/rest/openapi-registry";

/**
 * Registration only closes over layers and config; nothing reads them until a
 * request arrives. A proxy that answers every access with itself is therefore
 * enough, and keeps the script from needing a database.
 */
const stub = new Proxy(function stub() {} as never, {
  get: (_target, prop) => (prop === "then" ? undefined : stub),
  apply: () => stub,
  construct: () => stub,
}) as never;

const router = new Router();
setLedgerV1Routes(router, stub, stub);
setLedgerV1TicketRoutes(router, stub, stub);

const outputPath = path.resolve(__dirname, "../docs/openapi/v1.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(generateV1OpenAPIDocument(), null, 2) + "\n",
);
console.log(`Wrote ${outputPath}`);
