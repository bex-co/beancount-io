import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  CallToolResultSchema,
  InitializeResultSchema,
  LATEST_PROTOCOL_VERSION,
  McpError,
  ResultSchema,
  type Request,
} from "@modelcontextprotocol/sdk/types.js";
import { assembleMcpRegistry } from "../composition-root";
import { ARGUMENT_LIMITS } from "@/shared/argument-limits";
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
  appConfig: AppConfig = config,
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
  const server = assembleMcpRegistry(context, appConfig);
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
      method: "prompts/get",
      params: {
        name: "close-month",
        arguments: { month: "2026-08", bogus: "x" },
      },
      field: "bogus",
    },
    ...[
      "tools/list",
      "resources/list",
      "resources/templates/list",
      "prompts/list",
    ].flatMap((method) =>
      [{ cursor: 123 }, { cursor: null }, { cursor: {} }].map((params) => ({
        method,
        params,
        field: "cursor",
      })),
    ),
    {
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {} },
      field: "clientInfo",
    },
    {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: 5,
        clientInfo: { name: "request-parameters", version: "1" },
      },
      field: "capabilities",
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

  it.each([
    "tools/list",
    "resources/list",
    "resources/templates/list",
    "prompts/list",
  ])("%s still lists, with or without a string cursor", async (method) => {
    await withClient(async (f) => {
      for (const params of [undefined, {}, { cursor: "bogus" }]) {
        await expect(
          f.client.request(request(method, params), ResultSchema),
        ).resolves.toBeDefined();
      }
    });
  });

  it("omitted optional tool arguments retain defaults and call the workflow once", async () => {
    await withClient(async (f) => {
      const result = await f.client.callTool({ name: "listLedgers" });
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({
        ok: true,
        result: [{ fullName: "alice/main" }],
        // No page or limit: every ledger came back, so nothing more remains.
        page: { returned: 1, page: 1, hasMore: false },
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

  it("an unknown prompt argument refuses in the tools dialect (w23/117)", async () => {
    await withClient(async (f) => {
      const error = await f.client
        .request(
          request("prompts/get", {
            name: "close-month",
            arguments: { month: "2026-08", bogus: "x" },
          }),
          ResultSchema,
        )
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(McpError);
      expect((error as McpError).code).toBe(-32602);
      expect((error as McpError).data).toMatchObject({
        code: "BAD_USER_INPUT",
        message: 'Unrecognized key: "bogus"',
        hint: expect.any(String),
      });
      expect(f.domainAccess).not.toHaveBeenCalled();
    });
  });

  it("a valid initialize negotiates exactly like the SDK (w23/118)", async () => {
    await withClient(async (f) => {
      const current = await f.client.request(
        request("initialize", {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "request-parameters", version: "1" },
        }),
        InitializeResultSchema,
      );
      expect(current.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
      expect(current.serverInfo).toEqual({
        name: "beancount-mcp",
        version: "1.0.0",
      });
      expect(current.capabilities.tools).toBeDefined();
      // Stateless and POST-only: no list-changed notification can ever be
      // sent, so none is advertised (w1/196).
      for (const primitive of ["tools", "resources", "prompts"] as const)
        expect(current.capabilities[primitive]).toMatchObject({
          listChanged: false,
        });
      expect(f.client.getServerCapabilities()?.tools?.listChanged).toBe(false);
      expect(current.instructions).toEqual(expect.any(String));
      const ancient = await f.client.request(
        request("initialize", {
          protocolVersion: "1999-01-01",
          capabilities: {},
          clientInfo: { name: "request-parameters", version: "1" },
        }),
        InitializeResultSchema,
      );
      expect(ancient.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
      expect(f.domainAccess).not.toHaveBeenCalled();
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

function nestedObject(depth: number): Record<string, unknown> {
  let current: Record<string, unknown> = { leaf: "ok" };
  for (let i = 0; i < depth; i++) {
    current = { nested: current };
  }
  return current;
}

describe("MCP protocol handler argument limits (w31/079)", () => {
  const overLimitString = "x".repeat(ARGUMENT_LIMITS.maxStringLength + 1);
  const overLimitArray = new Array<string>(
    ARGUMENT_LIMITS.maxArrayLength + 1,
  ).fill("x");
  const overDepthObject = nestedObject(ARGUMENT_LIMITS.maxDepth + 1);

  const listMethods = [
    "tools/list",
    "resources/list",
    "resources/templates/list",
    "prompts/list",
  ] as const;

  const rejectedCases: {
    label: string;
    method: string;
    params: unknown;
    field: string;
  }[] = [
    // initialize
    {
      label: "initialize clientInfo.name with NUL",
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "a\u0000b", version: "1" },
      },
      field: "clientInfo.name",
    },
    {
      label: "initialize clientInfo.name with unpaired surrogate",
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "a\ud800b", version: "1" },
      },
      field: "clientInfo.name",
    },
    {
      label: "initialize clientInfo.name over 1 MiB",
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: overLimitString, version: "1" },
      },
      field: "clientInfo.name",
    },
    {
      label: "initialize capabilities.experimental nested past maxDepth",
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: { experimental: overDepthObject },
        clientInfo: { name: "test", version: "1" },
      },
      field: "capabilities.experimental",
    },
    {
      label: "initialize capabilities.experimental array past maxArrayLength",
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: { experimental: { items: overLimitArray } },
        clientInfo: { name: "test", version: "1" },
      },
      field: "capabilities.experimental.items",
    },
    // */list
    ...listMethods.flatMap((method) => [
      {
        label: `${method} cursor with NUL`,
        method,
        params: { cursor: "a\u0000b" },
        field: "cursor",
      },
      {
        label: `${method} cursor with unpaired surrogate`,
        method,
        params: { cursor: "a\ud800b" },
        field: "cursor",
      },
      {
        label: `${method} cursor over 1 MiB`,
        method,
        params: { cursor: overLimitString },
        field: "cursor",
      },
      {
        label: `${method} extra field nested past maxDepth`,
        method,
        params: { extra: overDepthObject },
        field: "extra",
      },
      {
        label: `${method} extra array past maxArrayLength`,
        method,
        params: { extra: overLimitArray },
        field: "extra",
      },
    ]),
    // ping
    {
      label: "ping params with NUL",
      method: "ping",
      params: { a: "x\u0000y" },
      field: "params.a",
    },
    {
      label: "ping params with unpaired surrogate",
      method: "ping",
      params: { a: "x\ud800y" },
      field: "params.a",
    },
    {
      label: "ping params over 1 MiB",
      method: "ping",
      params: { a: overLimitString },
      field: "params.a",
    },
    {
      label: "ping params nested past maxDepth",
      method: "ping",
      params: { extra: overDepthObject },
      field: "params.extra",
    },
    {
      label: "ping params array past maxArrayLength",
      method: "ping",
      params: { extra: overLimitArray },
      field: "params.extra",
    },
    {
      label: "ping _meta with NUL",
      method: "ping",
      params: { _meta: { progressToken: "a\u0000b" } },
      field: "params._meta.progressToken",
    },
    // tools/call outer params
    {
      label: "tools/call task with NUL",
      method: "tools/call",
      params: {
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
        task: { ttl: "a\u0000b" },
      },
      field: "params.task.ttl",
    },
    {
      label: "tools/call name with NUL",
      method: "tools/call",
      params: { name: "runBqlQuery\u0000", arguments: {} },
      field: "params.name",
    },
    {
      label: "tools/call name with unpaired surrogate",
      method: "tools/call",
      params: { name: "runBqlQuery\ud800", arguments: {} },
      field: "params.name",
    },
    {
      label: "tools/call name over 1 MiB",
      method: "tools/call",
      params: { name: overLimitString, arguments: {} },
      field: "params.name",
    },
    {
      label: "tools/call _meta with NUL",
      method: "tools/call",
      params: {
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
        _meta: { progressToken: "a\u0000b" },
      },
      field: "params._meta",
    },
    {
      label: "tools/call _meta nested past maxDepth",
      method: "tools/call",
      params: {
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
        _meta: overDepthObject,
      },
      field: "params._meta",
    },
    {
      label: "tools/call _meta array past maxArrayLength",
      method: "tools/call",
      params: {
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
        _meta: { items: overLimitArray },
      },
      field: "params._meta.items",
    },
    // prompts/get outer params
    {
      label: "prompts/get name with NUL",
      method: "prompts/get",
      params: { name: "close-month\u0000", arguments: {} },
      field: "params.name",
    },
    {
      label: "prompts/get name with unpaired surrogate",
      method: "prompts/get",
      params: { name: "close-month\ud800", arguments: {} },
      field: "params.name",
    },
    {
      label: "prompts/get name over 1 MiB",
      method: "prompts/get",
      params: { name: overLimitString, arguments: {} },
      field: "params.name",
    },
    {
      label: "prompts/get _meta with NUL",
      method: "prompts/get",
      params: {
        name: "close-month",
        arguments: {},
        _meta: { progressToken: "a\u0000b" },
      },
      field: "params._meta",
    },
    {
      label: "prompts/get _meta nested past maxDepth",
      method: "prompts/get",
      params: {
        name: "close-month",
        arguments: {},
        _meta: overDepthObject,
      },
      field: "params._meta",
    },
    {
      label: "prompts/get _meta array past maxArrayLength",
      method: "prompts/get",
      params: {
        name: "close-month",
        arguments: {},
        _meta: { items: overLimitArray },
      },
      field: "params._meta.items",
    },
    // resources/read _meta
    {
      label: "resources/read _meta with NUL",
      method: "resources/read",
      params: {
        uri: "beancount://configuration/health",
        _meta: { progressToken: "a\u0000b" },
      },
      field: "params._meta",
    },
    {
      label: "resources/read _meta nested past maxDepth",
      method: "resources/read",
      params: {
        uri: "beancount://configuration/health",
        _meta: overDepthObject,
      },
      field: "params._meta",
    },
  ];

  it.each(rejectedCases)(
    "refuses $label as -32602 BAD_USER_INPUT without domain work",
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

  it("keeps valid UTF-8, paired-surrogate emoji, ping, unknown names, and exempt file-text working", async () => {
    await withClient(async (f) => {
      // Valid initialize with emoji and normal experimental capabilities.
      const init = await f.client.request(
        request("initialize", {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: { experimental: { probe: { enabled: true } } },
          clientInfo: { name: "Café ☕ 😀", version: "1.0" },
        }),
        InitializeResultSchema,
      );
      expect(init.serverInfo.name).toBe("beancount-mcp");

      // Valid */list with UTF-8 / paired-surrogate emoji cursor.
      for (const method of listMethods) {
        await expect(
          f.client.request(
            request(method, { cursor: "cursor-😀-café" }),
            ResultSchema,
          ),
        ).resolves.toBeDefined();
      }

      // Valid ping with absent, empty, and UTF-8 / emoji params.
      for (const params of [
        undefined,
        {},
        { _meta: { progressToken: "ping-😀" } },
      ]) {
        await expect(
          f.client.request(request("ping", params), ResultSchema),
        ).resolves.toEqual({});
      }

      // Well-formed unknown tool name still returns NOT_FOUND.
      const unknownTool = await f.client.callTool({
        name: "noSuchTool😀",
        arguments: {},
      });
      expect(unknownTool.isError).toBe(true);
      expect(unknownTool.structuredContent).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });

      // Well-formed unknown prompt name still returns -32002 NOT_FOUND.
      const unknownPrompt = await f.client
        .getPrompt({ name: "no-such-prompt-😀", arguments: {} })
        .catch((caught: unknown) => caught);
      expect(unknownPrompt).toBeInstanceOf(McpError);
      expect((unknownPrompt as McpError).code).toBe(-32002);
      expect((unknownPrompt as McpError).data).toMatchObject({
        code: "NOT_FOUND",
      });

      // NUL_EXEMPT_PATHS (`query`) still allows NUL inside tool arguments.
      const bqlWithNul = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query: "SELECT 'a\u0000b'" },
      });
      expect(bqlWithNul.isError).toBeUndefined();
      expect(f.queryShellText).toHaveBeenCalledTimes(1);
    });
  });
});

