import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema, registerEnumType } from "type-graphql";
import { AccountResolver } from "../account-resolver";
import { AccountService } from "../../service/account-service";
import { ReportStatus } from "../../utils/report-status";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const caller: Identity = {
  userId: "usr_ada",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: "ada/personal",
};
const user = {
  id: "usr_ada",
  email: "ada@example.test",
  locale: "fr",
  firstName: "Ada",
  lastName: null,
  ledger_username: "ada",
};
const fields =
  "id email locale firstName lastName emailReportStatus username tier hasEverSubscribed limits{ledgersUsed ledgersMax collaboratorsPerLedgerMax maxDirectives}";
let resolver: AccountResolver;
let schemaPromise: ReturnType<typeof buildSchema>;
registerEnumType(ReportStatus, { name: "ReportStatus" });

async function fixture(identity: Identity | undefined = caller, exists = true) {
  const getById = jest.fn(async () => (exists ? user : null));
  const models = {
    user: { getById },
    paidCustomer: {
      findByUserId: async () => [{ id: "historical" }],
      findByUserIdWithActivePeriod: async () => null,
    },
  };
  const ledgers = jest.fn(async () => ({
    data: {
      success: true,
      data: [{ full_name: "ada/personal" }, { full_name: "someone/shared" }],
    },
  }));
  const factory = {
    getApiContext: async () => ({
      favaApiClient: { ledgers: { listLedgers: ledgers } },
    }),
  };
  const service = new AccountService(
    models as never,
    {} as never,
    { listSubscriptions: async () => [] } as never,
    factory as never,
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
  resolver = new AccountResolver(service);
  schemaPromise ??= buildSchema({
    resolvers: [AccountResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services: { account: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const mcp = assembleMcpRegistry(
    {
      identity: identity ?? caller,
      accountService: service,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "profile-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), mcp.connect(b)]);
  return {
    getById,
    ledgers,
    rest: (suffix = "") =>
      fetch(`${rest.url}/api-gateway/v1/user-profile${suffix}`),
    gql: (args = "") =>
      graphql({
        schema,
        source: `{userProfile${args}{${fields}}}`,
        contextValue: {
          identity,
          userId: identity?.userId,
          getCurrentIdentity: () => identity,
        },
      }),
    read: async (suffix = "") => {
      const r = await client.readResource({
        uri: `beancount://account/profile${suffix}`,
      });
      const c = r.contents[0];
      if (!("text" in c)) throw new Error("Expected JSON profile");
      return JSON.parse(c.text);
    },
    close: async () => {
      await client.close();
      await mcp.close();
      await rest.close();
    },
  };
}

describe("profile reads through actual adapters and exact-self authorization", () => {
  it.each(["", "?userId=usr_ada"])(
    "returns the same profile and limits: %s",
    async (suffix) => {
      const f = await fixture();
      try {
        const r = await f.rest(suffix);
        expect(r.status).toBe(200);
        const profile = await r.json();
        expect(profile).toMatchObject({
          id: "usr_ada",
          locale: "fr",
          lastName: "",
          emailReportStatus: "OFF",
          tier: "FREE",
          hasEverSubscribed: true,
          limits: { ledgersUsed: 1, ledgersMax: 1 },
        });
        const g = await f.gql(suffix ? '(userId:"usr_ada")' : "");
        expect(g.errors).toBeUndefined();
        expect(g.data?.userProfile).toEqual(profile);
        expect(await f.read(suffix)).toEqual(profile);
        expect(f.getById).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );
  it("returns JSON null for a user that no longer exists", async () => {
    const f = await fixture(caller, false);
    try {
      const r = await f.rest();
      expect(r.status).toBe(200);
      expect(await r.json()).toBeNull();
      expect((await f.gql()).data?.userProfile).toBeNull();
      expect(await f.read()).toBeNull();
      expect(f.ledgers).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("preserves the anonymous probe without reading account data", async () => {
    const f = await fixture();
    await f.close();
    // Explicit undefined would trigger the fixture's default caller.
    const server = await startV1TestServer({} as AppLayers, config);
    try {
      const r = await fetch(
        `${server.url}/api-gateway/v1/user-profile?userId=usr_ada`,
      );
      expect(r.status).toBe(200);
      expect(await r.json()).toBeNull();
      const schema = await schemaPromise;
      const g = await graphql({
        schema,
        source: `{userProfile{${fields}}}`,
        contextValue: {},
      });
      expect(g.data?.userProfile).toBeNull();
      expect(f.getById).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
  it.each(["?userId=someone", "?userId="])(
    "refuses another target before loading data: %s",
    async (suffix) => {
      const f = await fixture();
      try {
        expect((await f.rest(suffix)).ok).toBe(false);
        expect(
          (await f.gql(`(userId:${JSON.stringify(suffix.split("=")[1])})`))
            .errors,
        ).toBeDefined();
        await expect(f.read(suffix)).rejects.toThrow();
        expect(f.getById).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("refuses a credential without read scope before loading data", async () => {
    const f = await fixture({ ...caller, scopes: new Set() });
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toBeDefined();
      await expect(f.read()).rejects.toThrow();
      expect(f.getById).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
