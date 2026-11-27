import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { AccountRenameWorkflow } from "@/features/ledger/workflow/account-rename-workflow";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { formatError } from "@/server/graphql/format-error";
import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

/**
 * w1/m43/t004 — `renameAccount` on REST, GraphQL and MCP, through the real
 * adapters and the real rename workflow over a fake repository: the same
 * inputs, previews, refusals and results on every surface.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const MAIN =
  'include "2026.bean"\n2026-01-01 open Assets:Bank:Checking USD\n2026-01-01 open Expenses:Coffee USD\n';
const YEAR =
  '2026-02-01 * "Coffee at Assets:Bank:Checking"\n  Expenses:Coffee  3 USD\n  Assets:Bank:Checking\n';
/** A non-Latin leaf, which stock Beancount and the hosted engine both load (w31/013). */
const FOOD =
  '2026-01-01 open Expenses:Food:日本 USD\n2026-03-01 * "Ramen"\n  Expenses:Food:日本  12 USD\n  Expenses:Coffee\n';
/** Lines Beancount skips whole, one with an unmatched quote (w31/099). */
const SKIPPED = [
  "2026-08-30 open Assets:Qa:Wallet USD",
  "# Assets:Qa:Wallet is the petty cash box",
  '2026-08-30 * "payee" "top-up"',
  "  Expenses:Coffee    1.00 USD",
  "  Assets:Qa:Wallet   -1.00 USD",
  '# a 5" ruler',
  '2026-08-31 * "payee" "paid from Assets:Qa:Wallet"',
  "  Expenses:Coffee    1.00 USD",
  "  Assets:Qa:Wallet   -1.00 USD",
  "",
].join("\n");

let resolver: LedgerMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

/** An assertion that fails before the rename and after it, naming `account` (w31/114). */
const failingAssertion = (account: string) => ({
  message: `Balance failed for ${account}: expected 40.00 USD, got 49.75 USD`,
  source: { filename: "2026.bean", lineno: 4 },
});

/**
 * check_commodity's error for USD, which names the first account using it
 * (w31/127): `Assets:Bank:Checking` before a rename to `Assets:Bank:Wells`,
 * and `Assets:Bank:Savings` after it.
 */
const missingUsd = (account: string) => ({
  message: `Missing Commodity directive for 'USD' in '${account}'`,
});
const SAVINGS = "2026-01-01 open Assets:Bank:Savings USD\n";

