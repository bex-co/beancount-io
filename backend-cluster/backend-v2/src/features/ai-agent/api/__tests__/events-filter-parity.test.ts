import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { UriTemplate } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { FavaApiError } from "@/foundation/fava/api-client";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import {
  pinnedReadToken,
  startV1TestServer,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { EventPublic } from "@/foundation/fava";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const base = "beancount://alice/main/events";
const template = "beancount://{owner}/{name}/events{?account,filter,time}";
const expression = 'description ~ "Café #東京 + train"';
const events: EventPublic[] = [
  { date: "2015-02-03", type: "location", description: "Paris" },
  { date: "2015-06-14", type: "work", description: "First contract" },
  { date: "2016-04-11", type: "location", description: "Café #東京 + train" },
  { date: "2016-04-19", type: "work", description: "Second contract" },
  { date: "2016-11-16", type: "location", description: "Berlin" },
  { date: "2016-11-29", type: "trip", description: "Winter journey" },
  { date: "2017-01-05", type: "location", description: "Café #東京 + train" },
  { date: "2017-06-20", type: "work", description: "Third contract" },
  { date: "2017-12-21", type: "trip", description: "Home" },
];
type Selection = { account?: string; filter?: string; time?: string };
const queryOf = (selection: Selection) => {
  const query = new URLSearchParams(selection).toString();
  return query ? `?${query}` : "";
};
let resolver: LedgerDataQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(identity: Identity = pinnedReadToken) {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  // Controlled producer selection exercises adapter inputs and outputs, not
  // the native engine's expression parser or account-filter semantics.
  const getLedgerEvents = jest.fn(
    async (_owner: string, _name: string, selection: Selection = {}) => {
      if (selection.time === "not-a-period" || selection.filter === "(") {
        throw new FavaApiError("Invalid event selection", 400, {
          error: "Invalid event selection",
        });
      }
      let selected = events;
      if (selection.time) {
        selected = selected.filter((event) =>
          event.date.startsWith(selection.time!),
        );
      }
      if (selection.account) selected = [];
      if (selection.filter === expression) {
        selected = selected.filter(
          (event) => event.description === "Café #東京 + train",
        );
      }
      return { data: { success: true, data: selected } };
    },
  );
  const getLedgerPayees = jest.fn().mockResolvedValue({
    data: { success: true, data: ["Café + Co", "Tokyo"] },
  });
  const factory = {
    getPublicApiClient: jest
      .fn()
      .mockResolvedValue({ reports: { getLedgerEvents, getLedgerPayees } }),
  };
  const services = {
    ledgerData: new LedgerDataService(factory as never, authorization),
  };
  resolver = new LedgerDataQueryResolver(services.ledgerData);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerDataQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "events-filter-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    check,
    authorize,
    factory,
    getLedgerEvents,
    getLedgerPayees,
    client,
    rest: (selection: Selection = {}) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/events${queryOf(selection)}`,
      ),
    restPayees: (query: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/payees?${query}`),
    mcp: async (selection: Selection = {}) => {
      const uri = `${base}${queryOf(selection)}`;
      const { contents } = await client.readResource({ uri });
      expect(contents).toHaveLength(1);
      const content = contents[0];
      expect(content).toMatchObject({ uri, mimeType: "application/json" });
      if (!("text" in content)) throw new Error("Expected JSON resource");
      return JSON.parse(content.text);
    },
    gql: (selection: Selection = {}) =>
      graphql({
        schema,
        source: `query($account: String, $filter: String, $time: String) {
          getLedgerEvents(ledgerId: "alice/main", account: $account, filter: $filter, time: $time) {
            date type description
          }
        }`,
        variableValues: selection,
        contextValue: { identity },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("event filter adapter parity", () => {
  it("refuses query overrides of trusted ledger and caller on an unfiltered vocabulary read", async () => {
    const f = await fixture();
    try {
      const response = await f.restPayees(
        new URLSearchParams({
          ledgerId: "bob/secret",
          identity: JSON.stringify({
            userId: "usr_attacker",
            method: "session",
          }),
          account: "Assets:Other",
          time: "2016",
        }).toString(),
      );
      // Ignored until w1/218; a route that declares no query now refuses one.
      expect(response.status).toBe(400);
      expect(f.authorize).not.toHaveBeenCalled();
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(f.getLedgerPayees).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each<{ name: string; selection: Selection; expected: EventPublic[] }>([
    { name: "all nine events", selection: {}, expected: events },
    {
      name: "four 2016 events",
      selection: { time: "2016" },
      expected: events.slice(2, 6),
    },
    { name: "an empty year", selection: { time: "2010" }, expected: [] },
    {
      name: "an account selection",
      selection: { account: "Assets:US:Café + Brokerage" },
      expected: [],
    },
    {
      name: "an encoded expression",
      selection: { filter: expression },
      expected: [events[2], events[6]],
    },
    {
      name: "all three selection fields, including an empty account",
      selection: { account: "", filter: expression, time: "2016" },
      expected: [events[2]],
    },
  ])(
    "preserves $name and the producer's ordering on every surface",
    async ({ selection, expected }) => {
      const f = await fixture();
      try {
        const rest = await f.rest(selection);
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expected);
        expect(await f.mcp(selection)).toEqual(expected);
        const gql = await f.gql(selection);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.getLedgerEvents).toEqual(expected);
        expect(f.getLedgerEvents.mock.calls).toEqual(
          Array.from({ length: 3 }, () => ["alice", "main", selection]),
        );
        expect(f.check).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );

  it("advertises one ledgerEvents resource with the exact optional selection template", async () => {
    const f = await fixture();
    try {
      const { resourceTemplates } = await f.client.listResourceTemplates();
      const advertised = resourceTemplates.filter((entry) =>
        entry.uriTemplate.includes("/events"),
      );
      expect(advertised).toHaveLength(1);
      expect(advertised[0]).toMatchObject({
        name: "ledgerEvents",
        uriTemplate: template,
      });
      expect(
        new UriTemplate(advertised[0].uriTemplate).expand({
          owner: "alice",
          name: "main",
          time: "2016",
        }),
      ).toBe(`${base}?time=2016`);
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each<Selection>([{ time: "not-a-period" }, { filter: "(" }])(
    "preserves the producer's malformed selection error for %j",
    async (selection) => {
      const f = await fixture();
      try {
        const rest = await f.rest(selection);
        expect(rest.status).toBe(400);
        expect(await rest.json()).toMatchObject({
          error: { code: "BAD_USER_INPUT" },
        });
        await expect(f.mcp(selection)).rejects.toMatchObject({
          data: { code: "BAD_USER_INPUT" },
        });
        const gql = await f.gql(selection);
        expect(gql.errors).toHaveLength(1);
        const error = gql.errors![0];
        expect(formatError(error.toJSON(), error).extensions?.code).toBe(
          "BAD_USER_INPUT",
        );
        expect(f.getLedgerEvents.mock.calls).toEqual(
          Array.from({ length: 3 }, () => ["alice", "main", selection]),
        );
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    "?unknown=1",
    "?account=A&account=B",
    "?filter=x&filter=y",
    "?time=2016&time=2010",
  ])(
    "refuses unknown or repeated MCP parameters %s before domain work",
    async (query) => {
      const f = await fixture();
      try {
        await expect(
          f.client.readResource({ uri: `${base}${query}` }),
        ).rejects.toMatchObject({
          code: -32602,
          data: { code: "BAD_USER_INPUT", hint: expect.stringMatching(/\S/) },
        });
        expect(f.check).not.toHaveBeenCalled();
        expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.getLedgerEvents).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    {
      name: "revoked access",
      identity: pinnedReadToken,
      revoked: true,
      status: 404,
      code: "NOT_FOUND",
    },
    {
      name: "a conflicting ledger pin",
      identity: { ...pinnedReadToken, ledgerScope: "alice/other" },
      revoked: false,
      status: 403,
      code: "FORBIDDEN",
    },
  ])(
    "refuses $name before creating an upstream client",
    async ({ identity, revoked, status, code }) => {
      const f = await fixture(identity);
      const selection = { time: "2016" };
      try {
        if (revoked) {
          expect(await f.mcp(selection)).toEqual(events.slice(2, 6));
          f.factory.getPublicApiClient.mockClear();
          f.getLedgerEvents.mockClear();
          f.check.mockResolvedValue(false);
        }
        const rest = await f.rest(selection);
        expect(rest.status).toBe(status);
        expect(await rest.json()).toMatchObject({ error: { code } });
        await expect(f.mcp(selection)).rejects.toMatchObject({
          data: { code },
        });
        const gql = await f.gql(selection);
        expect(gql.errors).toHaveLength(1);
        const error = gql.errors![0];
        expect(formatError(error.toJSON(), error).extensions?.code).toBe(code);
        expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
        expect(f.getLedgerEvents).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});