describe("MCP task-augmented requests (w31/080)", () => {
  const validMethodBaseParams: {
    method: string;
    baseParams: Record<string, unknown>;
  }[] = [
    {
      method: "tools/call",
      baseParams: { name: "listLedgers", arguments: {} },
    },
    {
      method: "resources/read",
      baseParams: { uri: "beancount://configuration/health" },
    },
    {
      method: "prompts/get",
      baseParams: { name: "close-month", arguments: {} },
    },
    {
      method: "initialize",
      baseParams: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "request-parameters", version: "1" },
      },
    },
    { method: "tools/list", baseParams: {} },
    { method: "resources/list", baseParams: {} },
    { method: "resources/templates/list", baseParams: {} },
    { method: "prompts/list", baseParams: {} },
    { method: "ping", baseParams: {} },
  ];

  const taskPayloads: { label: string; task: Record<string, unknown> }[] = [
    { label: "empty task {}", task: {} },
    { label: "task with ttl", task: { ttl: 60000 } },
    { label: "task with NUL in extra property", task: { extra: "\u0000" } },
  ];

  const taskCases = validMethodBaseParams.flatMap(({ method, baseParams }) =>
    taskPayloads.map(({ label, task }) => ({
      method,
      label,
      params: { ...baseParams, task },
    })),
  );

  it.each(taskCases)(
    "$method with $label refuses as -32602 BAD_USER_INPUT without domain work",
    async ({ method, params }) => {
      await withClient(async (f) => {
        const error = await f.client
          .request(request(method, params), ResultSchema)
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(-32602);
        expectInputEnvelope(mcpError.data, "params.task");
        const envelope = mcpError.data as {
          code: string;
          message: string;
          hint: string;
        };
        expect(envelope.message).toContain(method);
        expect(envelope.hint).toContain("params.task");
        expect(mcpError.message).toContain("BAD_USER_INPUT: ");
        expect(mcpError.message).toContain("\nHint: ");
        expect(mcpError.message.match(/MCP error/g)).toHaveLength(1);
        expect(f.domainAccess).not.toHaveBeenCalled();
        expect(f.queryShellText).not.toHaveBeenCalled();
        expect(f.listLedgers).not.toHaveBeenCalled();
      });
    },
  );

  it("keeps malformed params.task refusals, absent tasks capability, and unknown method -32601 intact", async () => {
    await withClient(async (f) => {
      for (const task of [null, "bad", { ttl: "later" }]) {
        const error = await f.client
          .request(
            request("tools/call", {
              name: "listLedgers",
              arguments: {},
              task,
            }),
            ResultSchema,
          )
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(-32602);
        expectInputEnvelope((error as McpError).data, "task");
        expect((error as McpError).message.match(/MCP error/g)).toHaveLength(1);
      }

      const init = await f.client.request(
        request("initialize", {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "request-parameters", version: "1" },
        }),
        InitializeResultSchema,
      );
      expect(init.capabilities.tasks).toBeUndefined();

      for (const method of ["tasks/list", "completion/complete"]) {
        const error = await f.client
          .request(request(method, { task: {} }), ResultSchema)
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(-32601);
      }

      expect(f.domainAccess).not.toHaveBeenCalled();
      expect(f.queryShellText).not.toHaveBeenCalled();
      expect(f.listLedgers).not.toHaveBeenCalled();
    });
  });
});

