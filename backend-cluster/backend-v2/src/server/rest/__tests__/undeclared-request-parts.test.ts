import "reflect-metadata";
import { z, type ZodType } from "zod";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { V1_DECLARED_ROUTES } from "@/server/api/composition-root";
import { v1RequestSchemas } from "../v1-route";
import { sessionIdentity, startV1TestServer } from "./v1-test-server";

/**
 * w1/218. A route validated only the parts it declared, so `?dry_run=true`
 * on a route that reads the preview flag from its body was dropped and the
 * write committed, and a body `dryRun` on a bank route that reads it from
 * the query did the same. Every part a route does not declare now accepts
 * nothing, and the declared ones are strict where a write could hide a flag.
 */
type Declared = {
  method: string;
  path: string;
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};
const ROUTES = (V1_DECLARED_ROUTES as readonly Declared[]).map((route) => ({
  name: `${route.method.toUpperCase()} ${route.path.replace("/api-gateway/v1", "")}`,
  method: route.method,
  ...v1RequestSchemas(route),
}));

/** How a schema treats `key`: reads it, refuses it, or drops it. */
function treatment(schema: ZodType | undefined, key: string) {
  const result = schema?.safeParse({ [key]: "not-a-flag" });
  if (!result || result.success) return "dropped";
  const issues = result.error.issues;
  if (
    issues.some(
      (issue) =>
        issue.code === "unrecognized_keys" &&
        (issue as { keys: string[] }).keys.includes(key),
    )
  )
    return "refused";
  return issues.some((issue) => issue.path[0] === key) ? "read" : "dropped";
}

/** Collect every ZodObject reachable inside a request body schema (root and nested). */
function collectObjectSchemas(
  schema: ZodType | undefined,
  location = "body",
  seen = new Set<ZodType>(),
): { location: string; schema: z.ZodObject }[] {
  if (!schema || seen.has(schema)) return [];
  seen.add(schema);

  if (schema instanceof z.ZodObject) {
    const found: { location: string; schema: z.ZodObject }[] = [
      { location, schema },
    ];
    for (const [key, value] of Object.entries(schema.shape)) {
      found.push(
        ...collectObjectSchemas(value as ZodType, `${location}.${key}`, seen),
      );
    }
    return found;
  }
  if (schema instanceof z.ZodArray) {
    return collectObjectSchemas(
      schema.def.element as ZodType,
      `${location}[]`,
      seen,
    );
  }
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodCatch
  ) {
    return collectObjectSchemas(
      schema.def.innerType as ZodType,
      location,
      seen,
    );
  }
  if (schema instanceof z.ZodPipe) {
    return [
      ...collectObjectSchemas(schema.def.in as ZodType, location, seen),
      ...collectObjectSchemas(schema.def.out as ZodType, location, seen),
    ];
  }
  if (schema instanceof z.ZodUnion) {
    return (schema.def.options as readonly ZodType[]).flatMap((option, i) =>
      collectObjectSchemas(option, `${location}|${i}`, seen),
    );
  }
  if (schema instanceof z.ZodIntersection) {
    return [
      ...collectObjectSchemas(schema.def.left as ZodType, location, seen),
      ...collectObjectSchemas(schema.def.right as ZodType, location, seen),
    ];
  }
  if (schema instanceof z.ZodTuple) {
    const items = (schema.def.items as readonly ZodType[]).flatMap((item, i) =>
      collectObjectSchemas(item, `${location}[${i}]`, seen),
    );
    const rest = schema.def.rest
      ? collectObjectSchemas(
          schema.def.rest as ZodType,
          `${location}[...]`,
          seen,
        )
      : [];
    return [...items, ...rest];
  }
  if (schema instanceof z.ZodRecord) {
    return collectObjectSchemas(
      schema.def.valueType as ZodType,
      `${location}[*]`,
      seen,
    );
  }
  if (schema instanceof z.ZodLazy) {
    return collectObjectSchemas(schema.def.getter() as ZodType, location, seen);
  }
  return [];
}

// RFC 7662 token introspection deliberately allows extension parameters.
const NON_STRICT_BODIES = new Set(["POST /token/introspect"]);

it.each(ROUTES.map((route) => [route.name, route]))(
  "%s refuses a query key it does not declare",
  (_name, route) => {
    expect(treatment(route.query, "zz_probe")).toBe("refused");
  },
);

