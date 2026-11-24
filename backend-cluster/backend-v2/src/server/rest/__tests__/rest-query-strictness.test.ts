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
  [
    "account-report",
    `${LEDGER}/account-report?accountName=Expenses:Food&bogus_param=1`,
  ],
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
  [
    "collaborators/permission",
    `${LEDGER}/collaborators/permission?collaborator=alice&bogus_param=1`,
  ],
  ["public-keys", "/api-gateway/v1/public-keys?bogus_param=1"],
  [
    "asset-download-url",
    "/api-gateway/v1/asset-download-url?ledgerRepoId=42&filename=x&bogus_param=1",
  ],
  [
    "temp-assets/download-url",
    "/api-gateway/v1/temp-assets/download-url?bogus_param=1",
  ],
  // w1/218: lenient in their values only (see below).
  ["accounts", `${LEDGER}/accounts?bogus_param=1`],
  ["feature-flags", "/api-gateway/v1/feature-flags?bogus_param=1"],
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

// w1/201: an invalid `%XX` was kept literally and invalid UTF-8 became
// U+FFFD, so a truncated or double-encoded filter reached the service as a
// different value and answered an empty success. The encoding is checked
// before the schema, on every route.
it.each(routes)(
  "refuses a malformed percent-encoding on %s",
  async (_name, path) => {
    for (const bad of ["%ZZ", "%E0%A4%A"]) {
      const response = await fetch(
        `${server.url}${path.replace("bogus_param=1", `bogus_param=${bad}`)}`,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: "Invalid URI encoding in query parameter bogus_param",
        },
      });
    }
  },
);

describe("percent-encoding on a REST read (w1/201)", () => {
  const getJournal = jest.fn(async () => ({
    total: 0,
    data: [],
    is_empty: true,
  }));
  let reads: V1TestServer;
  beforeAll(async () => {
    reads = await startV1TestServer(
      {
        services: {
          ledgerData: { getJournal },
          ledgerJournal: { getJournal },
        },
      } as unknown as AppLayers,
      { api: { scopeEnforcement: "enforce" } } as AppConfig,
    );
    reads.setIdentity(sessionIdentity);
  });
  afterAll(async () => reads.close());
  beforeEach(() => getJournal.mockClear());

  it("refuses a malformed path segment before any handler", async () => {
    const response = await fetch(`${reads.url}${LEDGER}/files/%ZZ`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "BAD_USER_INPUT",
        message: "Invalid URI encoding in request path",
      },
    });
  });

  it("still decodes a well-formed value, `+` included", async () => {
    for (const [raw, decoded] of [
      ["Caf%C3%A9", "Café"],
      ["a+b", "a b"],
      ["Assets%3ABank", "Assets:Bank"],
    ]) {
      const response = await fetch(
        `${reads.url}${LEDGER}/journal?account=${raw}`,
      );
      expect(response.status).toBe(200);
      expect(getJournal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ account: decoded }),
        }),
      );
    }
  });

  it("never hands the service a value it could not decode", async () => {
    const response = await fetch(`${reads.url}${LEDGER}/journal?account=%ZZ`);
    expect(response.status).toBe(400);
    expect(getJournal).not.toHaveBeenCalled();
  });
});

// w23/159: the trial balance is hierarchy-only, so its query drops
// `interval` — an advertised grouping there would be accepted and ignored.
it("refuses ?interval=month on trial-balance", async () => {
  const response = await fetch(
    `${server.url}${LEDGER}/trial-balance?interval=month`,
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message: expect.stringContaining("interval"),
    },
  });
});

// w23/m12/t007 kept two queries lenient in their values; w1/218 made both
// refuse an unknown key, as their MCP resources do. The value leniency stays.
describe("documented lenient values", () => {
  const getAccounts = jest.fn(async () => ["Assets:Cash"]);
  let loose: V1TestServer;
  beforeAll(async () => {
    loose = await startV1TestServer(
      {
        services: { ledgerAccount: { getAccounts } },
      } as unknown as AppLayers,
      { api: { scopeEnforcement: "enforce" } } as AppConfig,
    );
    loose.setIdentity(sessionIdentity);
  });
  afterAll(async () => loose.close());

  it("accounts lists all accounts for a status it does not know", async () => {
    const response = await fetch(
      `${loose.url}/api-gateway/v1/ledgers/alice/main/accounts?status=bogus`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(["Assets:Cash"]);
    expect(getAccounts).toHaveBeenCalledWith(
      "alice",
      "main",
      "bogus",
      expect.anything(),
    );
  });

  it("feature-flags answers the flags for any userId", async () => {
    const response = await fetch(
      `${loose.url}/api-gateway/v1/feature-flags?userId=anyone`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      spendingReportSubscription: false,
      emailDelivery: false,
      selfHost: false,
    });
  });
});

