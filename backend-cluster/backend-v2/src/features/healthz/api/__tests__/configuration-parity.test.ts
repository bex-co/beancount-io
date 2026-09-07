import "reflect-metadata";
import { SubscriptionService } from "@/features/stripe/service/subscription-service";
import { SubscriptionResolver } from "@/features/stripe/api/subscription-resolver";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { HealthResolver } from "../health-resolver";
import { LedgerLegacyQueryResolver } from "@/features/ledger/api/resolvers/ledger-legacy-resolver.query";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { generateV1OpenAPIDocument } from "@/server/rest/openapi-registry";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity = {
  userId: "usr_alice",
  method: "oauth" as const,
  scopes: new Set<string>(),
  ledgerScope: "ada/personal",
};

describe("public configuration across real adapters", () => {
  let rest: Awaited<ReturnType<typeof startV1TestServer>>;
  let schema: Awaited<ReturnType<typeof buildSchema>>;
  let mcp: ReturnType<typeof assembleMcpRegistry>;
  let client: Client;
  beforeAll(async () => {
    const unexpectedDependency = new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            "Public configuration must not access billing dependencies",
          );
        },
      },
    );
    const subscriptions = new SubscriptionService(
      unexpectedDependency as never,
      unexpectedDependency as never,
      unexpectedDependency as never,
      unexpectedDependency as never,
    );
    const subscriptionResolver = new SubscriptionResolver(subscriptions);
    rest = await startV1TestServer(
      { services: { subscriptions } } as unknown as AppLayers,
      config,
    );
    const health = new HealthResolver();
    const legacy = new LedgerLegacyQueryResolver(
      {} as never,
      {} as never,
      {} as never,
    );
    schema = await buildSchema({
      resolvers: [
        HealthResolver,
        LedgerLegacyQueryResolver,
        SubscriptionResolver,
      ],
      container: {
        get: (ctor) =>
          ctor === HealthResolver
            ? health
            : ctor === SubscriptionResolver
              ? subscriptionResolver
              : legacy,
      },
      globalMiddlewares: [graphqlScopeMiddleware("enforce")],
      validate: true,
    });
    mcp = assembleMcpRegistry(
      {
        identity,
        subscriptionService: subscriptions,
      } as unknown as McpRequestContext,
      config,
    );
    client = new Client({ name: "configuration-parity", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), mcp.connect(b)]);
  });
  afterAll(async () => {
    await client.close();
    await mcp.close();
    await rest.close();
  });

  it.each([undefined, identity])(
    "allows public reads independent of scopes and ledger pins: %j",
    async (caller) => {
      rest.setIdentity(caller);
      const health = await fetch(`${rest.url}/api-gateway/v1/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toBe("OK");
      const flags = await fetch(
        `${rest.url}/api-gateway/v1/feature-flags?userId=someone`,
      );
      expect(flags.status).toBe(200);
      expect(await flags.json()).toEqual({ spendingReportSubscription: false });
      const g = await graphql({
        schema,
        source: '{health featureFlags(userId:"someone")}',
        contextValue: { identity: caller },
      });
      expect(g.errors).toBeUndefined();
      expect(g.data).toEqual({
        health: "OK",
        featureFlags: { spendingReportSubscription: false },
      });
      for (const [uri, expected] of [
        ["health", "OK"],
        ["feature-flags?userId=someone", { spendingReportSubscription: false }],
      ] as const) {
        const r = await client.readResource({
          uri: `beancount://configuration/${uri}`,
        });
        const content = r.contents[0];
        expect("text" in content && JSON.parse(content.text)).toEqual(expected);
      }
    },
  );

  it("keeps required arguments and protected routes enforced", async () => {
    rest.setIdentity(undefined);
    expect(
      (await fetch(`${rest.url}/api-gateway/v1/feature-flags`)).status,
    ).toBe(400);
    await expect(
      client.readResource({ uri: "beancount://configuration/feature-flags" }),
    ).rejects.toThrow();
    const g = await graphql({ schema, source: "{featureFlags}" });
    expect(g.errors).toHaveLength(1);
    expect((await fetch(`${rest.url}/api-gateway/v1/ledgers`)).status).toBe(
      401,
    );
    const doc = generateV1OpenAPIDocument();
    expect(doc.paths["/api-gateway/v1/health"].get?.security).toContainEqual(
      {},
    );
    expect(
      doc.paths["/api-gateway/v1/ledgers"].get?.security,
    ).not.toContainEqual({});
  });
  it("preserves public tier limits, ordering, and unlimited sentinels", async () => {
    rest.setIdentity(undefined);
    const response = await fetch(`${rest.url}/api-gateway/v1/tier-quotas`);
    expect(response.status).toBe(200);
    const quotas = (await response.json()) as Array<Record<string, unknown>>;
    expect(quotas).toHaveLength(5);
    expect(quotas[0]).toMatchObject({ tier: "FREE", maxLedgers: 1 });
    expect(quotas[4]).toMatchObject({
      tier: "ENTERPRISE",
      maxLedgers: -1,
      maxDirectives: -1,
      aiCfoTokensMax: -1,
      maxCollaboratorsPerLedger: -1,
    });
    const g = await graphql({
      schema,
      source:
        "{allTierQuotas{tier maxLedgers maxDirectives aiCfoTokensMax maxCollaboratorsPerLedger}}",
      contextValue: {},
    });
    expect(g.errors).toBeUndefined();
    expect(g.data?.allTierQuotas).toEqual(quotas);
    const r = await client.readResource({
      uri: "beancount://configuration/tier-quotas",
    });
    const c = r.contents[0];
    expect("text" in c && JSON.parse(c.text)).toEqual(quotas);
    expect(
      generateV1OpenAPIDocument().paths["/api-gateway/v1/tier-quotas"].get
        ?.security,
    ).toContainEqual({});
  });
});
