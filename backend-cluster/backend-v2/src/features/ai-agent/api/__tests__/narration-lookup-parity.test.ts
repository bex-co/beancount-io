import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { UriTemplate } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { AuthorizationService } from "@/server/api/authorization";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { ServiceUnavailableError } from "@/shared/errors";
import {
  startV1TestServer,
  pinnedReadToken,
  scopelessToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { TransactionPublic } from "@/foundation/fava";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const canonical =
  "beancount://{owner}/{name}/narration-transactions{?narration}";
const base = "beancount://alice/main/narration-transactions";
const blank: TransactionPublic = {
  date: "2017-08-23",
  payee: "Wine-Tarner Cable",
  narration: "",
  postings: [
    {
      account: "Assets:US:BofA:Checking",
      amount: "-80.08",
      commodity: "USD",
      price: null,
    },
    {
      account: "Expenses:Home:Internet",
      amount: "80.08",
      commodity: "USD",
      price: null,
    },
  ],
};
const fields =
  "date payee narration postings { account amount commodity price }";
let resolver: LedgerDataQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(
  transaction: TransactionPublic | null = blank,
  identity: Identity = pinnedReadToken,
) {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const envelope = { data: { success: true, data: transaction } };
  const reports = {
    getLedgerNarrationTransactions: jest.fn().mockResolvedValue(envelope),
    getLedgerPayeeTransactions: jest.fn().mockResolvedValue(envelope),
  };
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({ reports }),
  };
  const services = {
    ledgerData: new LedgerDataService(
      factory as unknown as IFavaClientFactory,
      authorization,
    ),
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
  const client = new Client({ name: "narration-lookup-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const gqlDocument = (
    source: string,
    variableValues: Record<string, unknown>,
  ) => graphql({ schema, source, variableValues, contextValue: { identity } });
  return {
    check,
    reports,
    factory,
    client,
    rest: (query: string, kind: "narration" | "payee" = "narration") =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${kind}-transactions${query}`,
      ),
    mcp: async (uri: string) => {
      const result = await client.readResource({ uri });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content).toMatchObject({ mimeType: "application/json", uri });
      if (!("text" in content)) throw new Error("Expected JSON resource");
      return JSON.parse(content.text);
    },
    gqlDocument,
    gql: (kind: "narration" | "payee", value?: string) =>
      gqlDocument(
        `query($ledgerId: String!, $${kind}: String!) {
          getLedger${kind === "narration" ? "Narration" : "Payee"}Transactions(ledgerId: $ledgerId, ${kind}: $${kind}) { ${fields} }
        }`,
        { ledgerId: "alice/main", [kind]: value },
      ),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("transaction lookup adapter parity", () => {
  it("advertises and expands an explicit empty narration, preserving both lookup results", async () => {
    const f = await fixture();
    try {
      const { resourceTemplates } = await f.client.listResourceTemplates();
      const advertised = resourceTemplates.filter((entry) =>
        entry.uriTemplate.includes("/narration-transactions"),
      );
      expect(advertised).toHaveLength(1);
      expect(advertised[0].uriTemplate).toBe(canonical);
      expect(advertised[0].description).toContain(
        "beancount://{owner}/{name}/narration-transactions?narration=",
      );
      expect(advertised[0].description).toContain(
        "beancount://{owner}/{name}/narration-transactions/{narration}",
      );
      const uri = new UriTemplate(advertised[0].uriTemplate).expand({
        owner: "alice",
        name: "main",
        narration: "",
      });
      expect(uri).toBe(`${base}?narration=`);
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(await f.mcp(uri)).toEqual(blank);
      // A named parameter without '=' also explicitly carries the empty string.
      expect(await f.mcp(`${base}?narration`)).toEqual(blank);
      const response = await f.rest("?narration=");
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(blank);
      const narration = await f.gql("narration", "");
      expect(narration.errors).toBeUndefined();
      expect(narration.data?.getLedgerNarrationTransactions).toEqual(blank);

      const payee = await f.gql("payee", "Wine-Tarner Cable");
      expect(payee.errors).toBeUndefined();
      expect(payee.data?.getLedgerPayeeTransactions).toEqual(blank);
      const payeeRest = await f.rest("?payee=Wine-Tarner+Cable", "payee");
      expect(payeeRest.status).toBe(200);
      expect(await payeeRest.json()).toEqual(blank);
      expect(
        await f.mcp(
          "beancount://alice/main/payee-transactions/Wine-Tarner%20Cable",
        ),
      ).toEqual(blank);
      expect(f.reports.getLedgerNarrationTransactions.mock.calls).toEqual(
        Array.from({ length: 4 }, () => ["alice", "main", { narration: "" }]),
      );
      expect(f.reports.getLedgerPayeeTransactions.mock.calls).toEqual(
        Array.from({ length: 3 }, () => [
          "alice",
          "main",
          { payee: "Wine-Tarner Cable" },
        ]),
      );
    } finally {
      await f.close();
    }
  });

  it.each([
    {
      name: "encoded punctuation",
      transaction: {
        ...blank,
        narration: "Workshop facilitation + 8.5% sales tax / Café #東京?=yes&x",
      },
    },
    {
      name: "the producer's same-day choice without reordering or rounding",
      // Controlled upstream DTO: choosing the latest entry belongs to the producer.
      transaction: {
        date: "2017-08-14",
        payee: "Synthetic investment",
        narration: "Investing 60% of cash in RGAGX",
        postings: [
          {
            account: "Assets:Investments:RGAGX",
            amount: "1.843",
            commodity: "RGAGX",
            price: "54.26 USD",
          },
          {
            account: "Equity:Transfer",
            amount: "-1.843",
            commodity: "RGAGX",
            price: "54.26 USD",
          },
        ],
      },
    },
  ])(
    "preserves $name through query and legacy path forms",
    async ({ transaction }) => {
      const f = await fixture(transaction);
      const narration = transaction.narration!;
      const query = `?${new URLSearchParams({ narration })}`;
      try {
        expect(await f.mcp(`${base}${query}`)).toEqual(transaction);
        expect(await f.mcp(`${base}/${encodeURIComponent(narration)}`)).toEqual(
          transaction,
        );
        const response = await f.rest(query);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(transaction);
        const gql = await f.gql("narration", narration);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.getLedgerNarrationTransactions).toEqual(transaction);
        expect(f.reports.getLedgerNarrationTransactions.mock.calls).toEqual(
          Array.from({ length: 4 }, () => ["alice", "main", { narration }]),
        );
        expect(f.reports.getLedgerPayeeTransactions).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("preserves blank narration while retaining the existing absent-payee mapping", async () => {
    const { payee: _payee, ...noPayee } = blank;
    const f = await fixture(noPayee);
    try {
      const response = await f.rest("?narration=");
      expect(await response.json()).toEqual(noPayee);
      expect(await f.mcp(`${base}?narration=`)).toEqual(noPayee);
      for (const kind of ["narration", "payee"] as const) {
        const gql = await f.gql(kind, kind === "narration" ? "" : "QA payee");
        expect(gql.errors).toBeUndefined();
        expect(
          gql.data?.[
            `getLedger${kind === "narration" ? "Narration" : "Payee"}Transactions`
          ],
        ).toEqual({
          ...noPayee,
          payee: null,
        });
      }
    } finally {
      await f.close();
    }
  });

  it.each([
    base,
    `${base}?`,
    `${base}?unknown=1`,
    `${base}?narration=&unknown=1`,
    `${base}?narration=&narration=other`,
    `${base}/Buying%20groceries?narration=other`,
    `${base}?narration=#blocked`,
    `${base}/Buying%20groceries#blocked`,
    `${base}/%E0%A4`,
  ])("refuses malformed lookup URI %s before domain work", async (uri) => {
    const f = await fixture();
    try {
      await expect(f.client.readResource({ uri })).rejects.toMatchObject({
        code: -32602,
        data: {
          code: "BAD_USER_INPUT",
          message:
            uri === base || uri === `${base}?`
              ? expect.stringContaining("narration")
              : expect.any(String),
          hint: expect.stringMatching(/\S/),
        },
      });
      expect(f.check).not.toHaveBeenCalled();
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(f.reports.getLedgerNarrationTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses a missing required narration on REST and GraphQL before upstream work", async () => {
    const f = await fixture();
    try {
      const response = await f.rest("");
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "VALIDATION_FAILED" },
      });
      const gql = await f.gql("narration");
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].message).toContain("narration");
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(f.reports.getLedgerNarrationTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each(["payee", "narration"] as const)(
    "returns JSON null for an unmatched %s on every surface",
    async (kind) => {
      const f = await fixture(null);
      const missing = "__does_not_match__";
      const method =
        kind === "payee"
          ? "getLedgerPayeeTransactions"
          : "getLedgerNarrationTransactions";
      try {
        const response = await f.rest(
          `?${new URLSearchParams({ [kind]: missing })}`,
          kind,
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toMatch(
          /^application\/json\b/,
        );
        expect(await response.json()).toBeNull();
        const uri =
          kind === "payee"
            ? `beancount://alice/main/payee-transactions/${missing}`
            : `${base}?narration=${missing}`;
        expect(await f.mcp(uri)).toBeNull();
        const gql = await f.gql(kind, missing);
        expect(gql.errors).toBeUndefined();
        expect(gql.data).toEqual({ [method]: null });
        expect(f.reports[method].mock.calls).toEqual(
          Array.from({ length: 3 }, () => [
            "alice",
            "main",
            { [kind]: missing },
          ]),
        );
      } finally {
        await f.close();
      }
    },
  );

  it("retains known transactions beside both missing lookup fields in one GraphQL document", async () => {
    const f = await fixture();
    f.reports.getLedgerPayeeTransactions.mockImplementation(
      async (_owner, _name, { payee }) => ({
        data: { success: true, data: payee === blank.payee ? blank : null },
      }),
    );
    f.reports.getLedgerNarrationTransactions.mockImplementation(
      async (_owner, _name, { narration }) => ({
        data: { success: true, data: narration === "" ? blank : null },
      }),
    );
    try {
      const gql = await f.gqlDocument(
        `query($ledgerId: String!, $payee: String!, $missing: String!) {
          knownPayee: getLedgerPayeeTransactions(ledgerId: $ledgerId, payee: $payee) { ${fields} }
          missingPayee: getLedgerPayeeTransactions(ledgerId: $ledgerId, payee: $missing) { ${fields} }
          knownNarration: getLedgerNarrationTransactions(ledgerId: $ledgerId, narration: "") { ${fields} }
          missingNarration: getLedgerNarrationTransactions(ledgerId: $ledgerId, narration: $missing) { ${fields} }
        }`,
        {
          ledgerId: "alice/main",
          payee: blank.payee,
          missing: "__does_not_match__",
        },
      );
      expect(gql.errors).toBeUndefined();
      expect(gql.data).toEqual({
        knownPayee: blank,
        missingPayee: null,
        knownNarration: blank,
        missingNarration: null,
      });
      expect(f.reports.getLedgerPayeeTransactions).toHaveBeenCalledTimes(2);
      expect(f.reports.getLedgerNarrationTransactions).toHaveBeenCalledTimes(2);
    } finally {
      await f.close();
    }
  });

  it.each([
    {
      kind: "payee",
      failure: "domain",
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    },
    {
      kind: "narration",
      failure: "domain",
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    },
    {
      kind: "payee",
      failure: "envelope",
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      kind: "narration",
      failure: "envelope",
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
    },
  ] as const)(
    "preserves a $failure upstream failure for $kind on every surface",
    async ({ kind, failure, status, code }) => {
      const f = await fixture();
      const value = kind === "payee" ? "Wine-Tarner Cable" : "";
      const method =
        kind === "payee"
          ? "getLedgerPayeeTransactions"
          : "getLedgerNarrationTransactions";
      if (failure === "domain") {
        f.reports[method].mockRejectedValue(
          new ServiceUnavailableError("Ledger service"),
        );
      } else {
        f.reports[method].mockResolvedValue({
          data: { success: false, error: "Synthetic upstream refusal" },
        });
      }
      try {
        const response = await f.rest(
          `?${new URLSearchParams({ [kind]: value })}`,
          kind,
        );
        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ error: { code } });
        const uri =
          kind === "payee"
            ? `beancount://alice/main/payee-transactions/${encodeURIComponent(value)}`
            : `${base}?narration=`;
        await expect(f.client.readResource({ uri })).rejects.toMatchObject({
          data: { code },
        });
        const gql = await f.gql(kind, value);
        expect(gql.errors).toHaveLength(1);
        const error = gql.errors![0];
        expect(error.path).toEqual([method]);
        expect(formatError(error.toJSON(), error).extensions?.code).toBe(code);
        expect(gql.data).toEqual({ [method]: null });
        expect(f.reports[method]).toHaveBeenCalledTimes(3);
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
    {
      name: "missing read scope",
      identity: scopelessToken,
      revoked: false,
      status: 403,
      code: "FORBIDDEN",
    },
  ])("refuses $name before creating an upstream client", async (entry) => {
    const f = await fixture(blank, entry.identity);
    try {
      if (entry.revoked) {
        expect(await f.mcp(`${base}?narration=`)).toEqual(blank);
        f.factory.getPublicApiClient.mockClear();
        f.reports.getLedgerNarrationTransactions.mockClear();
        f.check.mockResolvedValue(false);
      }
      const response = await f.rest("?narration=");
      expect(response.status).toBe(entry.status);
      expect(await response.json()).toMatchObject({
        error: { code: entry.code },
      });
      await expect(
        f.client.readResource({ uri: `${base}?narration=` }),
      ).rejects.toMatchObject({
        data: { code: entry.code },
      });
      const gql = await f.gql("narration", "");
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: entry.code,
      });
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(f.reports.getLedgerNarrationTransactions).not.toHaveBeenCalled();
      expect(f.reports.getLedgerPayeeTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
