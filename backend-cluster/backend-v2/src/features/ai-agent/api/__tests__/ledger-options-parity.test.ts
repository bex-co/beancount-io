import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { FavaApiError } from "@/foundation/fava/api-client";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
  readOnlyToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { Ledger } from "@/features/ledger/api/resolvers/ledger-resolver.types";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { IContext } from "@/server/graphql/context";
import type { McpRequestContext } from "../mcp-context";

/**
 * w6/m3. GraphQL answered a ledger's effective core options as
 * `Ledger.options`; REST had only the six-field legacy projection and MCP had
 * nothing, so a client on either reconstructed Beancount's defaults from
 * source files. These drive REST over HTTP, GraphQL (root and nested), and an
 * MCP client through the real `LedgerWorkflow` and PDP, with only the ledger
 * service faked.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

// Every value differs from Beancount's default, and the operating currency is
// not one the ledger's postings would use, so nothing here can pass by a
// surface supplying a default or reading the vocabulary instead.
const engineOptions = {
  title: "Huishoudboek",
  name_assets: "Activa",
  name_equity: "Eigen-Vermogen",
  name_expenses: "Uitgaven",
  name_income: "Inkomsten",
  name_liabilities: "Passiva",
  account_current_conversions: "Omrekening:Lopend",
  account_current_earnings: "Resultaat:Lopend",
  render_commas: false,
  operating_currency: ["CHF"],
  // Engine fields outside the ten core options stay out of every surface.
  booking_method: "FIFO",
};
const expected = {
  title: "Huishoudboek",
  nameAssets: "Activa",
  nameEquity: "Eigen-Vermogen",
  nameExpenses: "Uitgaven",
  nameIncome: "Inkomsten",
  nameLiabilities: "Passiva",
  accountCurrentConversions: "Omrekening:Lopend",
  accountCurrentEarnings: "Resultaat:Lopend",
  renderCommas: false,
  operatingCurrency: ["CHF"],
};
const selection = Object.keys(expected).join(" ");
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolver: LedgerQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(identity: Identity = readOnlyToken) {
  const getLedgerOptions = jest.fn().mockResolvedValue(envelope(engineOptions));
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const factory = {
    getPublicApiClient: jest
      .fn()
      .mockResolvedValue({ reports: { getLedgerOptions } }),
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
    authorization,
  );
  resolver = new LedgerQueryResolver(workflow);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerQueryResolver],
    container: { get: () => resolver },
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
    { identity, ledgerWorkflow: workflow } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "ledger-options-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const context = { identity, getCurrentIdentity: () => identity };
  return {
    check,
    factory,
    getLedgerOptions,
    rest: (ledger = "alice/main") =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/${ledger}/options`),
    mcp: async (ledger = "alice/main") => {
      const result = await client.readResource({
        uri: `beancount://${ledger}/options`,
      });
      const content = result.contents[0];
      expect(content.mimeType).toBe("application/json");
      if (!("text" in content)) throw new Error("Expected JSON resource");
      return JSON.parse(content.text);
    },
    gql: (ledger = "alice/main") =>
      graphql({
        schema,
        source: `query($ledgerId: String!) { getLedgerOptions(ledgerId: $ledgerId) { ${selection} } }`,
        variableValues: { ledgerId: ledger },
        contextValue: context,
      }),
    // The nested field `getLedger { options }` resolves through; driven
    // directly so the root ledger read's own dependencies stay out of it.
    nested: (ledger = "alice/main") =>
      resolver.options({ id: ledger } as Ledger, context as IContext),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

/** The category GraphQL clients see, after the server's own error formatter. */
async function gqlCode(result: ReturnType<typeof graphql>) {
  const error = (await result).errors?.[0];
  if (!error) throw new Error("Expected a GraphQL error");
  return formatError(error.toJSON(), error).extensions?.code;
}

describe("ledger options parity (w6/m3)", () => {
  it("serves the same effective options on REST, GraphQL and MCP", async () => {
    const f = await fixture();
    try {
      const response = await f.rest();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expected);
      expect(await f.mcp()).toEqual(expected);
      const gql = await f.gql();
      expect(gql.errors).toBeUndefined();
      expect(gql.data?.getLedgerOptions).toEqual(expected);
      expect(await f.nested()).toEqual(expected);

      // One producer: every surface reached the same ledger the same way.
      expect(f.getLedgerOptions).toHaveBeenCalledTimes(4);
      for (const call of f.getLedgerOptions.mock.calls)
        expect(call).toEqual(["alice", "main"]);
      for (const call of f.factory.getPublicApiClient.mock.calls)
        expect(call).toEqual(["alice/main", readOnlyToken.userId]);
    } finally {
      await f.close();
    }
  });

  it("reports an empty operating-currency list rather than inventing one", async () => {
    const f = await fixture();
    f.getLedgerOptions.mockResolvedValue(
      envelope({ ...engineOptions, operating_currency: [] }),
    );
    try {
      const empty = { ...expected, operatingCurrency: [] };
      expect(await (await f.rest()).json()).toEqual(empty);
      expect(await f.mcp()).toEqual(empty);
      expect((await f.gql()).data?.getLedgerOptions).toEqual(empty);
    } finally {
      await f.close();
    }
  });

  it("refuses a ledger the caller cannot read before asking the ledger", async () => {
    const f = await fixture();
    f.check.mockResolvedValue(false);
    try {
      const response = await f.rest();
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
      await expect(f.mcp()).rejects.toMatchObject({
        data: { code: "NOT_FOUND" },
      });
      expect(await gqlCode(f.gql())).toBe("NOT_FOUND");
      await expect(f.nested()).rejects.toMatchObject({ category: "NOT_FOUND" });
      expect(f.getLedgerOptions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("keeps a pinned credential on its ledger", async () => {
    const f = await fixture(pinnedReadToken);
    try {
      expect(await (await f.rest("alice/main")).json()).toEqual(expected);
      f.getLedgerOptions.mockClear();

      const response = await f.rest("bob/books");
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
      await expect(f.mcp("bob/books")).rejects.toMatchObject({
        data: { code: "FORBIDDEN" },
      });
      expect(await gqlCode(f.gql("bob/books"))).toBe("FORBIDDEN");
      expect(f.getLedgerOptions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("surfaces a ledger-service failure as the same category everywhere", async () => {
    const f = await fixture();
    f.getLedgerOptions.mockRejectedValue(
      new FavaApiError("upstream down", 503),
    );
    try {
      const response = await f.rest();
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
      await expect(f.mcp()).rejects.toMatchObject({
        data: { code: "SERVICE_UNAVAILABLE" },
      });
      expect(await gqlCode(f.gql())).toBe("SERVICE_UNAVAILABLE");
    } finally {
      await f.close();
    }
  });
});
