import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidQueryResolver } from "@/features/plaid/api/resolvers/plaid-resolver.query";
import {
  AuthorizationService,
  LEDGER_RELATIONSHIPS,
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
 * w1/223. The ledger-wide bank account and staged-transaction reads name no
 * connection, yet a reader of a public ledger was told "Bank connection not
 * found", as if no bank were linked. They now refuse as the connection list
 * does: a reader is FORBIDDEN naming admin access, and a ledger the caller
 * cannot see is "Ledger not found".
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const PUBLIC = "open_ledger/example";
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};

let resolver: PlaidQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [PlaidQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture() {
  // Everyone reads the public ledger; nobody administers it or sees any other.
  const authorization = new AuthorizationService(
    {
      check: async ({ relation, object }) =>
        relation === LEDGER_RELATIONSHIPS.READ_CONTENTS &&
        object === `ledger:${PUBLIC}`,
    },
    jest.fn(),
  );
  const models = {
    plaidAccount: {
      getEnabledByLedgerRepoIdAndUserId: jest.fn(async () => []),
    },
  };
  const service = new PlaidItemService(
    {} as never,
    {} as never,
    models as never,
    {} as never,
    authorization,
  );
  resolver = new PlaidQueryResolver(service);
  const rest = await startV1TestServer(
    { services: { plaidItem: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { plaidItem: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bank-ledger-wide", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const gql = async (source: string) => {
    const result = await graphql({
      schema,
      source,
      contextValue: { identity, getCurrentIdentity: () => identity },
    });
    const error = result.errors?.[0];
    if (!error) throw new Error("Expected a GraphQL error");
    const formatted = formatError(error.toJSON(), error);
    return { code: formatted.extensions?.code, message: formatted.message };
  };
  const restRead = async (path: string) => {
    const response = await fetch(`${rest.url}/api-gateway/v1/ledgers/${path}`);
    const { error } = (await response.json()) as {
      error: { code: string; message: string };
    };
    return { code: error.code, message: error.message };
  };
  const mcpError = (data: unknown) => {
    const { code, message } = data as { code: string; message: string };
    return { code, message };
  };

  return {
    accounts: async (ledger: string) => ({
      rest: await restRead(`${ledger}/bank-accounts`),
      mcp: await client
        .readResource({ uri: `beancount://${ledger}/bank-accounts` })
        .then(
          () => ({ code: "ok", message: "" }),
          (error: { data?: unknown; message: string }) => ({
            code: (error.data as { code: string }).code,
            message: error.message,
          }),
        ),
      gql: await gql(
        `query { getPlaidAccountsForLedger(ledgerId: ${JSON.stringify(ledger)}) { id } }`,
      ),
    }),
    transactions: async (ledger: string) => {
      const tool = await client.callTool({
        name: "listStagedBankTransactions",
        arguments: { ledger },
      });
      return {
        rest: await restRead(`${ledger}/bank-transactions/unsynced`),
        mcp: mcpError((tool.structuredContent as { error: unknown }).error),
        gql: await gql(
          `query { getUnsyncedPlaidTransactions(ledgerId: ${JSON.stringify(ledger)}) { id } }`,
        ),
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["accounts", "transactions"] as const)(
  "the ledger-wide bank %s read",
  (read) => {
    it("tells a reader of the ledger that it needs admin access", async () => {
      const f = await fixture();
      try {
        const outcome = await f[read](PUBLIC);
        for (const surface of ["rest", "mcp", "gql"] as const) {
          expect(outcome[surface].code).toBe("FORBIDDEN");
          expect(outcome[surface].message).toContain(
            `${PUBLIC} requires admin access to it`,
          );
        }
      } finally {
        await f.close();
      }
    });

    it("conceals a ledger the caller cannot see as Ledger not found", async () => {
      const f = await fixture();
      try {
        const outcome = await f[read]("alice/missing");
        for (const surface of ["rest", "mcp", "gql"] as const) {
          expect(outcome[surface].code).toBe("NOT_FOUND");
          expect(outcome[surface].message).toContain("Ledger not found");
          expect(outcome[surface].message).not.toContain("Bank connection");
        }
      } finally {
        await f.close();
      }
    });
  },
);
