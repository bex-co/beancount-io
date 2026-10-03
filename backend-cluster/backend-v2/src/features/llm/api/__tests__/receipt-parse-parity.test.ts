import { requestPlatform } from "@/server/api/request-platform";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("../../utils/extract-receipt-from-file", () => ({
  extractReceiptFromFile: jest.fn(),
}));
jest.mock("../../utils/recommend-accounts", () => ({
  recommendAccounts: jest.fn(),
}));
import { recommendAccounts } from "../../utils/recommend-accounts";
import { extractReceiptFromFile } from "../../utils/extract-receipt-from-file";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { DirectiveType } from "@/foundation/fava";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LLMParserResolver } from "../llm-parser-resolver";
import { LLMService } from "../../service/llm-service";
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
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const input = {
  s3ObjectKey: "tmp/usr_alice/receipt.pdf",
  ledgerId: "alice/main",
};
const receipt = {
  date: "2026-09-01",
  payee: "Café",
  description: "Breakfast",
  amount: 12.34,
};
const recommendation = {
  sourceAccount: "Assets:Cash",
  targetAccount: "Expenses:Food",
};

let resolver: LLMParserResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LLMParserResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LLMParserResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});
beforeEach(() => {
  jest.mocked(recommendAccounts).mockReset();
  jest.mocked(recommendAccounts).mockResolvedValue({
    recommendation: {
      ...recommendation,
      confidence: 0.95,
      reasoning: "Fixture",
    },
    tokenUsage: { inputTokens: 30, outputTokens: 10 },
  });
  jest.mocked(extractReceiptFromFile).mockReset();
  jest.mocked(extractReceiptFromFile).mockResolvedValue({
    transaction: receipt,
    tokenUsage: { inputTokens: 80, outputTokens: 20 },
  });
});

