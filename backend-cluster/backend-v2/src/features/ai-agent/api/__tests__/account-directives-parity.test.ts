import "reflect-metadata";

import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { AppConfig } from "@/config/config";
import { DirectiveType } from "@/foundation/fava";
import type { AppLayers } from "@/foundation/composition";
import { LedgerAccountQueryResolver } from "@/features/ledger/api/resolvers/ledger-account-resolver.query";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import {
  pinnedReadToken,
  startV1TestServer,
} from "@/server/rest/__tests__/v1-test-server";
import type { McpRequestContext } from "../mcp-context";
import { RESOURCE_SCHEME } from "../mcp-resources";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";

it("returns the same directive reference counts on REST, GraphQL and MCP", async () => {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const names = ["Assets:Asserted", "Assets:Unused"];
  const referenceCounts = jest
    .fn()
    .mockResolvedValue(envelope({ "Assets:Asserted": 1 }));
  const upstream = {
    journal: {
      getJournal: async (
        _owner: string,
        _repo: string,
        query: { directive_types: DirectiveType[] },
      ) => {
        const items = query.directive_types.includes(DirectiveType.Open)
          ? names.map((account) => ({
              account,
              date: "2026-01-01",
              entry_hash: account,
            }))
          : [];
        return envelope({ items, total: items.length });
      },
    },
    reports: {
      getLedgerAccountReferenceCounts: referenceCounts,
      getLedgerAccountLastEntries: async () => envelope([]),
    },
    shell: { queryShellPost: async () => envelope({ result: { rows: [] } }) },
  };
  const factory = { getPublicApiClient: async () => upstream };
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const ledgerAccount = new LedgerAccountService(
    factory as never,
    authorization,
  );
  const services = { ledgerAccount };
  const schema = await buildSchema({
    resolvers: [LedgerAccountQueryResolver],
    container: { get: () => new LedgerAccountQueryResolver(ledgerAccount) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
  });
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
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({
    name: "account-directives-parity",
    version: "1",
  });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    const viaRest = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/${LEDGER}/account-directives`,
    );
    expect(viaRest.status).toBe(200);
    const payload = (await viaRest.json()) as Array<{
      account: string;
      entryCount: number;
      referenceCount: number;
    }>;
    const expected = [
      { account: names[0], entryCount: 0, referenceCount: 1 },
      { account: names[1], entryCount: 0, referenceCount: 0 },
    ];
    expect(
      payload.map(({ account, entryCount, referenceCount }) => ({
        account,
        entryCount,
        referenceCount,
      })),
    ).toEqual(expected);
    const {
      contents: [content],
    } = await client.readResource({
      uri: `${RESOURCE_SCHEME}://${LEDGER}/account-directives`,
    });
    if (!("text" in content)) throw new Error("Expected a JSON resource");
    expect(JSON.parse(content.text)).toEqual(payload);
    const viaGraphql = await graphql({
      schema,
      source: `{ getLedgerAccountDirectives(ledgerId: "${LEDGER}") { account entryCount referenceCount } }`,
      contextValue: { identity: pinnedReadToken },
    });
    expect(viaGraphql.errors).toBeUndefined();
    expect(viaGraphql.data?.getLedgerAccountDirectives).toEqual(expected);
    expect(referenceCounts.mock.calls).toEqual(
      Array.from({ length: 3 }, () => ["alice", "main"]),
    );
  } finally {
    await client.close();
    await server.close();
    await rest.close();
  }
});