it.each(
  ROUTES.filter((route) => !NON_STRICT_BODIES.has(route.name)).map((route) => [
    route.name,
    route,
  ]),
)(
  "%s refuses unknown keys on its JSON body and every nested object (w31/076)",
  (_name, route) => {
    const objects = collectObjectSchemas(route.body);
    expect(objects.length).toBeGreaterThan(0);
    const nonStrict = objects
      .filter(({ schema }) => treatment(schema, "zz_probe") !== "refused")
      .map(({ location }) => location);
    expect(nonStrict).toEqual([]);
  },
);

it.each(
  ROUTES.filter((route) => route.method !== "get").map((route) => [
    route.name,
    route,
  ]),
)(
  "%s reads or refuses a preview flag in its query and body",
  (_name, route) => {
    for (const key of ["dry_run", "dryRun"]) {
      expect(treatment(route.query, key)).not.toBe("dropped");
      if (!NON_STRICT_BODIES.has(route.name))
        expect(treatment(route.body, key)).not.toBe("dropped");
    }
  },
);

it("still accepts no body, or an empty one, where none is declared", () => {
  const none = ROUTES.find((route) => route.name === "DELETE /account")!;
  expect(none.body?.safeParse(undefined).success).toBe(true);
  expect(none.body?.safeParse({}).success).toBe(true);
});

