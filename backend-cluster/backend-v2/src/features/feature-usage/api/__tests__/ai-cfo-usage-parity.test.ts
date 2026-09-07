import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { AiCfoUsageResolver } from "../ai-cfo-usage-resolver";
import { AiCfoUsageService } from "../../service/ai-cfo-usage-service";
import { FeatureUsageService } from "../../service/feature-usage-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: "alice/main",
};
let currentResolver: AiCfoUsageResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [AiCfoUsageResolver],
    container: { get: () => currentResolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(caller = identity) {
  const month = new Date().toISOString().slice(0, 7);
  const counts = new Map([
    [`usr_alice/ai_cfo/${month}`, 12345],
    [`usr_bob/ai_cfo/${month}`, 987],
    ["usr_alice/ai_cfo/2001-01", 999999],
  ]);
  const getCount = jest.fn(
    async (_db, userId, key, billingMonth) =>
      counts.get(`${userId}/${key}/${billingMonth}`) ?? 0,
  );
  const addAndGetCount = jest.fn();
  const subscriptions = jest.fn(async () => []);
  const usage = new AiCfoUsageService(
    new FeatureUsageService(
      { featureUsage: { getCount, addAndGetCount } },
      {} as never,
    ),
    { listSubscriptions: subscriptions } as never,
    {
      paidCustomer: { findByUserIdWithActivePeriod: async () => null },
    } as never,
    {} as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ),
    ),
  );
  currentResolver = new AiCfoUsageResolver(usage);
  const rest = await startV1TestServer(
    { services: { aiCfoUsage: usage } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    { identity: caller, aiCfoUsage: usage } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "usage-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    getCount,
    addAndGetCount,
    subscriptions,
    rest: (query = "") =>
      fetch(`${rest.url}/api-gateway/v1/account/ai-cfo-usage${query}`),
    gql: (args = "") =>
      graphql({
        schema,
        source: `{ aiCfoUsage${args} { aiCfoTokensUsed aiCfoTokensMax } }`,
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([
  [identity, 12345],
  [{ ...identity, userId: "usr_bob", ledgerScope: undefined }, 987],
  [{ ...identity, method: "apikey" as const }, 12345],
])(
  "reads only the current account and billing month for %j",
  async (caller, count) => {
    const f = await fixture(caller);
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.client.readResource({
        uri: "beancount://account/ai-cfo-usage",
      });
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      const content = m.contents[0];
      if (!content || !("text" in content))
        throw new Error("Expected text resource");
      for (const result of [
        await r.json(),
        g.data!.aiCfoUsage,
        JSON.parse(content.text),
      ])
        expect(result).toEqual({
          aiCfoTokensUsed: count,
          aiCfoTokensMax: 20000,
        });
      expect(f.getCount).toHaveBeenCalledTimes(3);
      expect(f.addAndGetCount).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("refuses caller-supplied account selection", async () => {
  const f = await fixture();
  try {
    expect((await f.rest("?userId=usr_bob")).status).toBe(400);
    expect((await f.gql('(userId:"usr_bob")')).errors).toHaveLength(1);
    await expect(
      f.client.readResource({
        uri: "beancount://account/ai-cfo-usage?userId=usr_bob",
      }),
    ).rejects.toThrow();
    expect(f.getCount).not.toHaveBeenCalled();
    expect(f.subscriptions).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses missing read capability before usage or billing access", async () => {
  const f = await fixture({ ...identity, scopes: new Set() });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(
      f.client.readResource({ uri: "beancount://account/ai-cfo-usage" }),
    ).rejects.toThrow();
    expect(f.getCount).not.toHaveBeenCalled();
    expect(f.subscriptions).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("propagates a usage-store outage without fabricating zero usage", async () => {
  const f = await fixture();
  f.getCount.mockRejectedValue(new Error("fixture usage store unavailable"));
  try {
    expect((await f.rest()).status).toBe(500);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(
      f.client.readResource({ uri: "beancount://account/ai-cfo-usage" }),
    ).rejects.toThrow();
    expect(f.addAndGetCount).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
