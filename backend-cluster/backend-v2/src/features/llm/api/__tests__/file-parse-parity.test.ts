import { requestPlatform } from "@/server/api/request-platform";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("../../utils/extract-transactions-from-file", () => ({
  extractTransactionsFromFile: jest.fn(),
}));
jest.mock("../../utils/call-llm", () => ({ callLLM: jest.fn() }));
import { extractTransactionsFromFile } from "../../utils/extract-transactions-from-file";
import { callLLM } from "../../utils/call-llm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
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
const input = { s3ObjectKey: "tmp/usr_alice/statement.csv", fileFormat: "csv" };
const rows = [
  {
    date: "2026-09-01",
    payee: "Café",
    description: "Breakfast",
    amount: -12.34,
  },
  {
    date: "2026-09-02",
    payee: "Employer",
    description: "Salary",
    amount: 4567.89,
  },
];
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
  jest.mocked(callLLM).mockReset();
  jest.mocked(extractTransactionsFromFile).mockReset();
  jest.mocked(extractTransactionsFromFile).mockResolvedValue({
    transactions: rows,
    tokenUsage: { inputTokens: 80, outputTokens: 20 },
  });
});

it("grounds actual model descriptions identically through REST, GraphQL, and MCP without changing public rows or charges", async () => {
  jest
    .mocked(extractTransactionsFromFile)
    .mockImplementation(
      jest.requireActual<
        typeof import("../../utils/extract-transactions-from-file")
      >("../../utils/extract-transactions-from-file")
        .extractTransactionsFromFile,
    );
  const source = [
    "Date,Payee,Description,Amount",
    "2026-10-01,QA Synthetic Grocer,,-23.10",
    "2026-10-02,QA Synthetic Payroll,QA Synthetic Gehalt,500.00",
    "2026-10-03,QA Synthetic Bäckerei,Café Frühstück,-5.50",
    "",
  ].join("\n");
  const modelRows = [
    {
      date: "2026-10-01",
      payee: "QA Synthetic Grocer",
      description: "Grocery purchase",
      amount: -23.1,
    },
    {
      date: "2026-10-02",
      payee: "QA Synthetic Payroll",
      description: "Salary payment",
      amount: 500,
    },
    {
      date: "2026-10-03",
      payee: "QA Synthetic Bäckerei",
      description: " Café Frühstück ",
      amount: -5.5,
    },
  ];
  const expectedRows = [
    { ...modelRows[0], description: "" },
    { ...modelRows[1], description: "" },
    { ...modelRows[2], description: "Café Frühstück" },
  ];
  jest.mocked(callLLM).mockResolvedValue({
    transactions: modelRows,
    tokenUsage: { inputTokens: 80, outputTokens: 20 },
  });
  const nativeFetch = global.fetch;
  const fetchFile = jest
    .spyOn(global, "fetch")
    .mockImplementation((url, init) => {
      if (String(url) === "https://storage.invalid/fixture") {
        return Promise.resolve(
          new Response(source, { headers: { "content-type": "text/csv" } }),
        );
      }
      return nativeFetch(url, init);
    });
  const f = await fixture();
  try {
    const r = await f.rest();
    const g = await f.gql();
    const m = await f.mcp();
    expect(r.status).toBe(200);
    expect(g.errors).toBeUndefined();
    expect(m.isError).not.toBe(true);
    expect(await r.json()).toEqual({ rows: expectedRows });
    expect(g.data!.parseFile).toEqual({ rows: expectedRows });
    expect(m.structuredContent).toEqual({
      ok: true,
      result: { rows: expectedRows },
    });
    expect(callLLM).toHaveBeenCalledTimes(3);
    expect(
      fetchFile.mock.calls.filter(
        ([url]) => String(url) === "https://storage.invalid/fixture",
      ),
    ).toHaveLength(3);
    expect(f.metadata).toHaveBeenCalledTimes(3);
    expect(f.charge).toHaveBeenCalledTimes(3);
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 100);
  } finally {
    await f.close();
    fetchFile.mockRestore();
  }
});

