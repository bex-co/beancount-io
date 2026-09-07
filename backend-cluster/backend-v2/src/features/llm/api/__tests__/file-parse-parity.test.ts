import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("../../utils/extract-transactions-from-file", () => ({
  extractTransactionsFromFile: jest.fn(),
}));
import { extractTransactionsFromFile } from "../../utils/extract-transactions-from-file";
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
  jest.mocked(extractTransactionsFromFile).mockReset();
  jest.mocked(extractTransactionsFromFile).mockResolvedValue({
    transactions: rows,
    tokenUsage: { inputTokens: 80, outputTokens: 20 },
  });
});

async function fixture(caller = identity) {
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
    { identity: caller, llmService: service } as unknown as McpRequestContext,
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    gql: (args = input) =>
      graphql({
        schema,
        source:
          "mutation($s3ObjectKey:String!,$fileFormat:String!) { parseFile(s3ObjectKey:$s3ObjectKey,fileFormat:$fileFormat) { rows { date payee description amount } } }",
        variableValues: args,
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
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

it.each([
  "tmp/usr_other/statement.csv",
  "assets/usr_alice/statement.csv",
  "tmp/usr_alice/",
])(
  "rejects unowned key %s before storage or provider access",
  async (s3ObjectKey) => {
    const f = await fixture();
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

it("refuses missing read capability before quota or storage access", async () => {
  const f = await fixture({ ...identity, scopes: new Set() });
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

it("propagates provider failure without charging a successful parse", async () => {
  const f = await fixture();
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
});