async function fixture(
  options: {
    newErrors?: boolean;
    readOnly?: boolean;
    /** The ledger already fails an assertion on the account it renames. */
    failing?: boolean;
    /** The ledger declares no USD, and opens Assets:Bank:Savings in it. */
    undeclaredUsd?: boolean;
  } = {},
) {
  const files = new Map([
    ["main.bean", { content: MAIN, sha: "sha-main" }],
    ["2026.bean", { content: YEAR, sha: "sha-year" }],
    ["food.bean", { content: FOOD, sha: "sha-food" }],
    ["skipped.bean", { content: SKIPPED, sha: "sha-skipped" }],
    ...(options.undeclaredUsd
      ? [["savings.bean", { content: SAVINGS, sha: "sha-savings" }] as const]
      : []),
  ]);
  const commits: {
    path: string;
    content?: string | null;
    sha?: string | null;
  }[][] = [];
  const ledgerRepo = {
    projectedSourceFiles: async () => [...files.keys()],
    getFilesContent: async ({ paths }: { paths: string[] }) =>
      paths.map((path) => ({ path, ...files.get(path)! })),
    checkProjectedFiles: async ({ overlays }: { overlays: unknown[] }) => [
      ...(options.undeclaredUsd
        ? [
            missingUsd(
              overlays.length > 0
                ? "Assets:Bank:Savings"
                : "Assets:Bank:Checking",
            ),
          ]
        : []),
      ...(options.failing
        ? [
            failingAssertion(
              overlays.length > 0 ? "Assets:Bank:Main" : "Assets:Bank:Checking",
            ),
          ]
        : []),
      ...(overlays.length > 0 && options.newErrors
        ? [
            {
              message:
                "Invalid reference to unknown account 'Assets:Bank:Main'",
            },
          ]
        : []),
    ],
    changeGeneratedFiles: async ({
      operations,
    }: {
      operations: (typeof commits)[number];
    }) => {
      commits.push(operations);
      return { commit: `c${commits.length}` };
    },
  };
  const ledgerData = {
    getErrors: async () => [
      ...(options.undeclaredUsd ? [missingUsd("Assets:Bank:Checking")] : []),
      ...(options.failing ? [failingAssertion("Assets:Bank:Checking")] : []),
    ],
  };
  const authorization = {
    authorizeOrThrow: async () => {
      if (options.readOnly)
        throw new ForbiddenError(
          "Write access to ledger alice/main is required",
        );
    },
  };
  const workflow = new LedgerWorkflow(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization as never,
    undefined,
    new AccountRenameWorkflow(
      ledgerRepo as never,
      ledgerData as never,
      authorization as never,
      // No bank connections on this ledger.
      { list: async () => [], remap: async () => {} },
    ),
  );
  resolver = new LedgerMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow }, services: {} } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
      services: {},
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "rename-account-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const call = async (surface: string, args: Record<string, unknown>) => {
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/rename-account`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      const body = (await response.json()) as Record<string, unknown> & {
        error?: { code?: string; message?: string };
      };
      return {
        success: response.status === 200,
        result: body,
        code: body.error?.code,
        message: body.error?.message,
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source:
          'mutation($from:String!,$to:String!,$dryRun:Boolean,$allowInvalid:Boolean) { renameLedgerAccount(ledgerId:"alice/main",from:$from,to:$to,dryRun:$dryRun,allowInvalid:$allowInvalid) { message dryRun from to commit valid newErrors { message } accounts { from to } files { path changes { line before after } } bankMappings { plaidAccount from to updated } } }',
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      return {
        success: !result.errors,
        result: result.data?.renameLedgerAccount as
          | Record<string, unknown>
          | undefined,
        code: error
          ? formatError(error.toJSON(), error).extensions?.code
          : undefined,
        message: error?.message,
      };
    }
    const { dryRun, allowInvalid, ...others } = args;
    const result = await client.callTool({
      name: "renameAccount",
      arguments: {
        ...others,
        ...(dryRun === undefined ? {} : { dry_run: dryRun }),
        ...(allowInvalid === undefined ? {} : { allow_invalid: allowInvalid }),
      },
    });
    const structured = result.structuredContent as {
      result?: Record<string, unknown>;
      error?: { code?: string; message?: string };
    };
    return {
      success: !result.isError,
      result: structured?.result,
      code: structured?.error?.code,
      message: structured?.error?.message,
    };
  };
  return {
    files,
    commits,
    call,
    close: async () => {
      await client.close();
      await rest.close();
    },
  };
}

const SURFACES = ["rest", "gql", "mcp"] as const;
const RENAME = { from: "Assets:Bank:Checking", to: "Assets:Bank:Main" };

describe.each(SURFACES)("renameAccount on %s (w1/m43)", (surface) => {
  it("renames every loaded file in one commit and names the lines it changed", async () => {
    const env = await fixture();
    try {
      const { success, result } = await env.call(surface, RENAME);
      expect(success).toBe(true);
      expect(env.commits).toHaveLength(1);
      expect(env.commits[0].map((op) => [op.path, op.sha])).toEqual([
        ["main.bean", "sha-main"],
        ["2026.bean", "sha-year"],
      ]);
      expect(env.commits[0][1].content).toContain(
        '"Coffee at Assets:Bank:Checking"',
      );
      expect(result).toMatchObject({
        from: "Assets:Bank:Checking",
        to: "Assets:Bank:Main",
        commit: "c1",
        accounts: [{ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" }],
        bankMappings: [],
      });
      expect(
        (result!.files as { path: string; changes: { line: number }[] }[]).map(
          (f) => [f.path, f.changes.map((c) => c.line)],
        ),
      ).toEqual([
        ["main.bean", [2]],
        ["2026.bean", [3]],
      ]);
    } finally {
      await env.close();
    }
  });

  it("previews a breaking rename as invalid without allowInvalid, committing nothing", async () => {
    const env = await fixture({ newErrors: true });
    try {
      const { success, result } = await env.call(surface, {
        ...RENAME,
        dryRun: true,
      });
      expect(success).toBe(true);
      // MCP nests the verdict under validation; REST and GraphQL flatten it.
      const verdict =
        (result as { valid?: boolean; validation?: { valid: boolean } }) ?? {};
      expect(verdict.valid ?? verdict.validation?.valid).toBe(false);
      expect(env.commits).toHaveLength(0);
    } finally {
      await env.close();
    }
  });

  it("still refuses the commit of a breaking rename unless allowInvalid, committing nothing", async () => {
    const env = await fixture({ newErrors: true });
    try {
      const refused = await env.call(surface, RENAME);
      expect(refused).toMatchObject({
        success: false,
        code: "VALIDATION_FAILED",
      });
      expect(env.commits).toHaveLength(0);
      const forced = await env.call(surface, { ...RENAME, allowInvalid: true });
      expect(forced.success).toBe(true);
      expect(env.commits).toHaveLength(1);
    } finally {
      await env.close();
    }
  });

  it("previews and commits a rename whose account already fails an assertion, with no allowInvalid (w31/114)", async () => {
    const env = await fixture({ failing: true });
    try {
      const preview = await env.call(surface, { ...RENAME, dryRun: true });
      expect(preview.success).toBe(true);
      // MCP nests the verdict under validation; REST and GraphQL flatten it.
      const verdict = preview.result as {
        valid?: boolean;
        newErrors?: unknown[];
        validation?: { valid: boolean; newErrors: unknown[] };
      };
      expect(verdict.valid ?? verdict.validation?.valid).toBe(true);
      expect(verdict.newErrors ?? verdict.validation?.newErrors).toEqual([]);
      expect(env.commits).toHaveLength(0);
      const renamed = await env.call(surface, RENAME);
      expect(renamed.success).toBe(true);
      expect(renamed.result).toMatchObject({ commit: "c1" });
      if (surface === "mcp") {
        expect(renamed.result?.summary).toMatch(/No new bean-check errors\.$/);
      }
      expect(env.commits).toHaveLength(1);
    } finally {
      await env.close();
    }
  });

  it("previews and commits a rename that makes another account the first to use an undeclared currency (w31/127)", async () => {
    const env = await fixture({ undeclaredUsd: true });
    const rename = { from: "Assets:Bank:Checking", to: "Assets:Bank:Wells" };
    try {
      const preview = await env.call(surface, { ...rename, dryRun: true });
      expect(preview.success).toBe(true);
      const verdict = preview.result as {
        valid?: boolean;
        newErrors?: unknown[];
        validation?: { valid: boolean; newErrors: unknown[] };
      };
      expect(verdict.valid ?? verdict.validation?.valid).toBe(true);
      expect(verdict.newErrors ?? verdict.validation?.newErrors).toEqual([]);
      expect(env.commits).toHaveLength(0);
      const renamed = await env.call(surface, rename);
      expect(renamed.success).toBe(true);
      expect(env.commits).toHaveLength(1);
    } finally {
      await env.close();
    }
  });

  it("still refuses an error the rename adds beside one the account already had (w31/114)", async () => {
    const env = await fixture({ failing: true, newErrors: true });
    try {
      const refused = await env.call(surface, RENAME);
      expect(refused).toMatchObject({
        success: false,
        code: "VALIDATION_FAILED",
      });
      expect(refused.message).toContain("1 new bean-check error");
      expect(refused.message).toContain("unknown account 'Assets:Bank:Main'");
      expect(refused.message).not.toContain("Balance failed");
      expect(env.commits).toHaveLength(0);
    } finally {
      await env.close();
    }
  });

  it("previews and commits a non-Latin leaf renamed in and out (w31/013)", async () => {
    const env = await fixture();
    try {
      const preview = await env.call(surface, {
        from: "Expenses:Food:日本",
        to: "Expenses:Food:食品",
        dryRun: true,
      });
      expect(preview.success).toBe(true);
      const verdict = preview.result as {
        valid?: boolean;
        validation?: { valid: boolean };
      };
      expect(verdict.valid ?? verdict.validation?.valid).toBe(true);
      expect(preview.result).toMatchObject({
        accounts: [{ from: "Expenses:Food:日本", to: "Expenses:Food:食品" }],
        files: [
          {
            path: "food.bean",
            changes: [
              { line: 1, after: "2026-01-01 open Expenses:Food:食品 USD" },
              { line: 3, after: "  Expenses:Food:食品  12 USD" },
            ],
          },
        ],
      });
      expect(env.commits).toHaveLength(0);
      const renamed = await env.call(surface, {
        from: "Expenses:Food:日本",
        to: "Expenses:Food:Japan",
      });
      expect(renamed.success).toBe(true);
      expect(env.commits).toEqual([
        [
          {
            operation: "update",
            path: "food.bean",
            content: FOOD.replaceAll(
              "Expenses:Food:日本",
              "Expenses:Food:Japan",
            ),
            sha: "sha-food",
          },
        ],
      ]);
    } finally {
      await env.close();
    }
  });

  it("leaves lines Beancount skips and the narrations after them alone, renaming every posting (w31/099)", async () => {
    const env = await fixture();
    try {
      const wallet = { from: "Assets:Qa:Wallet", to: "Assets:Qa:Purse" };
      const preview = await env.call(surface, { ...wallet, dryRun: true });
      expect(preview.success).toBe(true);
      const verdict = preview.result as {
        valid?: boolean;
        validation?: { valid: boolean };
      };
      expect(verdict.valid ?? verdict.validation?.valid).toBe(true);
      expect(preview.result).toMatchObject({
        files: [
          {
            path: "skipped.bean",
            changes: [
              { line: 1, after: "2026-08-30 open Assets:Qa:Purse USD" },
              { line: 5, after: "  Assets:Qa:Purse   -1.00 USD" },
              { line: 9, after: "  Assets:Qa:Purse   -1.00 USD" },
            ],
          },
        ],
      });
      expect(env.commits).toHaveLength(0);
      const renamed = await env.call(surface, wallet);
      expect(renamed.success).toBe(true);
      const lines = SKIPPED.split("\n");
      for (const index of [0, 4, 8]) {
        lines[index] = lines[index].replace("Wallet", "Purse");
      }
      expect(env.commits).toEqual([
        [
          {
            operation: "update",
            path: "skipped.bean",
            content: lines.join("\n"),
            sha: "sha-skipped",
          },
        ],
      ]);
    } finally {
      await env.close();
    }
  });

  it.each([
    ["a lowercase ASCII start", "Expenses:Food:coffee"],
    ["a non-Latin first component", "Expenses:日本"],
    ["a lowercase non-ASCII start", "Expenses:Food:épargne"],
    ["a currency symbol start", "Expenses:Food:€"],
    ["an emoji start", "Expenses:Food:😀"],
    ["an em-dash start", "Expenses:Food:—"],
    ["a zero-width space", "Expenses:Food:Foo\u200bBar"],
  ])(
    "refuses a to with %s by BAD_USER_INPUT, stating the rule (w31/013, w31/081)",
    async (_case, to) => {
      const env = await fixture();
      try {
        const refused = await env.call(surface, {
          from: "Expenses:Food:日本",
          to,
          dryRun: true,
        });
        expect(refused).toMatchObject({
          success: false,
          code: "BAD_USER_INPUT",
        });
        expect(refused.message).toContain(
          `to "${to}" is not an account name Beancount loads.`,
        );
        expect(refused.message).toContain(
          "the first component starts with a capital letter or a digit",
        );
        expect(env.commits).toHaveLength(0);
      } finally {
        await env.close();
      }
    },
  );

  it.each([
    "Expenses:Food:Épargne",
    "Expenses:Food:Café",
    "Expenses:Food:خانه‌ها",
  ])("accepts valid Unicode target %s on preview (w31/081)", async (to) => {
    const env = await fixture();
    try {
      const preview = await env.call(surface, {
        from: "Expenses:Food:日本",
        to,
        dryRun: true,
      });
      expect(preview.success).toBe(true);
      const verdict = preview.result as {
        valid?: boolean;
        validation?: { valid: boolean };
      };
      expect(verdict.valid ?? verdict.validation?.valid).toBe(true);
      expect(env.commits).toHaveLength(0);
    } finally {
      await env.close();
    }
  });

  it("refuses a rename to another root and a read-only credential by the same codes", async () => {
    const env = await fixture();
    try {
      await expect(
        env.call(surface, {
          from: "Assets:Bank:Checking",
          to: "Liabilities:Bank",
        }),
      ).resolves.toMatchObject({
        success: false,
        code: "BAD_USER_INPUT",
      });
      const readOnly = await fixture({ readOnly: true });
      try {
        await expect(readOnly.call(surface, RENAME)).resolves.toMatchObject({
          success: false,
          code: "FORBIDDEN",
        });
        expect(readOnly.commits).toHaveLength(0);
      } finally {
        await readOnly.close();
      }
      expect(env.commits).toHaveLength(0);
    } finally {
      await env.close();
    }
  });
});