describe("over HTTP", () => {
  const services = {
    ledgerEntry: {
      addBulkEntries: jest.fn(),
      appendDirectiveText: jest.fn(),
    },
    ledgerFile: { updateFile: jest.fn(), deleteFile: jest.fn() },
    ledgerRepo: {
      changeFiles: jest.fn(async () => ({})),
      checkProjectedFiles: jest.fn(async () => []),
      listDirContent: jest.fn(async () => []),
      getFilesContent: jest.fn(async () => []),
    },
    ledgerShell: {
      queryShell: jest.fn(async () => ({
        resultType: "table",
        table: { types: [], rows: [], t: "t" },
      })),
      queryShellText: jest.fn(async () => ({ text: "" })),
    },
    ledgerLifecycle: { updateLedger: jest.fn(), deleteLedger: jest.fn() },
    plaidSync: {
      submitTransactionsToLedger: jest.fn(async () => ({
        submitted: 0,
        entries: [],
      })),
      deleteTransactions: jest.fn(),
    },
    plaidItem: { unlinkItem: jest.fn() },
    account: { deleteAccount: jest.fn() },
    apiKey: { mint: jest.fn() },
  };
  const calls = () =>
    Object.values(services).flatMap((group) =>
      Object.values(group).flatMap(
        (fn) => (fn as jest.Mock).mock.calls as unknown[],
      ),
    );
  let server: Awaited<ReturnType<typeof startV1TestServer>>;
  beforeAll(async () => {
    server = await startV1TestServer(
      { services } as unknown as AppLayers,
      { api: { scopeEnforcement: "enforce" } } as AppConfig,
      {},
    );
    server.setIdentity(sessionIdentity);
  });
  afterAll(async () => server.close());
  beforeEach(() => jest.clearAllMocks());

  const LEDGER = "/api-gateway/v1/ledgers/alice/main";
  const send = (method: string, path: string, body?: unknown) =>
    fetch(`${server.url}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const entries = [
    {
      type: "transaction",
      entry: {
        date: "2026-01-02",
        narration: "x",
        postings: [
          { account: "Assets:Cash", units: { number: "1", currency: "USD" } },
        ],
      },
    },
  ];

  // The note's repros, each built so that the commit would be the bug.
  it.each([
    ["POST", `${LEDGER}/entries?dryRun=true`, { entries }, "dryRun"],
    [
      "POST",
      `${LEDGER}/directives/text?dry_run=true`,
      { text: "x" },
      "dry_run",
    ],
    [
      "PUT",
      `${LEDGER}/files/main.bean?dry_run=true`,
      { content: "", sha: "stale" },
      "dry_run",
    ],
    [
      "DELETE",
      `${LEDGER}/files/main.bean?dry_run=true`,
      { sha: "stale" },
      "dry_run",
    ],
    ["PUT", `${LEDGER}?dry_run=true`, { description: "x" }, "dry_run"],
    ["DELETE", `${LEDGER}?dryRun=true`, {}, "dryRun"],
    ["DELETE", `${LEDGER}/collaborators/bob?dry_run=true`, {}, "dry_run"],
    [
      "POST",
      `${LEDGER}/bank-transactions/submit`,
      {
        transactions: [{ transactionId: "t1", targetAccount: "Expenses:Food" }],
        dryRun: true,
      },
      "dryRun",
    ],
    [
      "DELETE",
      `${LEDGER}/bank-transactions`,
      { transactionIds: ["t1"], dryRun: true },
      "dryRun",
    ],
    ["DELETE", `${LEDGER}/banks/item-1`, { dryRun: true }, "dryRun"],
    [
      "POST",
      `${LEDGER}/banks/item-1/sync?dry_run=true&mode=x`,
      undefined,
      "mode",
    ],
    ["DELETE", "/api-gateway/v1/account", { dryRun: true }, "dryRun"],
    [
      "POST",
      "/api-gateway/v1/api-keys",
      { name: "ci", scopes: ["ledger.read"], ledger_scope: "alice/main" },
      "ledger_scope",
    ],
    // w31/076: misspelled flags and nested keys on the four previously non-strict bodies.
    [
      "PUT",
      `${LEDGER}/files/main.bean`,
      { content: "; test\n", message: "test", dryRun: true, dryrun: false },
      "dryrun",
    ],
    [
      "PUT",
      `${LEDGER}/files/main.bean`,
      { content: "; test\n", allowinvalid: true },
      "allowinvalid",
    ],
    [
      "DELETE",
      `${LEDGER}/files/main.bean`,
      { message: "test", dryRun: true, dryrun: false },
      "dryrun",
    ],
    [
      "DELETE",
      `${LEDGER}/files/main.bean`,
      { message: "test", dryRun: true, remove_include: true },
      "remove_include",
    ],
    [
      "POST",
      `${LEDGER}/bank-transactions/submit?dry_run=true`,
      {
        transactions: [
          {
            transactionId: "ptxn_nonexistent",
            targetAccount: "Expenses:Food:Coffee",
            sourceAccout: "Assets:Cash",
          },
        ],
      },
      "sourceAccout",
    ],
    [
      "POST",
      `${LEDGER}/bank-transactions/submit?dry_run=true`,
      {
        transactions: [
          {
            transactionId: "ptxn_nonexistent",
            targetAccount: "Expenses:Food:Coffee",
            source_account: "Assets:Cash",
          },
        ],
      },
      "source_account",
    ],
    ["POST", `${LEDGER}/query`, { query: "BALANCES", bogusKey: 1 }, "bogusKey"],
  ])("%s %s is refused, naming the key", async (method, path, body, key) => {
    const response = await send(method, path, body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining(`"${key}"`),
      },
    });
    expect(calls()).toEqual([]);
  });

  it("still accepts valid documented fields and aliases on the four strict bodies (w31/076)", async () => {
    const putRes = await send("PUT", `${LEDGER}/files/new.bean`, {
      content: "; ok\n",
      description: "preview create",
      dry_run: true,
      allow_invalid: true,
    });
    expect(putRes.status).toBe(200);
    expect(services.ledgerRepo.changeFiles).toHaveBeenCalledTimes(1);

    const delRes = await send("DELETE", `${LEDGER}/files/old.bean`, {
      message: "preview delete",
      dryRun: true,
      allowInvalid: false,
      remove_includes: false,
    });
    expect(delRes.status).toBe(200);

    const submitRes = await send(
      "POST",
      `${LEDGER}/bank-transactions/submit?dry_run=true`,
      {
        transactions: [
          {
            transactionId: "ptxn_1",
            targetAccount: "Expenses:Food:Coffee",
            sourceAccount: "Assets:Cash",
          },
        ],
      },
    );
    expect(submitRes.status).toBe(200);
    expect(services.plaidSync.submitTransactionsToLedger).toHaveBeenCalledTimes(
      1,
    );

    const queryRes = await send("POST", `${LEDGER}/query`, {
      query: "BALANCES",
    });
    expect(queryRes.status).toBe(200);
    expect(services.ledgerShell.queryShell).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["accounts", `${LEDGER}/accounts?statu=closed`, "statu"],
    [
      "feature-flags",
      "/api-gateway/v1/feature-flags?bogus_param=1",
      "bogus_param",
    ],
    ["payees", `${LEDGER}/payees?bogus_param=1`, "bogus_param"],
    ["health", "/api-gateway/v1/health?bogus_param=1", "bogus_param"],
  ])("GET %s refuses an unknown key", async (_name, path, key) => {
    const response = await send("GET", path);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        message: expect.stringContaining(key),
      },
    });
  });
});
