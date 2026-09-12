import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerShellQueryResolver } from "@/features/ledger/api/resolvers/ledger-shell-resolver.query";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const query = "SELECT account, sum(position) GROUP BY account";

async function fixture(result: unknown) {
  const authorizeOrThrow = jest.fn().mockResolvedValue(undefined);
  const queryShell = jest
    .fn()
    .mockResolvedValue({ data: { success: true, data: { result } } });
  const service = new LedgerShellService(
    {
      getPublicApiClient: async () => ({ shell: { queryShell } }),
    } as unknown as IFavaClientFactory,
    { authorizeOrThrow } as unknown as IAuthorizationService,
  );
  const resolver = new LedgerShellQueryResolver(service);
  const schema = await buildSchema({
    resolvers: [LedgerShellQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const services = { ledgerShell: service };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { services, identity: pinnedReadToken } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bql-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    authorizeOrThrow,
    queryShell,
    rest: () =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query }),
      }),
    gql: (selection: string) =>
      graphql({
        schema,
        source: `query($query: String!) { queryShell(ledgerId: "alice/main", query: $query) { resultType ${selection} } }`,
        variableValues: { query },
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("structured BQL across actual adapters", () => {
  it.each([
    {
      result: {
        types: [
          { name: "amount", dtype: "number" },
          { name: "position", dtype: "inventory" },
        ],
        rows: [
          [42.5, { USD: "9007199254740993.12" }],
          [false, "café"],
        ],
        t: "table",
      },
      selection: "table { types { name dtype } rows t }",
      expected: {
        resultType: "table",
        table: {
          types: [
            { name: "amount", dtype: "number" },
            { name: "position", dtype: "inventory" },
          ],
          rows: [
            [42.5, { USD: "9007199254740993.12" }],
            [false, "café"],
          ],
          t: "table",
        },
      },
    },
    {
      result: { contents: "No matching entries\n", t: "text" },
      selection: "text { contents t }",
      expected: {
        resultType: "text",
        text: { contents: "No matching entries\n", t: "text" },
      },
    },
  ])(
    "preserves $expected.resultType results through REST, GraphQL, and MCP",
    async ({ result, selection, expected }) => {
      const f = await fixture(result);
      try {
        const rest = await f.rest();
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expected);
        const gql = await f.gql(selection);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.queryShell).toEqual(expected);
        const mcp = await f.client.callTool({
          name: "runBqlQueryStructured",
          arguments: { query },
        });
        expect(mcp.isError).not.toBe(true);
        // MCP alone adds the row count and the truncation flag (w2/m28:t001):
        // an agent needs to know whether it has seen the whole result, and
        // REST/GraphQL clients page for themselves.
        expect(mcp.structuredContent).toEqual({
          ok: true,
          result: {
            ...expected,
            rowCount: expected.table?.rows.length ?? 0,
            truncated: false,
          },
        });
        expect(f.queryShell).toHaveBeenCalledTimes(3);
        for (const call of f.queryShell.mock.calls)
          expect(call).toEqual(["alice", "main", { query }]);
        expect(f.authorizeOrThrow).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );

  it("refuses revoked access on every surface before querying", async () => {
    const f = await fixture({ contents: "must not read" });
    f.authorizeOrThrow.mockRejectedValue(new ForbiddenError("Access revoked"));
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql("text { contents }")).errors).toHaveLength(1);
      expect(
        (
          await f.client.callTool({
            name: "runBqlQueryStructured",
            arguments: { query },
          })
        ).isError,
      ).toBe(true);
      expect(f.queryShell).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
