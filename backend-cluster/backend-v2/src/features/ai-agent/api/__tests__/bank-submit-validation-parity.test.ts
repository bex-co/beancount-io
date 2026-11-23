import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { PlaidMutationResolver } from "@/features/plaid/api/resolvers/plaid-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w31/052. `submitTransactionsToLedger` accepted blank/malformed targetAccount,
 * sourceAccount, and blank/traversal filename across MCP, REST, and GraphQL,
 * proceeding through authorization, Fava lookup, and Postgres queries before
 * failing or emitting invalid Beancount postings. All three surfaces now refuse
 * invalid submission inputs upfront with BAD_USER_INPUT naming the field, while
 * valid inputs preserve FORBIDDEN-before-DB-lookup for read-only credentials
 * (w23/024) and normal submission behavior.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

const writeIdentity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};

const readOnlyIdentity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_ro",
};

const STORED_ITEM = {
  id: "pitm_main",
  userId: "usr_alice",
  ledgerRepoId: 1,
};

const STORED_ACCOUNT = {
  id: "pacc_main",
  plaidItemId: "pitm_main",
  ledgerAccount: "Assets:Bank:Checking",
  currency: "USD",
};

const STORED_TX = {
  id: "ptxn_row_1",
  plaidAccountId: "pacc_main",
  transactionId: "ptxn_1",
  syncedToLedger: false,
  date: new Date("2026-11-20T00:00:00Z"),
  amount: "12.50",
  name: "Coffee Shop",
  merchantName: "Coffee Shop",
};

let currentMutation: PlaidMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;

beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [PlaidMutationResolver, HealthResolver],
    container: {
      get: (ctor) =>
        ctor === PlaidMutationResolver ? currentMutation : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

interface SubmitTxArg {
  transactionId: string;
  targetAccount: string;
  sourceAccount?: string | null;
}

async function fixture(identity: Identity) {
  const getLedger = jest.fn(async () => ({
    data: { success: true, data: { id: 1 } },
  }));
  const getLedgerFile = jest.fn(async () => ({
    data: { success: true, data: { path: "bank/2026.bean", content: "" } },
  }));
  const queryShellPost = jest.fn(async () => ({
    data: { success: true, data: { types: [], rows: [] } },
  }));
  const addBulkEntries = jest.fn(async () => ({
    data: {
      success: true,
      data: { entry_hashes: ["hash_1"], included_files: [] },
    },
  }));
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger },
      admin: {
        getLedgerByRepoId: async () => ({
          data: { success: true, data: { full_name: "alice/main" } },
        }),
      },
    }),
    getPublicApiClient: jest.fn(async () => ({
      ledgers: { getLedgerFile },
      shell: { queryShellPost },
      entries: { addBulkEntries },
    })),
  };
  const gitea = {
    getUserApiClient: async () => ({
      repos: {
        repoGet: async () => ({
          data: {
            id: 1,
            permissions: { admin: true, push: true, pull: true },
          },
        }),
      },
    }),
  };
  const getByTransactionIds = jest.fn(async (_db: unknown, ids: string[]) =>
    ids.includes(STORED_TX.transactionId) ? [STORED_TX] : [],
  );
  const getAccountById = jest.fn(async (_db: unknown, id: string) =>
    id === STORED_ACCOUNT.id ? STORED_ACCOUNT : null,
  );
  const getItemById = jest.fn(async (_db: unknown, id: string) =>
    id === STORED_ITEM.id ? STORED_ITEM : null,
  );
  const markAsSyncedForAccounts = jest.fn(async () => 1);
  const models = {
    plaidItem: { getById: getItemById },
    plaidAccount: { getById: getAccountById },
    plaidTransaction: {
      getByTransactionIds,
      markAsSyncedForAccounts,
    },
    plaidSyncLog: {},
    user: {},
  };
  const db = {
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(db),
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      db as never,
      models as never,
      gitea as never,
      fava as never,
    ),
    jest.fn(),
  );
  const authorizeOrThrow = jest.spyOn(authorization, "authorizeOrThrow");
  const getErrors = jest.fn(async () => []);
  const plaidSync = new PlaidSyncService(
    {} as never,
    fava as never,
    models as never,
    db as never,
    authorization,
  );
  const services = {
    plaidSync,
    ledgerData: { getErrors },
  };
  currentMutation = new PlaidMutationResolver({} as never, plaidSync);
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({
    name: "bank-submit-validation-parity",
    version: "1",
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  return {
    authorizeOrThrow,
    getLedger,
    getLedgerFile,
    addBulkEntries,
    getByTransactionIds,
    getErrors,
    submit: async ({
      transactions,
      filename,
      dryRun = true,
      mcpSnakeCase = false,
    }: {
      transactions: SubmitTxArg[];
      filename?: string | null;
      dryRun?: boolean;
      mcpSnakeCase?: boolean;
    }) => {
      const restTransactions = transactions.map((tx) => ({
        transactionId: tx.transactionId,
        targetAccount: tx.targetAccount,
        ...(tx.sourceAccount !== undefined && tx.sourceAccount !== null
          ? { sourceAccount: tx.sourceAccount }
          : {}),
      }));
      const restResponse = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/bank-transactions/submit?dry_run=${dryRun}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            transactions: restTransactions,
            ...(filename !== undefined && filename !== null
              ? { filename }
              : {}),
          }),
        },
      );
      const restBody =
        restResponse.status === 200
          ? undefined
          : ((await restResponse.json()) as {
              error: {
                code: string;
                message?: string;
                metadata?: { field?: string; hint?: string };
              };
            });
      const restCode =
        restResponse.status === 200 ? "ok" : restBody!.error.code;

      const mcpTransactions = transactions.map((tx) =>
        mcpSnakeCase
          ? {
              transaction_id: tx.transactionId,
              target_account: tx.targetAccount,
              ...(tx.sourceAccount !== undefined && tx.sourceAccount !== null
                ? { source_account: tx.sourceAccount }
                : {}),
            }
          : {
              transactionId: tx.transactionId,
              targetAccount: tx.targetAccount,
              ...(tx.sourceAccount !== undefined && tx.sourceAccount !== null
                ? { sourceAccount: tx.sourceAccount }
                : {}),
            },
      );
      const tool = await client.callTool({
        name: "importStagedBankTransactions",
        arguments: {
          ledger: "alice/main",
          transactions: mcpTransactions,
          ...(filename !== undefined && filename !== null ? { filename } : {}),
          dry_run: dryRun,
        },
      });
      const mcpError = tool.isError
        ? (
            tool.structuredContent as {
              error: { code: string; message?: string; hint?: string };
            }
          ).error
        : undefined;
      const mcpCode = mcpError ? mcpError.code : "ok";

      const gql = await graphql({
        schema,
        source: `mutation($transactions: [PlaidTransactionSubmitInput!]!, $filename: String, $dryRun: Boolean) {
          submitPlaidTransactionsToLedger(
            ledgerId: "alice/main"
            transactions: $transactions
            filename: $filename
            dryRun: $dryRun
          ) {
            success
            dryRun
            wouldAddCount
          }
        }`,
        variableValues: {
          transactions,
          ...(filename !== undefined ? { filename } : {}),
          dryRun,
        },
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const gqlError = gql.errors?.[0];
      const gqlFormatted = gqlError
        ? formatError(gqlError.toJSON(), gqlError)
        : undefined;
      const gqlCode = gqlFormatted ? gqlFormatted.extensions?.code : "ok";

      return {
        rest: restCode,
        mcp: mcpCode,
        gql: gqlCode,
        restStatus: restResponse.status,
        restError: restBody?.error,
        mcpError,
        gqlExtensions: gqlFormatted?.extensions,
        gqlMessage: gqlFormatted?.message,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("bank transaction submit validation across REST, MCP, and GraphQL (w31/052)", () => {
  it.each([
    "",
    "   ",
    "not-an-account",
    "Expenses:Bad Account",
    "expenses:food",
    "Expenses",
  ])(
    "refuses invalid targetAccount %j as BAD_USER_INPUT before auth, Fava, or Postgres",
    async (targetAccount) => {
      const f = await fixture(writeIdentity);
      try {
        for (const dryRun of [true, false]) {
          const res = await f.submit({
            transactions: [
              { transactionId: "ptxn_nonexistent", targetAccount },
            ],
            dryRun,
            mcpSnakeCase: !dryRun,
          });
          expect(res).toMatchObject({
            rest: "BAD_USER_INPUT",
            mcp: "BAD_USER_INPUT",
            gql: "BAD_USER_INPUT",
            restStatus: 400,
            restError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("targetAccount"),
              metadata: expect.objectContaining({ field: "targetAccount" }),
            }),
            mcpError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("targetAccount"),
            }),
            gqlExtensions: expect.objectContaining({
              code: "BAD_USER_INPUT",
              field: "targetAccount",
            }),
          });
        }
        expect(f.authorizeOrThrow).not.toHaveBeenCalled();
        expect(f.getLedger).not.toHaveBeenCalled();
        expect(f.getByTransactionIds).not.toHaveBeenCalled();
        expect(f.getLedgerFile).not.toHaveBeenCalled();
        expect(f.addBulkEntries).not.toHaveBeenCalled();
        expect(f.getErrors).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["", "   ", "bad account", "assets:checking", "Assets"])(
    "refuses invalid sourceAccount %j as BAD_USER_INPUT before auth, Fava, or Postgres",
    async (sourceAccount) => {
      const f = await fixture(writeIdentity);
      try {
        for (const dryRun of [true, false]) {
          const res = await f.submit({
            transactions: [
              {
                transactionId: "ptxn_nonexistent",
                targetAccount: "Expenses:Food:Groceries",
                sourceAccount,
              },
            ],
            dryRun,
            mcpSnakeCase: !dryRun,
          });
          expect(res).toMatchObject({
            rest: "BAD_USER_INPUT",
            mcp: "BAD_USER_INPUT",
            gql: "BAD_USER_INPUT",
            restStatus: 400,
            restError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("sourceAccount"),
              metadata: expect.objectContaining({ field: "sourceAccount" }),
            }),
            mcpError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("sourceAccount"),
            }),
            gqlExtensions: expect.objectContaining({
              code: "BAD_USER_INPUT",
              field: "sourceAccount",
            }),
          });
        }
        expect(f.authorizeOrThrow).not.toHaveBeenCalled();
        expect(f.getLedger).not.toHaveBeenCalled();
        expect(f.getByTransactionIds).not.toHaveBeenCalled();
        expect(f.getLedgerFile).not.toHaveBeenCalled();
        expect(f.addBulkEntries).not.toHaveBeenCalled();
        expect(f.getErrors).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["", "   ", "../etc/passwd", ".git/config", "/etc/passwd"])(
    "refuses invalid filename %j as BAD_USER_INPUT before auth, Fava, or Postgres",
    async (filename) => {
      const f = await fixture(writeIdentity);
      try {
        for (const dryRun of [true, false]) {
          const res = await f.submit({
            transactions: [
              {
                transactionId: "ptxn_nonexistent",
                targetAccount: "Expenses:Food:Groceries",
              },
            ],
            filename,
            dryRun,
          });
          expect(res).toMatchObject({
            rest: "BAD_USER_INPUT",
            mcp: "BAD_USER_INPUT",
            gql: "BAD_USER_INPUT",
            restStatus: 400,
            restError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              metadata: expect.objectContaining({ field: "filename" }),
            }),
            mcpError: expect.objectContaining({
              code: "BAD_USER_INPUT",
              hint: expect.stringContaining("filename"),
            }),
            gqlExtensions: expect.objectContaining({
              code: "BAD_USER_INPUT",
              field: "filename",
            }),
          });
        }
        expect(f.authorizeOrThrow).not.toHaveBeenCalled();
        expect(f.getLedger).not.toHaveBeenCalled();
        expect(f.getByTransactionIds).not.toHaveBeenCalled();
        expect(f.getLedgerFile).not.toHaveBeenCalled();
        expect(f.addBulkEntries).not.toHaveBeenCalled();
        expect(f.getErrors).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("accepts valid accounts (including non-Latin leaves) and valid filename on every surface", async () => {
    const f = await fixture(writeIdentity);
    try {
      expect(
        await f.submit({
          transactions: [
            {
              transactionId: "ptxn_1",
              targetAccount: "Expenses:Food:日本",
              sourceAccount: "Assets:Bank:Checking",
            },
          ],
          filename: "bank/2026.bean",
          dryRun: true,
        }),
      ).toMatchObject({ rest: "ok", mcp: "ok", gql: "ok" });
      expect(f.getByTransactionIds).toHaveBeenCalledTimes(3);
      expect(f.getLedgerFile).toHaveBeenCalledTimes(3);
    } finally {
      await f.close();
    }
  });

  it("treats omitted sourceAccount/filename and GraphQL null as defaults on every surface", async () => {
    const f = await fixture(writeIdentity);
    try {
      expect(
        await f.submit({
          transactions: [
            {
              transactionId: "ptxn_1",
              targetAccount: "Expenses:Food:Groceries",
              sourceAccount: null,
            },
          ],
          filename: null,
          dryRun: true,
        }),
      ).toMatchObject({ rest: "ok", mcp: "ok", gql: "ok" });
      expect(f.getByTransactionIds).toHaveBeenCalledTimes(3);
      expect(f.getLedgerFile).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("still refuses valid inputs with a read-only token as FORBIDDEN before DB lookup (w23/024)", async () => {
    const f = await fixture(readOnlyIdentity);
    try {
      const res = await f.submit({
        transactions: [
          {
            transactionId: "ptxn_nonexistent",
            targetAccount: "Expenses:Food:Groceries",
          },
        ],
        dryRun: true,
      });
      expect(res).toMatchObject({
        rest: "FORBIDDEN",
        mcp: "FORBIDDEN",
        gql: "FORBIDDEN",
        restStatus: 403,
      });
      expect(f.authorizeOrThrow).toHaveBeenCalledTimes(3);
      expect(f.getByTransactionIds).not.toHaveBeenCalled();
      expect(f.getLedgerFile).not.toHaveBeenCalled();
      expect(f.getErrors).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
