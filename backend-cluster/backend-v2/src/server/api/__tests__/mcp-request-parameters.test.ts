import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  CallToolResultSchema,
  McpError,
  ResultSchema,
  type Request,
} from "@modelcontextprotocol/sdk/types.js";
import { assembleMcpRegistry } from "../composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity = {
  userId: "usr_1",
  method: "api_key",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  ledgerScope: "alice/main",
};

async function withClient(
  run: (fixture: {
    client: Client;
    domainAccess: jest.Mock;
    queryShellText: jest.Mock;
    listLedgers: jest.Mock;
  }) => Promise<void>,
) {
  const domainAccess = jest.fn();
  const queryShellText = jest
    .fn()
    .mockResolvedValue({ text: "Assets:Cash 1 USD" });
  const listLedgers = jest.fn().mockResolvedValue([{ fullName: "alice/main" }]);
  const context = new Proxy(
    {
      identity,
      ledgerId: "alice/main",
      services: { ledgerShell: { queryShellText } },
      ledgerWorkflow: { listLedgers },
    },
    {
      get(target, key, receiver) {
        if (key !== "identity" && key !== "ledgerId") domainAccess(key);
        return Reflect.get(target, key, receiver);
      },
    },
  ) as unknown as McpRequestContext;
  const server = assembleMcpRegistry(context, config);
  const client = new Client({ name: "request-parameters", version: "1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    await run({ client, domainAccess, queryShellText, listLedgers });
  } finally {
    await client.close();
    await server.close();
  }
}

// Intentionally bypass only TypeScript's request types. The real Client and
// registry still dispatch and validate the malformed request over the wire.
function request(method: string, params?: unknown): Request {
  return { method, ...(params !== undefined && { params }) } as Request;
}

function expectInputEnvelope(envelope: unknown, field: string) {
  expect(envelope).toMatchObject({
    code: "BAD_USER_INPUT",
    message: expect.stringContaining(field),
    hint: expect.any(String),
  });
  const { message, hint } = envelope as { message: string; hint: string };
  expect(hint.trim()).not.toBe("");
  expect(message.length).toBeLessThan(400);
  expect(message).not.toContain('"path":');
  expect(message).not.toContain('"expected":');
}

describe("MCP outer request parameters over SDK dispatch (w6/001)", () => {
  it.each([null, [], "BALANCES", 42])(
    "named tool arguments %j use the coded tool failure without domain work",
    async (argumentsValue) => {
      await withClient(async (f) => {
        const result = await f.client.request(
          request("tools/call", {
            name: "runBqlQuery",
            arguments: argumentsValue,
          }),
          CallToolResultSchema,
        );
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({ ok: false });
        const error = (result.structuredContent as { error: unknown }).error;
        expectInputEnvelope(error, "arguments");
        expect(result.content).toEqual([
          expect.objectContaining({
            type: "text",
            text: expect.stringContaining("BAD_USER_INPUT: "),
          }),
        ]);
        expect(f.domainAccess).not.toHaveBeenCalled();
        expect(f.queryShellText).not.toHaveBeenCalled();
        expect(f.listLedgers).not.toHaveBeenCalled();
      });
    },
  );

  const invalidMethodRequests = [
    ...["tools/call", "resources/read", "prompts/get"].map((method) => ({
      method,
      params: undefined,
      field: "params",
    })),
    ...["tools/call", "prompts/get"].flatMap((method) =>
      [{}, { name: null }, { name: 42 }].map((params) => ({
        method,
        params,
        field: "name",
      })),
    ),
    { method: "resources/read", params: { uri: 42 }, field: "uri" },
    { method: "resources/read", params: {}, field: "uri" },
    {
      method: "prompts/get",
      params: { name: "close-month", arguments: null },
      field: "arguments",
    },
    {
      method: "prompts/get",
      params: { name: "close-month", arguments: { month: 42 } },
      field: "month",
    },
    {
      method: "tools/call",
      params: {
        name: "runBqlQuery",
        arguments: null,
        task: { ttl: "later" },
      },
      field: "task.ttl",
    },
  ];

  it.each(invalidMethodRequests)(
    "$method $params refuses method-level $field with -32602 and no domain work",
    async ({ method, params, field }) => {
      await withClient(async (f) => {
        const error = await f.client
          .request(request(method, params), ResultSchema)
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(-32602);
        expectInputEnvelope((error as McpError).data, field);
        expect((error as McpError).message.match(/MCP error/g)).toHaveLength(1);
        expect(f.domainAccess).not.toHaveBeenCalled();
        expect(f.queryShellText).not.toHaveBeenCalled();
        expect(f.listLedgers).not.toHaveBeenCalled();
      });
    },
  );

  it("omitted optional tool arguments retain defaults and call the workflow once", async () => {
    await withClient(async (f) => {
      const result = await f.client.callTool({ name: "listLedgers" });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        ok: true,
        result: [{ fullName: "alice/main" }],
      });
      expect(f.listLedgers).toHaveBeenCalledTimes(1);
      expect(f.listLedgers).toHaveBeenCalledWith({
        identity,
        args: { page: undefined, limit: undefined },
      });
      expect(f.queryShellText).not.toHaveBeenCalled();
    });
  });

  it("a valid BQL tool still returns its result after one domain call", async () => {
    await withClient(async (f) => {
      const result = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
      });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        ok: true,
        result: "Assets:Cash 1 USD",
      });
      expect(f.queryShellText).toHaveBeenCalledTimes(1);
      expect(f.listLedgers).not.toHaveBeenCalled();
    });
  });

  it("omitted and valid prompt arguments and a public resource remain usable", async () => {
    await withClient(async (f) => {
      const omitted = await f.client.getPrompt({ name: "close-month" });
      const supplied = await f.client.getPrompt({
        name: "close-month",
        arguments: { month: "2026-08" },
      });
      expect(omitted.messages[0].content).toMatchObject({
        type: "text",
        text: expect.any(String),
      });
      expect(supplied.messages[0].content).toMatchObject({
        type: "text",
        text: expect.stringContaining("2026-08"),
      });
      const health = await f.client.readResource({
        uri: "beancount://configuration/health",
      });
      expect(health.contents).toEqual([
        expect.objectContaining({
          uri: "beancount://configuration/health",
          mimeType: "application/json",
          text: '"OK"',
        }),
      ]);
      expect(f.domainAccess).not.toHaveBeenCalled();
    });
  });
});
