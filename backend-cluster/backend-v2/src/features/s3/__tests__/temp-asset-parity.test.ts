import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn() }));
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { AssetStorageResolver } from "../api/asset-storage-resolver";
import { AssetStorageService } from "../service/asset-storage-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig, AssetS3Config } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const service = new AssetStorageService(
  {
    region: "us-east-1",
    bucket: "fixture",
    accessKeyId: "fixture",
    secretAccessKey: "fixture",
    uploadUrlExpiration: 300,
    downloadUrlExpiration: 600,
  } as AssetS3Config,
  new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ),
  ),
);
const resolver = new AssetStorageResolver(service);
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [AssetStorageResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});
beforeEach(() => {
  jest.mocked(getSignedUrl).mockReset();
  jest
    .mocked(getSignedUrl)
    .mockImplementation(async (_client, command) =>
      command instanceof PutObjectCommand
        ? "https://storage.invalid/upload"
        : "https://storage.invalid/download",
    );
});

async function fixture(caller = identity) {
  const rest = await startV1TestServer(
    { services: { assetStorage: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    { identity: caller, assetStorage: service } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "temp-asset-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    rest: (path: string, body?: unknown) =>
      fetch(
        `${rest.url}/api-gateway/v1/temp-assets/${path}`,
        body === undefined
          ? {}
          : {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            },
      ),
    gql: (source: string, variableValues?: Record<string, unknown>) =>
      graphql({
        schema,
        source,
        variableValues,
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
  identity,
  { ...identity, scopes: new Set(["ledger.read"]), ledgerScope: undefined },
])(
  "preserves upload metadata, key ownership, and download expiry across all adapters with %j",
  async (caller) => {
    const f = await fixture(caller);
    try {
      const body = { filename: "receipt.pdf", mimeType: "application/pdf" };
      const r = await f.rest("upload-url", body);
      expect(r.status).toBe(200);
      const g = await f.gql(
        'mutation { generateTempAssetUploadUrl(filename:"receipt.pdf",mimeType:"application/pdf") { uploadUrl objectKey expiresIn } }',
      );
      expect(g.errors).toBeUndefined();
      const m = await f.client.callTool({
        name: "generateTempAssetUploadUrl",
        arguments: body,
      });
      expect(m.isError).not.toBe(true);
      const uploads = [
        await r.json(),
        g.data!.generateTempAssetUploadUrl,
        (m.structuredContent as { result: unknown }).result,
      ] as { uploadUrl: string; objectKey: string; expiresIn: number }[];
      for (const upload of uploads) {
        expect(upload).toMatchObject({
          uploadUrl: "https://storage.invalid/upload",
          expiresIn: 300,
          objectKey: expect.stringMatching(/^tmp\/usr_alice\/.+\.pdf$/),
        });
      }
      for (const [, command, options] of jest.mocked(getSignedUrl).mock.calls) {
        expect(command.input).toMatchObject({
          Bucket: "fixture",
          ContentType: "application/pdf",
        });
        expect(options).toMatchObject({ expiresIn: 300 });
      }
      const objectKey = uploads[0]!.objectKey;
      const rd = await f.rest(
        `download-url?objectKey=${encodeURIComponent(objectKey)}`,
      );
      const gd = await f.gql(
        "query($key:String!) { generateTempAssetDownloadUrl(objectKey:$key) { downloadUrl expiresIn } }",
        { key: objectKey },
      );
      const md = await f.client.readResource({
        uri: `beancount://temp-assets/download-url?objectKey=${encodeURIComponent(objectKey)}`,
      });
      expect(rd.status).toBe(200);
      expect(gd.errors).toBeUndefined();
      const content = md.contents[0];
      if (!content || !("text" in content))
        throw new Error("Expected text resource");
      for (const result of [
        await rd.json(),
        gd.data!.generateTempAssetDownloadUrl,
        JSON.parse(content.text),
      ])
        expect(result).toEqual({
          downloadUrl: "https://storage.invalid/download",
          expiresIn: 600,
        });
    } finally {
      await f.close();
    }
  },
);

it.each([
  "tmp/usr_other/receipt.pdf",
  "assets/usr_alice/receipt.pdf",
  "tmp/usr_alice/",
  "garbage",
])("refuses foreign or malformed key %s without signing", async (key) => {
  const f = await fixture();
  try {
    const rest = await f.rest(
      `download-url?objectKey=${encodeURIComponent(key)}`,
    );
    expect(rest.status).toBe(404);
    const gql = await f.gql(
      "query($key:String!) { generateTempAssetDownloadUrl(objectKey:$key) { downloadUrl } }",
      { key },
    );
    expect(gql.errors).toHaveLength(1);
    await expect(
      f.client.readResource({
        uri: `beancount://temp-assets/download-url?objectKey=${encodeURIComponent(key)}`,
      }),
    ).rejects.toThrow();
    expect(getSignedUrl).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses upload with a scopeless credential on every surface", async () => {
  const f = await fixture({ ...identity, scopes: new Set() });
  try {
    expect((await f.rest("upload-url", {})).status).toBe(403);
    expect(
      (await f.gql("mutation { generateTempAssetUploadUrl { objectKey } }"))
        .errors,
    ).toHaveLength(1);
    expect(
      (
        await f.client.callTool({
          name: "generateTempAssetUploadUrl",
          arguments: {},
        })
      ).isError,
    ).toBe(true);
    expect(getSignedUrl).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