async function fixture(caller = identity, appId?: string) {
  const headers: Record<string, string> = appId ? { "x-app-id": appId } : {};
  const platform = requestPlatform(headers);
  const metadata = jest.fn(async () => ({ contentType: "application/pdf" }));
  const download = jest.fn(async () => ({
    downloadUrl: "https://storage.invalid/fixture",
    expiresIn: 600,
  }));
  const check = jest.fn(async () => ({
    allowed: true,
    currentCount: 10,
    maxAllowed: 1000,
  }));
  const charge = jest.fn(async () => undefined);
  const state = { readable: true };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.readable ? "read" : "none" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      journal: {
        getJournal: async (
          _owner: string,
          _name: string,
          query: { directive_types: string[] },
        ) =>
          envelope({
            items:
              query.directive_types[0] === DirectiveType.Open
                ? ["Assets:Cash", "Expenses:Food", "Expenses:Closed"].map(
                    (account) => ({
                      account,
                      date: "2020-01-01",
                      entry_hash: account,
                    }),
                  )
                : [
                    {
                      account: "Expenses:Closed",
                      date: "2025-01-01",
                      entry_hash: "closed",
                    },
                  ],
            total: 3,
          }),
      },
      reports: { getLedgerAccountLastEntries: async () => envelope([]) },
      shell: { queryShell: async () => envelope({ result: { rows: [] } }) },
    }),
  };
  const service = new LLMService(
    fava as never,
    { getObjectMetadata: metadata, generateDownloadUrl: download } as never,
    { check, addTokenUsage: charge } as never,
    { blockeden: { accessKey: "fixture" } } as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LLMParserResolver(service);
  const rest = await startV1TestServer(
    { services: { llm: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      llmService: service,
      platform,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "receipt-parse-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    state,
    check,
    charge,
    metadata,
    download,
    rest: (body: unknown = input, requestHeaders = headers) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/import/parse-receipt`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...requestHeaders },
          body: JSON.stringify({
            s3ObjectKey: (body as typeof input).s3ObjectKey,
          }),
        },
      ),
    gql: (args = input) =>
      graphql({
        schema,
        source:
          "mutation($s3ObjectKey:String!,$ledgerId:String!) { parseReceipt(s3ObjectKey:$s3ObjectKey,ledgerId:$ledgerId) { date payee description amount sourceAccount targetAccount } }",
        variableValues: args,
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform,
        },
      }),
    mcp: (args: Record<string, unknown> = input) =>
      client.callTool({
        name: "parseReceipt",
        arguments: {
          objectKey: args.s3ObjectKey,
          ...(caller.ledgerScope ? {} : { ledger: args.ledgerId }),
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([
  identity,
  { ...identity, ledgerScope: undefined, scopes: new Set(["ledger.read"]) },
])(
  "returns the receipt and charges extraction plus recommendations with %j",
  async (caller) => {
    const f = await fixture(caller);
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.mcp();
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      expect(m.isError).not.toBe(true);
      for (const result of [
        await r.json(),
        g.data!.parseReceipt,
        (m.structuredContent as { result: unknown }).result,
      ])
        expect(result).toEqual({ ...receipt, ...recommendation });
      expect(f.charge).toHaveBeenCalledTimes(3);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 140);
      expect(recommendAccounts).toHaveBeenCalledWith(
        expect.anything(),
        receipt,
        ["Assets:Cash", "Expenses:Food"],
      );
      expect(extractReceiptFromFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: "https://storage.invalid/fixture",
          format: "pdf",
          mediaType: "application/pdf",
        }),
      );
    } finally {
      await f.close();
    }
  },
);

it.each(
  [undefined, "beancount-mobile"].flatMap((appId) =>
    [
      "tmp/usr_other/statement.csv",
      "assets/usr_alice/statement.csv",
      "tmp/usr_alice/",
    ].map((s3ObjectKey) => ({ appId, s3ObjectKey })),
  ),
)(
  "rejects unowned key $s3ObjectKey before storage or provider access ($appId)",
  async ({ appId, s3ObjectKey }) => {
    const f = await fixture(identity, appId);
    const args = { ...input, s3ObjectKey };
    try {
      expect((await f.rest(args)).status).toBe(404);
      expect((await f.gql(args)).errors).toHaveLength(1);
      expect((await f.mcp(args)).isError).toBe(true);
      expect(f.check).not.toHaveBeenCalled();
      expect(f.metadata).not.toHaveBeenCalled();
      expect(extractReceiptFromFile).not.toHaveBeenCalled();
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

// w5/054: a blank key is a malformed request. It used to reach the ownership
// check and come back as an authorization refusal with a hint about ledger
// permission.
it.each(["", "   "])(
  "refuses the blank key %j as bad input on every surface, before authorization",
  async (s3ObjectKey) => {
    const f = await fixture();
    const args = { ...input, s3ObjectKey };
    try {
      const r = await f.rest(args);
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({
        error: { code: "BAD_USER_INPUT" },
      });
      const g = await f.gql(args);
      expect(g.errors?.[0].originalError).toMatchObject({
        category: "BAD_USER_INPUT",
      });
      const m = await f.mcp(args);
      expect(m.isError).toBe(true);
      const { error } = m.structuredContent as {
        error: { code: string; hint: string };
      };
      expect(error.code).toBe("BAD_USER_INPUT");
      expect(error.hint).toContain("tmp/");
      expect(error.hint).not.toMatch(/permission/i);
      expect(f.check).not.toHaveBeenCalled();
      expect(f.metadata).not.toHaveBeenCalled();
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "refuses missing read capability before quota or storage access (%s)",
  async (appId) => {
    const f = await fixture({ ...identity, scopes: new Set() }, appId);
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      expect((await f.mcp()).isError).toBe(true);
      expect(f.check).not.toHaveBeenCalled();
      expect(f.metadata).not.toHaveBeenCalled();
      expect(extractReceiptFromFile).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("refuses exhausted quota before downloading or parsing", async () => {
  const f = await fixture();
  f.check.mockResolvedValue({
    allowed: false,
    currentCount: 1000,
    maxAllowed: 1000,
  });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    expect((await f.mcp()).isError).toBe(true);
    expect(f.metadata).not.toHaveBeenCalled();
    expect(f.download).not.toHaveBeenCalled();
    expect(extractReceiptFromFile).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it.each([undefined, "beancount-mobile"])(
  "propagates provider failure without charging a successful parse (%s)",
  async (appId) => {
    const f = await fixture(identity, appId);
    jest
      .mocked(extractReceiptFromFile)
      .mockRejectedValue(new Error("fixture provider unavailable"));
    try {
      expect((await f.rest()).status).toBe(500);
      expect((await f.gql()).errors).toHaveLength(1);
      expect((await f.mcp()).isError).toBe(true);
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "refuses revoked ledger access before quota or storage (%s)",
  async (appId) => {
    const f = await fixture(identity, appId);
    f.state.readable = false;
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      expect((await f.mcp()).isError).toBe(true);
      expect(f.check).not.toHaveBeenCalled();
      expect(f.metadata).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "rejects unsupported receipt media before signing or extraction (%s)",
  async (appId) => {
    const f = await fixture(identity, appId);
    f.metadata.mockResolvedValue({ contentType: "text/csv" });
    try {
      expect((await f.rest()).status).toBe(400);
      expect((await f.gql()).errors).toHaveLength(1);
      expect((await f.mcp()).isError).toBe(true);
      expect(f.download).not.toHaveBeenCalled();
      expect(extractReceiptFromFile).not.toHaveBeenCalled();
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("preserves an unknown date and absent account recommendations", async () => {
  const f = await fixture();
  jest.mocked(extractReceiptFromFile).mockResolvedValue({
    transaction: { ...receipt, date: "" },
    tokenUsage: { inputTokens: 1, outputTokens: 2 },
  });
  jest.mocked(recommendAccounts).mockResolvedValue({
    recommendation: {
      sourceAccount: null,
      targetAccount: null,
      confidence: 0,
      reasoning: "No matching accounts",
    },
    tokenUsage: { inputTokens: 3, outputTokens: 4 },
  });
  try {
    const r = await f.rest();
    const g = await f.gql();
    const m = await f.mcp();
    expect(r.status).toBe(200);
    expect(g.errors).toBeUndefined();
    expect(m.isError).not.toBe(true);
    for (const result of [
      await r.json(),
      g.data!.parseReceipt,
      (m.structuredContent as { result: unknown }).result,
    ] as Record<string, unknown>[]) {
      expect({
        ...result,
        sourceAccount: result.sourceAccount ?? null,
        targetAccount: result.targetAccount ?? null,
      }).toEqual({
        ...receipt,
        date: null,
        sourceAccount: null,
        targetAccount: null,
      });
    }
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 10);
  } finally {
    await f.close();
  }
});

it.each([undefined, "beancount-mobile"])(
  "refuses a different credential pin before storage or extraction (%s)",
  async (appId) => {
    const f = await fixture({ ...identity, ledgerScope: "other/books" }, appId);
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      expect(
        (
          await f.client.callTool({
            name: "parseReceipt",
            arguments: { objectKey: input.s3ObjectKey, ledger: "alice/main" },
          })
        ).isError,
      ).toBe(true);
      expect(f.metadata).not.toHaveBeenCalled();
      expect(extractReceiptFromFile).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each(["beancount-mobile", "mobile-beancount"])(
  "mobile %s bypasses exhausted plan quota while recording actual usage",
  async (appId) => {
    const f = await fixture(identity, appId);
    f.check.mockResolvedValue({
      allowed: false,
      currentCount: 1000,
      maxAllowed: 1000,
    });
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.mcp();
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      expect(m.isError).not.toBe(true);
      for (const result of [
        await r.json(),
        g.data!.parseReceipt,
        (m.structuredContent as { result: unknown }).result,
      ]) {
        expect(result).toEqual({ ...receipt, ...recommendation });
      }
      expect(f.check).not.toHaveBeenCalled();
      expect(f.charge).toHaveBeenCalledTimes(3);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 140);
    } finally {
      await f.close();
    }
  },
);

it("keeps concurrent and subsequent web requests subject to quota on the same account", async () => {
  const f = await fixture();
  f.check.mockResolvedValue({
    allowed: false,
    currentCount: 1000,
    maxAllowed: 1000,
  });
  let started!: () => void;
  let release!: () => void;
  const parsing = new Promise<void>((resolve) => {
    started = resolve;
  });
  const finish = new Promise<void>((resolve) => {
    release = resolve;
  });
  jest.mocked(extractReceiptFromFile).mockImplementationOnce(async () => {
    started();
    await finish;
    return {
      transaction: receipt,
      tokenUsage: { inputTokens: 80, outputTokens: 20 },
    };
  });
  const mobileRequest = f.rest(input, { "x-app-id": "beancount-mobile" });
  try {
    // Hold the mobile model call open so the web check runs while it is in flight.
    await Promise.race([
      parsing,
      mobileRequest.then(() => {
        throw new Error("Mobile request finished before extraction");
      }),
    ]);
    const webHeaders: Record<string, string>[] = [
      {},
      { "x-app-id": "unknown-app" },
    ];
    for (const headers of webHeaders) {
      const response = await f.rest(input, headers);
      expect(response.status).toBe(403);
      await response.text();
    }
    expect(f.metadata).toHaveBeenCalledTimes(1);
    expect(extractReceiptFromFile).toHaveBeenCalledTimes(1);
    expect(f.charge).not.toHaveBeenCalled();
    release();
    const response = await mobileRequest;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...receipt, ...recommendation });
    const later = await f.rest();
    expect(later.status).toBe(403);
    await later.text();
    expect(f.check).toHaveBeenCalledTimes(3);
    expect(f.charge).toHaveBeenCalledTimes(1);
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 140);
  } finally {
    release();
    await Promise.allSettled([
      mobileRequest.then((response) =>
        response.bodyUsed ? undefined : response.text(),
      ),
    ]);
    await f.close();
  }
});