/**
 * w31/135. A misspelt key is the caller's mistake on both MCP paths that parse
 * arguments with Zod, and its echo is short and inert (w1/225): every control
 * character `\uXXXX`, the run cut at 120 with `…`. The bound used to run on
 * the issue array's JSON text before it was parsed, so a cut inside an escape
 * answered an unmasked INTERNAL_SERVER_ERROR dump, and ESC came back raw.
 */
describe("a misspelt argument key on MCP (w31/135)", () => {
  const production = { ...config, env: "production" } as AppConfig;
  const RAW_CONTROL = /(?![\t\n])\p{Cc}/u;
  const Z = (n: number) => "Z".repeat(n);
  const keys = [
    ["ESC", "\u001b[31mred", 'Unrecognized key: "\\u001b[31mred"'],
    ["CR", "a\rb", 'Unrecognized key: "a\\u000db"'],
    [
      "30 × BEL",
      `a${"\u0007".repeat(30)}`,
      `Unrecognized key: "a${"\\u0007".repeat(19)}\\u00…"`,
    ],
    [
      "a backslash at the cut",
      `${Z(118)}\\x`,
      `Unrecognized key: "${Z(118)}\\…"`,
    ],
    ["no escape near the cut", Z(300), `Unrecognized key: "${Z(119)}…"`],
  ] as const;

  it.each(keys)(
    "a tool refuses a key holding %s as BAD_USER_INPUT in production",
    async (_label, key, message) => {
      await withClient(async (f) => {
        const result = await f.client.callTool({
          name: "checkLedger",
          arguments: { ledger: "alice/main", [key]: 1 },
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          ok: false,
          error: { code: "BAD_USER_INPUT", message },
        });
        const [text] = result.content as { type: string; text: string }[];
        expect(text.text).toContain(`BAD_USER_INPUT: ${message}\n`);
        expect(text.text).not.toMatch(RAW_CONTROL);
        expect(JSON.stringify(result)).not.toContain("unrecognized_keys");
        expect(f.domainAccess).not.toHaveBeenCalled();
      }, production);
    },
  );

  it.each(keys)(
    "a prompt refuses a key holding %s as -32602 BAD_USER_INPUT in production",
    async (_label, key, message) => {
      await withClient(async (f) => {
        const error = await f.client
          .getPrompt({
            name: "close-month",
            arguments: { ledger: "alice/main", [key]: "x" },
          })
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(-32602);
        expect((error as McpError).data).toMatchObject({
          code: "BAD_USER_INPUT",
          message,
        });
        expect((error as McpError).message).not.toMatch(RAW_CONTROL);
        expect(f.domainAccess).not.toHaveBeenCalled();
      }, production);
    },
  );
});
