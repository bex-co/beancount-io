import type { Identity } from "@/server/api/identity";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  readOnlyToken,
  sessionIdentity,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostname: "example.com", externalHttpPort: 443, sshPort: 22 },
} as AppConfig;
// The repo grants everything; the credential decides what the caller sees.
const ledger = {
  full_name: "alice/main",
  name: "main",
  empty: false,
  private: true,
  created_at: "2026-01-01",
  updated_at: "2026-09-01",
  size: 42,
  description: "café books",
  permissions: { admin: true, pull: true, push: true },
};
const envelope = (data: unknown) => ({ data: { success: true, data } });

let currentResolver: LedgerQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(identity: Identity) {
  const authorizeOrThrow = jest.fn().mockResolvedValue(undefined);
  const ledgers = {
    listLedgers: jest.fn().mockResolvedValue(envelope([ledger])),
    getLedger: jest.fn().mockResolvedValue(envelope(ledger)),
    listUserLedgers: jest.fn().mockResolvedValue(envelope([ledger])),
    searchLedgers: jest.fn().mockResolvedValue(envelope({ data: [ledger] })),
  };
  const factory = {
    getPublicApiClient: async () => ({ ledgers }),
    getApiContext: async () => ({
      favaApiClient: { ledgers },
      favaUser: { username: "alice" },
    }),
  };
  const workflow = new LedgerWorkflow(
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    { authorizeOrThrow } as never,
  );
  currentResolver = new LedgerQueryResolver(workflow);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerQueryResolver],
    container: { get: () => currentResolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "permissions-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    rest,
    gql: (source: string) =>
      graphql({
        schema,
        source,
        contextValue: {
          identity,
          getCurrentIdentity: () => identity,
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

async function readMetadataResource(
  client: Client,
  uri: string,
): Promise<unknown> {
  const mcp = await client.readResource({ uri });
  const content = mcp.contents[0];
  if (!("text" in content)) throw new Error("Expected JSON resource text");
  return JSON.parse(content.text);
}

// w23/137: every surface reports the caller's effective permissions — repo
// rights intersected with credential capabilities — never raw repo access.
describe("ledger permissions parity", () => {
  it("reports read-only authority to a read-only credential on all surfaces", async () => {
    const f = await fixture(readOnlyToken);
    try {
      const expected = { admin: false, pull: true, push: false };
      const response = await fetch(`${f.rest.url}/api-gateway/v1/ledgers/alice/main`);
      expect(response.status).toBe(200);
      expect((await response.json()).permissions).toEqual(expected);
      const gql = await f.gql(
        '{ getLedger(ledgerId: "alice/main") { permissions { admin pull push } } }',
      );
      expect(gql.errors).toBeUndefined();
      expect(
        (gql.data?.getLedger as { permissions: unknown }).permissions,
      ).toEqual(expected);
      const mcp = (await readMetadataResource(
        f.client,
        "beancount://alice/main/metadata",
      )) as { permissions: unknown };
      expect(mcp.permissions).toEqual(expected);
    } finally {
      await f.close();
    }
  });

  it("reports full authority to a session on all surfaces", async () => {
    const f = await fixture(sessionIdentity);
    try {
      const expected = { admin: true, pull: true, push: true };
      const response = await fetch(`${f.rest.url}/api-gateway/v1/ledgers/alice/main`);
      expect(response.status).toBe(200);
      expect((await response.json()).permissions).toEqual(expected);
      const gql = await f.gql(
        '{ getLedger(ledgerId: "alice/main") { permissions { admin pull push } } }',
      );
      expect(gql.errors).toBeUndefined();
      expect(
        (gql.data?.getLedger as { permissions: unknown }).permissions,
      ).toEqual(expected);
      const mcp = (await readMetadataResource(
        f.client,
        "beancount://alice/main/metadata",
      )) as { permissions: unknown };
      expect(mcp.permissions).toEqual(expected);
    } finally {
      await f.close();
    }
  });

  it("scopes the listLedgers collection identically", async () => {
    const f = await fixture(readOnlyToken);
    try {
      const expected = { admin: false, pull: true, push: false };
      const response = await fetch(`${f.rest.url}/api-gateway/v1/ledgers`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as Array<{
        permissions?: unknown;
      }>;
      expect(Array.isArray(body) && body.length).toBeGreaterThan(0);
      for (const entry of body) {
        expect(entry.permissions).toEqual(expected);
      }
      const mcp = (await readMetadataResource(
        f.client,
        "beancount://catalog/ledgers",
      )) as Array<{ permissions?: unknown }>;
      expect(Array.isArray(mcp) && mcp.length).toBeGreaterThan(0);
      for (const entry of mcp) {
        expect(entry.permissions).toEqual(expected);
      }
    } finally {
      await f.close();
    }
  });
});