async function fixture(caller = identity, appId?: string) {
  const headers: Record<string, string> = appId ? { "x-app-id": appId } : {};
  const platform = requestPlatform(headers);
  const metadata = jest.fn(async () => ({ contentType: "text/csv" }));
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
  const service = new LLMService(
    {} as never,
    { getObjectMetadata: metadata, generateDownloadUrl: download } as never,
    { check, addTokenUsage: charge } as never,
    { blockeden: { accessKey: "fixture" } } as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
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
  const client = new Client({ name: "file-parse-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    check,
    charge,
    metadata,
    download,
    rest: (body: unknown = input) =>
      fetch(`${rest.url}/api-gateway/v1/import/parse-file`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      }),
    gql: (
      args: Record<string, unknown> = input,
      source = "mutation($s3ObjectKey:String!,$fileFormat:String!) { parseFile(s3ObjectKey:$s3ObjectKey,fileFormat:$fileFormat) { rows { date payee description amount } } }",
    ) =>
      graphql({
        schema,
        source,
        variableValues: args,
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform,
        },
      }),
    mcp: (args: Record<string, unknown> = input) =>
      client.callTool({ name: "parseFile", arguments: args }),
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
])("returns full rows and charges the actor with %j", async (caller) => {
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
      g.data!.parseFile,
      (m.structuredContent as { result: unknown }).result,
    ])
      expect(result).toEqual({ rows });
    expect(f.charge).toHaveBeenCalledTimes(3);
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 100);
    expect(extractTransactionsFromFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrl: "https://storage.invalid/fixture",
        format: "csv",
        mediaType: "text/csv",
      }),
    );
  } finally {
    await f.close();
  }
});

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
      expect(extractTransactionsFromFile).not.toHaveBeenCalled();
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
      expect(extractTransactionsFromFile).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

// w21/325: a HEIC statement photo reached the model and failed there as a
// generic parse error; only receipts had the format allowlist.
it("refuses a HEIC statement as bad input naming the formats, before the model, on every surface", async () => {
  const f = await fixture();
  f.metadata.mockResolvedValue({ contentType: "image/heic" });
  try {
    const r = await f.rest();
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: {
        code: "BAD_USER_INPUT",
        message: expect.stringContaining("JPEG, PNG, GIF, WEBP"),
      },
    });
    const g = await f.gql();
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringContaining("JPEG, PNG, GIF, WEBP"),
    });
    const m = await f.mcp();
    expect(m.isError).toBe(true);
    expect(
      (m.structuredContent as { error: { code: string } }).error.code,
    ).toBe("BAD_USER_INPUT");
    expect(f.download).not.toHaveBeenCalled();
    expect(extractTransactionsFromFile).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

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
    expect(extractTransactionsFromFile).not.toHaveBeenCalled();
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
      .mocked(extractTransactionsFromFile)
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
        g.data!.parseFile,
        (m.structuredContent as { result: unknown }).result,
      ]) {
        expect(result).toEqual({ rows });
      }
      expect(f.check).not.toHaveBeenCalled();
      expect(f.charge).toHaveBeenCalledTimes(3);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 100);
    } finally {
      await f.close();
    }
  },
);

// w23/m11/t002: every key spelling works at every input.
it.each(["objectKey", "receiptObjectKey"])(
  "accepts the %s twin on every surface",
  async (twin) => {
    const f = await fixture();
    try {
      const r = await f.rest({ [twin]: input.s3ObjectKey, fileFormat: "csv" });
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ rows });
      const g = await f.gql(
        { key: input.s3ObjectKey, fileFormat: "csv" },
        `mutation($key:String!,$fileFormat:String!) { parseFile(${twin}:$key,fileFormat:$fileFormat) { rows { date payee description amount } } }`,
      );
      expect(g.errors).toBeUndefined();
      expect(g.data!.parseFile).toEqual({ rows });
      const m = await f.mcp({ [twin]: input.s3ObjectKey, fileFormat: "csv" });
      expect(m.isError).not.toBe(true);
      expect((m.structuredContent as { result: unknown }).result).toEqual({
        rows,
      });
    } finally {
      await f.close();
    }
  },
);

it("refuses two different keys as bad input on every surface", async () => {
  const f = await fixture();
  const other = "tmp/usr_alice/other.csv";
  try {
    const r = await f.rest({
      s3ObjectKey: input.s3ObjectKey,
      objectKey: other,
      fileFormat: "csv",
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    const g = await f.gql(
      { a: input.s3ObjectKey, b: other, fileFormat: "csv" },
      "mutation($a:String!,$b:String!,$fileFormat:String!) { parseFile(s3ObjectKey:$a,receiptObjectKey:$b,fileFormat:$fileFormat) { rows { date } } }",
    );
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    const m = await f.mcp({
      s3ObjectKey: input.s3ObjectKey,
      objectKey: other,
      fileFormat: "csv",
    });
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    expect(f.check).not.toHaveBeenCalled();
    expect(f.metadata).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses a missing key as bad input on every surface", async () => {
  const f = await fixture();
  try {
    const r = await f.rest({ fileFormat: "csv" });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    const g = await f.gql(
      { fileFormat: "csv" },
      "mutation($fileFormat:String!) { parseFile(fileFormat:$fileFormat) { rows { date } } }",
    );
    expect(g.errors?.[0].originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    const m = await f.mcp({ fileFormat: "csv" });
    expect(m.isError).toBe(true);
    expect(m.structuredContent).toMatchObject({
      error: { code: "BAD_USER_INPUT" },
    });
    expect(f.check).not.toHaveBeenCalled();
    expect(f.metadata).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
