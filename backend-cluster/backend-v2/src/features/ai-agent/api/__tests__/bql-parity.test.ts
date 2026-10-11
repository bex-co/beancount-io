import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerShellQueryResolver } from "@/features/ledger/api/resolvers/ledger-shell-resolver.query";
import {
  LedgerShellService,
  type ShellQueryResult,
  type ShellTextResult,
} from "@/features/ledger/service/ledger-shell-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const query = "SELECT account, sum(position) GROUP BY account";

async function fixture(
  result: unknown,
  textResult: ShellTextResult = { text: "" },
) {
  const authorizeOrThrow = jest.fn().mockResolvedValue(undefined);
  const queryShell = jest
    .fn()
    .mockResolvedValue({ data: { success: true, data: { result } } });
  const queryShellText = jest
    .fn()
    .mockResolvedValue({ data: { success: true, data: textResult } });
  const service = new LedgerShellService(
    {
      getPublicApiClient: async () => ({
        shell: { queryShell, queryShellText },
      }),
    } as unknown as IFavaClientFactory,
    { authorizeOrThrow } as unknown as IAuthorizationService,
  );
  const resolver = new LedgerShellQueryResolver(service);
  const schema = await buildSchema({
    resolvers: [LedgerShellQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const services = { ledgerShell: service };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { services, identity: pinnedReadToken } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bql-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const restQuery = (queryValue: unknown, accept: string) =>
    fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: accept },
      body: JSON.stringify({ query: queryValue }),
    });
  return {
    client,
    authorizeOrThrow,
    queryShell,
    queryShellText,
    rest: (queryValue: unknown = query) =>
      restQuery(queryValue, "application/json"),
    restText: (queryValue: unknown = query) =>
      restQuery(queryValue, "text/plain"),
    gql: (selection: string, queryValue: unknown = query) =>
      graphql({
        schema,
        source: `query($query: String!) { queryShell(ledgerId: "alice/main", query: $query) { resultType ${selection} } }`,
        variableValues: { query: queryValue },
        contextValue: { identity: pinnedReadToken },
      }),
    gqlText: (queryValue: unknown = query) =>
      graphql({
        schema,
        source:
          'query($query: String!) { queryShellText(ledgerId: "alice/main", query: $query) { text } }',
        variableValues: { query: queryValue },
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("structured BQL across actual adapters", () => {
  it.each([
    {
      result: {
        types: [
          { name: "amount", dtype: "number" },
          { name: "position", dtype: "inventory" },
        ],
        rows: [
          [42.5, { USD: "9007199254740993.12" }],
          [false, "café"],
        ],
        t: "table",
      },
      selection: "table { types { name dtype } rows t }",
      expected: {
        resultType: "table",
        table: {
          types: [
            { name: "amount", dtype: "number" },
            { name: "position", dtype: "inventory" },
          ],
          rows: [
            [42.5, { USD: "9007199254740993.12" }],
            [false, "café"],
          ],
          t: "table",
        },
      },
    },
    {
      result: { contents: "No matching entries\n", t: "text" },
      selection: "text { contents t }",
      expected: {
        resultType: "text",
        text: { contents: "No matching entries\n", t: "text" },
      },
    },
  ])(
    "preserves $expected.resultType results through REST, GraphQL, and MCP",
    async ({ result, selection, expected }) => {
      const f = await fixture(result);
      try {
        const rest = await f.rest();
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expected);
        const gql = await f.gql(selection);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.queryShell).toEqual(expected);
        const mcp = await f.client.callTool({
          name: "runBqlQueryStructured",
          arguments: { query },
        });
        expect(mcp.isError).not.toBe(true);
        // MCP alone adds the row count and the truncation flag (w2/m28:t001):
        // an agent needs to know whether it has seen the whole result, and
        // REST/GraphQL clients page for themselves.
        expect(mcp.structuredContent).toEqual({
          ok: true,
          result: {
            ...expected,
            rowCount: expected.table?.rows.length ?? 0,
            truncated: false,
          },
        });
        expect(f.queryShell).toHaveBeenCalledTimes(3);
        for (const call of f.queryShell.mock.calls)
          expect(call).toEqual(["alice", "main", { query }]);
        expect(f.authorizeOrThrow).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );

  it.each([42, null])(
    "refuses a query of the wrong type (%s) on every surface before domain work",
    async (queryValue) => {
      const f = await fixture({ contents: "must not read" });
      try {
        const rest = await f.rest(queryValue);
        expect(rest.status).toBe(400);
        expect(await rest.json()).toMatchObject({
          error: { code: "VALIDATION_FAILED" },
        });
        expect(
          (await f.gql("text { contents }", queryValue)).errors,
        ).toHaveLength(1);
        const mcp = await f.client.callTool({
          name: "runBqlQueryStructured",
          arguments: { query: queryValue },
        });
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          ok: false,
          error: { code: "BAD_USER_INPUT" },
        });
        expect(f.authorizeOrThrow).not.toHaveBeenCalled();
        expect(f.queryShell).not.toHaveBeenCalled();
        const textRest = await f.restText(queryValue);
        expect(textRest.status).toBe(400);
        expect(await textRest.json()).toMatchObject({
          error: { code: "VALIDATION_FAILED" },
        });
        expect((await f.gqlText(queryValue)).errors).toHaveLength(1);
        const textMcp = await f.client.callTool({
          name: "runBqlQuery",
          arguments: { query: queryValue },
        });
        expect(textMcp.isError).toBe(true);
        expect(textMcp.structuredContent).toMatchObject({
          ok: false,
          error: { code: "BAD_USER_INPUT" },
        });
        expect(f.authorizeOrThrow).not.toHaveBeenCalled();
        expect(f.queryShellText).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("refuses revoked access on every surface before querying", async () => {
    const f = await fixture({ contents: "must not read" });
    f.authorizeOrThrow.mockRejectedValue(new ForbiddenError("Access revoked"));
    try {
      const deniedRest = await f.rest();
      expect(deniedRest.status).toBe(403);
      await deniedRest.text();
      expect((await f.gql("text { contents }")).errors).toHaveLength(1);
      expect(
        (
          await f.client.callTool({
            name: "runBqlQueryStructured",
            arguments: { query },
          })
        ).isError,
      ).toBe(true);
      expect(f.queryShell).not.toHaveBeenCalled();
      const deniedTextRest = await f.restText();
      expect(deniedTextRest.status).toBe(403);
      await deniedTextRest.text();
      expect((await f.gqlText()).errors).toHaveLength(1);
      const deniedTextMcp = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query },
      });
      expect(deniedTextMcp.isError).toBe(true);
      expect(deniedTextMcp.structuredContent).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      expect(f.queryShellText).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

type CanonicalTable = NonNullable<ShellQueryResult["table"]>;
const printOpen = "2016-01-01 open Assets:Cash USD";
const printTransaction =
  '2016-01-02 * "Pay"\n  Assets:Cash  10 USD\n  Income:Work  -10 USD';
const textCases: {
  name: string;
  query: string;
  table: CanonicalTable;
  text: string;
}[] = [
  {
    name: "multiline literal",
    query: "SELECT 'qa\nline' AS qa_text LIMIT 1",
    table: {
      types: [{ name: "qa_text", dtype: "str" }],
      rows: [["qa\nline"]],
      t: "table",
    },
    text: "qa_text\n-------\nqa\nline\n",
  },
  {
    name: "literal backslash control",
    query: "SELECT 'qa\\nline' AS qa_text LIMIT 1",
    table: {
      types: [{ name: "qa_text", dtype: "str" }],
      rows: [["qa\\nline"]],
      t: "table",
    },
    text: "qa_text \n--------\nqa\\nline\n",
  },
  {
    name: "empty result",
    query: "SELECT account WHERE FALSE",
    table: { types: [{ name: "account", dtype: "str" }], rows: [], t: "table" },
    text: "",
  },
  {
    name: "one-dash separator",
    query: "SELECT 1 AS qa_count LIMIT 1",
    table: {
      types: [{ name: "qa_count", dtype: "int" }],
      rows: [[1]],
      t: "table",
    },
    text: "q\n-\n1\n",
  },
  {
    name: "count aggregation with two-dash separator",
    query: "SELECT COUNT(*) AS qa_count",
    table: {
      types: [{ name: "qa_count", dtype: "int" }],
      rows: [[34]],
      t: "table",
    },
    text: "qa\n--\n34\n",
  },
  {
    name: "blank cell",
    query: "SELECT '' AS qa_text LIMIT 1",
    table: {
      types: [{ name: "qa_text", dtype: "str" }],
      rows: [[""]],
      t: "table",
    },
    text: "q\n-\n \n",
  },
  {
    name: "ordinary table with dates, decimal strings, signs and Unicode",
    query: "SELECT date, number, narration LIMIT 2",
    table: {
      types: [
        { name: "date", dtype: "date" },
        { name: "number", dtype: "Decimal" },
        { name: "narration", dtype: "str" },
      ],
      rows: [
        ["2016-01-01", "12.50", "café"],
        ["2016-01-02", "-2.5", "memo"],
      ],
      t: "table",
    },
    text:
      "   date     numbe  narr\n" +
      "----------  -----  ----\n" +
      "2016-01-01  12.50  café\n" +
      "2016-01-02  -2.5   memo\n",
  },
  {
    name: "PRINT directives with multiline postings",
    query: "PRINT",
    table: {
      types: [{ name: "entry", dtype: "str" }],
      rows: [[printOpen], [printTransaction]],
      t: "table",
    },
    text:
      " ".repeat(29) +
      "entry" +
      " ".repeat(29) +
      "\n" +
      "-".repeat(63) +
      "\n" +
      printOpen +
      " ".repeat(32) +
      "\n" +
      printTransaction +
      "\n",
  },
];

describe("canonical BQL text counts through the actual service and adapters", () => {
  it.each(textCases)(
    "$name preserves raw and typed values on all surfaces",
    async ({ query: bql, table, text }) => {
      const f = await fixture(table, { text, rowCount: table.rows.length });
      try {
        const mcp = await f.client.callTool({
          name: "runBqlQuery",
          arguments: { query: bql },
        });
        expect(mcp.isError).not.toBe(true);
        expect(mcp.structuredContent).toEqual({ ok: true, result: text });
        expect(Reflect.ownKeys(mcp.structuredContent!)).toEqual([
          "ok",
          "result",
        ]);
        const summary =
          table.rows.length === 0
            ? "0 rows — no postings matched"
            : `${table.rows.length} ${table.rows.length === 1 ? "row" : "rows"}\n${text.replace(/\s+$/, "")}`;
        expect(mcp.content).toEqual([{ type: "text", text: summary }]);
        // The count belongs to this text response; obtaining it must never
        // execute a second, typed query that could read another ledger revision.
        expect(f.queryShellText).toHaveBeenCalledTimes(1);
        expect(f.queryShell).not.toHaveBeenCalled();

        const restText = await f.restText(bql);
        expect(restText.status).toBe(200);
        expect(restText.headers.get("content-type")).toContain("text/plain");
        expect(await restText.text()).toBe(text);
        const gqlText = await f.gqlText(bql);
        expect(gqlText.errors).toBeUndefined();
        expect(gqlText.data?.queryShellText).toEqual({ text });

        const expected = { resultType: "table", table };
        const rest = await f.rest(bql);
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expected);
        const gql = await f.gql("table { types { name dtype } rows t }", bql);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.queryShell).toEqual(expected);
        const typed = await f.client.callTool({
          name: "runBqlQueryStructured",
          arguments: { query: bql },
        });
        expect(typed.structuredContent).toEqual({
          ok: true,
          result: {
            ...expected,
            rowCount: table.rows.length,
            truncated: false,
          },
        });
        expect(f.queryShellText).toHaveBeenCalledTimes(3);
        expect(f.queryShell).toHaveBeenCalledTimes(3);
        for (const call of [
          ...f.queryShellText.mock.calls,
          ...f.queryShell.mock.calls,
        ])
          expect(call).toEqual(["alice", "main", { query: bql }]);
        expect(f.authorizeOrThrow).toHaveBeenCalledTimes(6);
      } finally {
        await f.close();
      }
    },
  );

  it("full text counts 1005 rows while the structured MCP result keeps its 1000-row cap", async () => {
    const bql = "SELECT date, 9007199254740993.12 AS number";
    const table: CanonicalTable = {
      types: [
        { name: "date", dtype: "date" },
        { name: "number", dtype: "Decimal" },
      ],
      rows: Array.from({ length: 1005 }, () => [
        "2016-01-01",
        "9007199254740993.12",
      ]),
      t: "table",
    };
    const text =
      "   date           number       \n----------  -------------------\n" +
      "2016-01-01  9007199254740993.12\n".repeat(1005);
    const f = await fixture(table, { text, rowCount: 1005 });
    try {
      const full = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query: bql },
      });
      expect(full.structuredContent).toEqual({ ok: true, result: text });
      expect(full.content).toEqual([
        { type: "text", text: `1005 rows\n${text.replace(/\s+$/, "")}` },
      ]);
      expect(f.queryShellText).toHaveBeenCalledTimes(1);
      expect(f.queryShell).not.toHaveBeenCalled();
      const restText = await f.restText(bql);
      expect(restText.status).toBe(200);
      expect(await restText.text()).toBe(text);
      expect((await f.gqlText(bql)).data?.queryShellText).toEqual({ text });
      const restTyped = await f.rest(bql);
      expect(restTyped.status).toBe(200);
      expect(await restTyped.json()).toEqual({ resultType: "table", table });
      expect(
        (await f.gql("table { types { name dtype } rows t }", bql)).data
          ?.queryShell,
      ).toEqual({ resultType: "table", table });
      const kept = await f.client.callTool({
        name: "runBqlQueryStructured",
        arguments: { query: bql },
      });
      expect(kept.structuredContent).toEqual({
        ok: true,
        result: {
          resultType: "table",
          table: { ...table, rows: table.rows.slice(0, 1000) },
          rowCount: 1000,
          truncated: true,
        },
      });
      expect(f.queryShellText).toHaveBeenCalledTimes(3);
      expect(f.queryShell).toHaveBeenCalledTimes(3);
    } finally {
      await f.close();
    }
  });

  it.each([undefined, null])(
    "legacy rowCount %s uses a neutral heading without guessing from text",
    async (rowCount) => {
      const { query: bql, table, text } = textCases[0];
      const f = await fixture(table, {
        text,
        ...(rowCount !== undefined && { rowCount }),
      });
      try {
        const mcp = await f.client.callTool({
          name: "runBqlQuery",
          arguments: { query: bql },
        });
        expect(mcp.structuredContent).toEqual({ ok: true, result: text });
        expect(mcp.content).toEqual([
          {
            type: "text",
            text: `BQL result — row count unavailable\n${text.replace(/\s+$/, "")}`,
          },
        ]);
        expect(f.queryShellText).toHaveBeenCalledTimes(1);
        expect(f.queryShell).not.toHaveBeenCalled();
        const raw = await f.restText(bql);
        expect(await raw.text()).toBe(text);
        expect((await f.gqlText(bql)).data?.queryShellText).toEqual({ text });
        expect(f.queryShellText).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );

  it("interleaved text calls keep each count attached to its own response", async () => {
    const first = textCases[0];
    const secondQuery = "SELECT value LIMIT 3";
    const secondText = "v\n-\nA\nB\nC\n";
    const f = await fixture(first.table);
    let releaseFirst!: (value: unknown) => void;
    const held = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const firstResponse = {
      data: { success: true, data: { text: first.text, rowCount: 1 } },
    };
    f.queryShellText.mockImplementation(
      (_owner: string, _name: string, args: { query: string }) =>
        args.query === first.query
          ? held
          : Promise.resolve({
              data: { success: true, data: { text: secondText, rowCount: 3 } },
            }),
    );
    const pending = f.client.callTool({
      name: "runBqlQuery",
      arguments: { query: first.query },
    });
    try {
      const second = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query: secondQuery },
      });
      releaseFirst(firstResponse);
      const initial = await pending;
      expect(initial.structuredContent).toEqual({
        ok: true,
        result: first.text,
      });
      expect(initial.content).toEqual([
        { type: "text", text: "1 row\nqa_text\n-------\nqa\nline" },
      ]);
      expect(second.structuredContent).toEqual({
        ok: true,
        result: secondText,
      });
      expect(second.content).toEqual([
        { type: "text", text: "3 rows\nv\n-\nA\nB\nC" },
      ]);
      expect(f.queryShellText).toHaveBeenCalledTimes(2);
      expect(f.queryShell).not.toHaveBeenCalled();
    } finally {
      releaseFirst(firstResponse);
      await pending.catch(() => undefined);
      await f.close();
    }
  });

  it("query failures remain coded failures rather than zero-row success summaries", async () => {
    const f = await fixture({ contents: "must not read" });
    const failure = new BadUserInputError("Invalid BQL query", "query");
    f.queryShellText.mockRejectedValue(failure);
    try {
      const rest = await f.restText();
      expect(rest.status).toBe(400);
      expect(await rest.json()).toMatchObject({
        error: { code: "BAD_USER_INPUT" },
      });
      const gql = await f.gqlText();
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toBe(failure);
      const mcp = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query },
      });
      expect(mcp.isError).toBe(true);
      expect(mcp.structuredContent).toMatchObject({
        ok: false,
        error: { code: "BAD_USER_INPUT" },
      });
      expect(f.queryShellText).toHaveBeenCalledTimes(3);
      expect(f.queryShell).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
