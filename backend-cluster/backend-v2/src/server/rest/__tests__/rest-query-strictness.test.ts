import "reflect-metadata";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import {
  sessionIdentity,
  startV1TestServer,
  type V1TestServer,
} from "./v1-test-server";

// w23/m12/t004: every REST GET query schema below is strict — an undeclared
// key refuses with 400 naming the key instead of silently dropping the
// filter. Validation runs before handlers, so no service mocks are needed;
// a mistyped path would 404 and fail the case, keeping the list honest.
const LEDGER = "/api-gateway/v1/ledgers/alice/main";
const routes: [string, string][] = [
  // t002 — ledger slice.
  ["journal", `${LEDGER}/journal?bogus_param=1`],
  ["plaintext-journal", `${LEDGER}/plaintext-journal?bogus_param=1`],
  [
    "account-journal",
    `${LEDGER}/account-journal?account=Assets:Cash&bogus_param=1`,
  ],
  ["source-files", `${LEDGER}/source-files?bogus_param=1`],
  ["events", `${LEDGER}/events?bogus_param=1`],
  ["documents", `${LEDGER}/documents?bogus_param=1`],
  ["trial-balance", `${LEDGER}/trial-balance?bogus_param=1`],
  ["holdings", `${LEDGER}/holdings?bogus_param=1`],
  ["register", `${LEDGER}/register?account=Assets:Cash&bogus_param=1`],
  ["capital-gains", `${LEDGER}/capital-gains?bogus_param=1`],
  ["interval-totals", `${LEDGER}/interval-totals?bogus_param=1`],
  ["account-report", `${LEDGER}/account-report?accountName=Expenses:Food&bogus_param=1`],
  ["account-last-entries", `${LEDGER}/account-last-entries?bogus_param=1`],
  ["entries-count", `${LEDGER}/entries-count?bogus_param=1`],
  ["postings-per-account", `${LEDGER}/postings-per-account?bogus_param=1`],
  [
    "payee-transactions",
    `${LEDGER}/payee-transactions?payee=Cafe&bogus_param=1`,
  ],
  [
    "narration-transactions",
    `${LEDGER}/narration-transactions?narration=Lunch&bogus_param=1`,
  ],
  ["payee-accounts", `${LEDGER}/payee-accounts?payee=Cafe&bogus_param=1`],
  ["entry-context", `${LEDGER}/entry-context?bogus_param=1`],
  ["account-directives", `${LEDGER}/account-directives?bogus_param=1`],
  ["overview", `${LEDGER}/overview?bogus_param=1`],
  ["statements", `${LEDGER}/statements/balance-sheet?bogus_param=1`],
  ["files", `${LEDGER}/files?bogus_param=1`],
  ["latest-commit", `${LEDGER}/latest-commit?bogus_param=1`],
  ["commits", `${LEDGER}/commits?bogus_param=1`],
  ["commit-details", `${LEDGER}/commit-details?sha=abc&bogus_param=1`],
  // t003 — non-ledger slice.
  ["ledgers", "/api-gateway/v1/ledgers?bogus_param=1"],
  ["ledgers/owned", "/api-gateway/v1/ledgers/owned?bogus_param=1"],
  ["ledgers/search", "/api-gateway/v1/ledgers/search?bogus_param=1"],
  [
    "social/profile",
    "/api-gateway/v1/social/profile?username=alice&bogus_param=1",
  ],
  [
    "social/followers",
    "/api-gateway/v1/social/followers?username=alice&bogus_param=1",
  ],
  [
    "social/following",
    "/api-gateway/v1/social/following?username=alice&bogus_param=1",
  ],
  [
    "social/starred-repositories",
    "/api-gateway/v1/social/starred-repositories?username=alice&bogus_param=1",
  ],
  ["account/feed", "/api-gateway/v1/account/feed?bogus_param=1"],
  ["user-profile", "/api-gateway/v1/user-profile?bogus_param=1"],
  ["legacy/ledger-meta", "/api-gateway/v1/legacy/ledger-meta?bogus_param=1"],
  [
    "legacy/journal-entries",
    "/api-gateway/v1/legacy/journal-entries?bogus_param=1",
  ],
  // Already strict before the milestone — pinned against regressions.
  ["collaborators", `${LEDGER}/collaborators?bogus_param=1`],
  ["collaborators/permission", `${LEDGER}/collaborators/permission?collaborator=alice&bogus_param=1`],
  ["public-keys", "/api-gateway/v1/public-keys?bogus_param=1"],
  ["asset-download-url", "/api-gateway/v1/asset-download-url?ledgerRepoId=42&filename=x&bogus_param=1"],
  [
    "temp-assets/download-url",
    "/api-gateway/v1/temp-assets/download-url?bogus_param=1",
  ],
];

let server: V1TestServer;
beforeAll(async () => {
  server = await startV1TestServer(
    {} as unknown as AppLayers,
    { api: { scopeEnforcement: "enforce" } } as AppConfig,
  );
  server.setIdentity(sessionIdentity);
});
afterAll(async () => server.close());

it.each(routes)("refuses ?bogus_param=1 on %s", async (_name, path) => {
  const response = await fetch(`${server.url}${path}`);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message: expect.stringContaining("bogus_param"),
    },
  });
});
