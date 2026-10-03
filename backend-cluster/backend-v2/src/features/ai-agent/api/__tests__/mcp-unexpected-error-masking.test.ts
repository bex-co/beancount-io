import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { NotFoundError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * ADR 0007 D7 through the real registry (w5/028): in production a tool call or
 * a resource read that fails unexpectedly tells the caller "Internal server
 * error", while a failure written for the caller keeps its words.
 */
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
  tokenId: "tok_masking",
};
const LEAK = 'select * from "public_keys" where id = $1 -- params: 7';

async function connect(env: string, failure: Error) {
  const publicKeyService = {
    deletePublicKey: jest.fn().mockRejectedValue(failure),
    getPublicKey: jest.fn().mockRejectedValue(failure),
  };
  const server = assembleMcpRegistry(
    { identity, publicKeyService } as unknown as McpRequestContext,
    { env, api: { scopeEnforcement: "enforce" } } as AppConfig,
  );
  const client = new Client({ name: "masking", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    call: () =>
      client.callTool({
        name: "managePublicKeys",
        arguments: { operation: "delete", keyId: 7 },
      }),
    read: () =>
      client.readResource({ uri: "beancount://account/public-key?keyId=7" }),
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("MCP masks unexpected errors in production", () => {
  it("replaces an unexpected failure's message on a tool call and a resource read", async () => {
    const f = await connect("production", new Error(LEAK));
    try {
      const result = await f.call();
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      });
      expect(JSON.stringify(result)).not.toContain("public_keys");
      const refusal = await f.read().catch((error: unknown) => error);
      expect(refusal).toMatchObject({
        code: -32000,
        data: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      });
      expect(String((refusal as Error).message)).not.toContain("public_keys");
    } finally {
      await f.close();
    }
  });

  it("keeps the message outside production", async () => {
    const f = await connect("development", new Error(LEAK));
    try {
      expect((await f.call()).structuredContent).toMatchObject({
        error: { code: "INTERNAL_SERVER_ERROR", message: LEAK },
      });
      await expect(f.read()).rejects.toMatchObject({
        data: { message: LEAK },
      });
    } finally {
      await f.close();
    }
  });

  it("keeps a failure written for the caller in production", async () => {
    const f = await connect("production", new NotFoundError("Public key", "7"));
    try {
      const result = await f.call();
      expect(result.structuredContent).toMatchObject({
        error: { code: "NOT_FOUND" },
      });
      expect(JSON.stringify(result.structuredContent)).toContain("Public key");
      await expect(f.read()).rejects.toMatchObject({
        code: -32002,
        data: { code: "NOT_FOUND" },
      });
    } finally {
      await f.close();
    }
  });
});