// w31/071: numeric URL query and path parameters must accept only strict
// base-10 strings — never silently coerce `""` / whitespace to `0` or accept
// hex / binary / octal / scientific / float literals via JS `Number()`.
describe("strict numeric query and path parameters (w31/071)", () => {
  const invalidInts = [
    ["empty string", ""],
    ["whitespace", "%20%20"],
    ["padded integer", "%202%20"],
    ["hex literal", "0x2"],
    ["binary literal", "0b10"],
    ["octal literal", "0o10"],
    ["scientific notation", "1e1"],
    ["float string", "1.0"],
  ] as const;

  const invalidDecimals = [
    ["empty string", ""],
    ["whitespace", "%20%20"],
    ["padded decimal", "%202.5%20"],
    ["hex literal", "0x2"],
    ["binary literal", "0b10"],
    ["octal literal", "0o10"],
    ["scientific notation", "1e1"],
    ["Infinity", "Infinity"],
    ["NaN", "NaN"],
  ] as const;

  const integerRoutes: readonly [string, (value: string) => string][] = [
    ["journal offset", (v) => `${LEDGER}/journal?limit=2&offset=${v}`],
    ["journal limit", (v) => `${LEDGER}/journal?limit=${v}`],
    [
      "plaintext-journal offset",
      (v) => `${LEDGER}/plaintext-journal?limit=2&offset=${v}`,
    ],
    [
      "account-journal offset",
      (v) =>
        `${LEDGER}/account-journal?account=Assets:Cash&limit=2&offset=${v}`,
    ],
    ["account/feed offset", (v) => `/api-gateway/v1/account/feed?offset=${v}`],
    ["account/feed limit", (v) => `/api-gateway/v1/account/feed?limit=${v}`],
    ["commits page", (v) => `${LEDGER}/commits?page=${v}&limit=2`],
    ["commits limit", (v) => `${LEDGER}/commits?limit=${v}`],
    ["collaborators page", (v) => `${LEDGER}/collaborators?page=${v}`],
    [
      "social/followers page",
      (v) => `/api-gateway/v1/social/followers?username=alice&page=${v}`,
    ],
    ["ledgers page", (v) => `/api-gateway/v1/ledgers?page=${v}`],
    ["ledgers/search uid", (v) => `/api-gateway/v1/ledgers/search?uid=${v}`],
    [
      "asset-download-url ledgerRepoId",
      (v) => `/api-gateway/v1/asset-download-url?ledgerRepoId=${v}&filename=x`,
    ],
    ["public-keys page", (v) => `/api-gateway/v1/public-keys?page=${v}`],
    [
      "legacy/journal-entries first",
      (v) => `/api-gateway/v1/legacy/journal-entries?first=${v}`,
    ],
    [
      "legacy/journal-entries last",
      (v) => `/api-gateway/v1/legacy/journal-entries?last=${v}`,
    ],
  ];

  it.each(integerRoutes)(
    "refuses non-base-10 integer literals on %s",
    async (_label, buildPath) => {
      for (const [, raw] of invalidInts) {
        const response = await fetch(`${server.url}${buildPath(raw)}`);
        expect(response.status).toBe(400);
        const body = (await response.json()) as {
          ok: boolean;
          error: { code: string; message: string };
        };
        expect(body).toMatchObject({
          ok: false,
          error: { code: "VALIDATION_FAILED" },
        });
        expect(body.error.message).toMatch(/invalid integer/i);
        expect(body.error.message).not.toMatch(/too small/i);
      }
    },
  );

  it.each([
    ["pull-requests/{prNumber}", (v: string) => `${LEDGER}/pull-requests/${v}`],
    ["public-keys/{keyId}", (v: string) => `/api-gateway/v1/public-keys/${v}`],
  ])("refuses non-base-10 path integers on %s", async (_label, buildPath) => {
    for (const raw of ["%202%20", "0x2", "0b10", "0o10", "1e1", "1.0"]) {
      const response = await fetch(`${server.url}${buildPath(raw)}`);
      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        ok: boolean;
        error: { code: string; message: string };
      };
      expect(body).toMatchObject({
        ok: false,
        error: { code: "VALIDATION_FAILED" },
      });
      expect(body.error.message).toMatch(/invalid integer/i);
    }
  });

  it.each(["amountMin", "amountMax"])(
    "refuses non-base-10 decimal literals on legacy/journal-entries %s",
    async (param) => {
      for (const [, raw] of invalidDecimals) {
        const response = await fetch(
          `${server.url}/api-gateway/v1/legacy/journal-entries?${param}=${raw}`,
        );
        expect(response.status).toBe(400);
        const body = (await response.json()) as {
          ok: boolean;
          error: { code: string; message: string };
        };
        expect(body).toMatchObject({
          ok: false,
          error: { code: "VALIDATION_FAILED" },
        });
        expect(body.error.message).toMatch(/invalid number/i);
      }
    },
  );

  it("preserves missing-required and out-of-range error messages", async () => {
    const missing = await fetch(
      `${server.url}/api-gateway/v1/asset-download-url?filename=x`,
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining("ledgerRepoId is required"),
      },
    });

    const tooSmall = await fetch(`${server.url}${LEDGER}/journal?limit=0`);
    expect(tooSmall.status).toBe(400);
    expect(await tooSmall.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringMatching(/too small|>=1/i),
      },
    });

    const negativeOffset = await fetch(
      `${server.url}${LEDGER}/journal?offset=-1`,
    );
    expect(negativeOffset.status).toBe(400);
    expect(await negativeOffset.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringMatching(/too small|>=0/i),
      },
    });

    const tooBig = await fetch(`${server.url}${LEDGER}/journal?limit=1001`);
    expect(tooBig.status).toBe(400);
    expect(await tooBig.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringMatching(/too big|<=1000/i),
      },
    });
  });

  describe("canonical base-10 numbers and defaults", () => {
    const getJournal = jest.fn(async () => ({
      total: 0,
      data: [],
      is_empty: true,
    }));
    const getLegacyJournal = jest.fn(async () => ({
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    }));
    const getFeed = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
    }));
    const getPullRequestDetails = jest.fn(async () => ({
      number: 7,
      title: "t",
      description: "d",
      state: "open",
      author: "alice",
      headBranch: "h",
      baseBranch: "main",
      files: [],
    }));
    let validServer: V1TestServer;
    beforeAll(async () => {
      validServer = await startV1TestServer(
        {
          services: {
            ledgerJournal: { getJournal },
            feed: { getFeed },
          },
          workflows: {
            ledger: { getLegacyJournal },
            pullRequest: { getPullRequestDetails },
          },
        } as unknown as AppLayers,
        { api: { scopeEnforcement: "enforce" } } as AppConfig,
      );
      validServer.setIdentity(sessionIdentity);
    });
    afterAll(async () => validServer.close());
    beforeEach(() => {
      getJournal.mockClear();
      getLegacyJournal.mockClear();
      getFeed.mockClear();
      getPullRequestDetails.mockClear();
    });

    it("accepts canonical base-10 integers, decimals, and omitted defaults", async () => {
      const journalRes = await fetch(
        `${validServer.url}${LEDGER}/journal?limit=2&offset=0`,
      );
      expect(journalRes.status).toBe(200);
      expect(getJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ limit: 2, offset: 0 }),
        }),
      );

      const legacyRes = await fetch(
        `${validServer.url}/api-gateway/v1/legacy/journal-entries?first=5&amountMin=-12.5&amountMax=.5`,
      );
      expect(legacyRes.status).toBe(200);
      expect(getLegacyJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.objectContaining({
            first: 5,
            amountMin: -12.5,
            amountMax: 0.5,
          }),
        }),
      );

      const feedRes = await fetch(
        `${validServer.url}/api-gateway/v1/account/feed`,
      );
      expect(feedRes.status).toBe(200);
      expect(getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 10 }),
        expect.anything(),
      );

      const prRes = await fetch(`${validServer.url}${LEDGER}/pull-requests/7`);
      expect(prRes.status).toBe(200);
      expect(getPullRequestDetails).toHaveBeenCalledWith(
        "alice",
        "main",
        7,
        expect.anything(),
      );
    });
  });
});
