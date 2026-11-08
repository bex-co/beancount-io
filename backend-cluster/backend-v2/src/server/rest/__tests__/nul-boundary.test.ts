import { z } from "zod";
import { validateRequest } from "../validation-middleware";
import { BadUserInputError } from "@/shared/errors";
import { graphqlNulMiddleware } from "@/server/graphql/nul-middleware";
import { ARGUMENT_LIMITS } from "@/shared/argument-limits";

/**
 * w23/m22 — REST and GraphQL refuse U+0000 in any caller-supplied string
 * before a schema, a resolver or a store sees it, and let file content
 * through verbatim. The MCP half is `mcp-nul-contract.test.ts`.
 */
const NUL = "a\u0000b";

async function runRest(parts: {
  params?: unknown;
  query?: unknown;
  body?: unknown;
}) {
  const ctx = {
    params: parts.params ?? {},
    query: parts.query ?? {},
    request: { body: parts.body ?? {} },
    state: {} as Record<string, unknown>,
  };
  const next = jest.fn(async () => undefined);
  await validateRequest({})(ctx as never, next);
  return { ctx, next };
}

describe("REST validateRequest", () => {
  it.each([
    ["a path segment", { params: { path: NUL } }],
    ["a query value", { query: { accountId: NUL } }],
    ["a query array member", { query: { transactionIds: ["ok", NUL] } }],
    ["a body string", { body: { collaborator: NUL } }],
    ["a nested body string", { body: { files: [{ path: NUL }] } }],
    ["a body key", { body: { ["k\u0000"]: "v" } }],
  ])(
    "refuses a NUL in %s as BAD_USER_INPUT before the handler",
    async (_name, parts) => {
      const next = jest.fn();
      const ctx = {
        params: (parts as { params?: unknown }).params ?? {},
        query: (parts as { query?: unknown }).query ?? {},
        request: { body: (parts as { body?: unknown }).body ?? {} },
        state: {},
      };
      await expect(
        validateRequest({})(ctx as never, next),
      ).rejects.toBeInstanceOf(BadUserInputError);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("lets file content keep a NUL, as it commits and reads back (w23/220)", async () => {
    const { next } = await runRest({
      body: { content: NUL, files: [{ path: "a.bean", content: NUL }] },
    });
    expect(next).toHaveBeenCalled();
  });

  it("does not exempt a content-named query parameter", async () => {
    await expect(runRest({ query: { content: NUL } })).rejects.toBeInstanceOf(
      BadUserInputError,
    );
  });

  it("still parses clean requests through the route schemas", async () => {
    const ctx = {
      params: { owner: "alice" },
      query: {},
      request: { body: {} },
      state: {} as { validated?: unknown },
    };
    await validateRequest({ params: z.object({ owner: z.string() }) })(
      ctx as never,
      async () => undefined,
    );
    expect(ctx.state.validated).toMatchObject({ params: { owner: "alice" } });
  });
});

describe("GraphQL graphqlNulMiddleware", () => {
  const run = (args: unknown, root = true) => {
    const next = jest.fn(async () => "resolved");
    const info = { path: { prev: root ? undefined : { key: "parent" } } };
    return {
      next,
      result: (async () =>
        graphqlNulMiddleware()({ args, info } as never, next))(),
    };
  };

  it("refuses a NUL in a root-field argument before the resolver", async () => {
    const { next, result } = run({ accountId: NUL });
    await expect(result).rejects.toBeInstanceOf(BadUserInputError);
    expect(next).not.toHaveBeenCalled();
  });

  it("refuses a NUL inside a nested input object", async () => {
    const { result } = run({ input: { entries: [{ entry: { payee: NUL } }] } });
    await expect(result).rejects.toBeInstanceOf(BadUserInputError);
  });

  it("lets a file-content argument keep a NUL", async () => {
    const { next, result } = run({ ledgerId: "a/b", content: NUL });
    await expect(result).resolves.toBe("resolved");
    expect(next).toHaveBeenCalled();
  });

  it("does not inspect nested field resolution", async () => {
    const { result } = run({ x: NUL }, false);
    await expect(result).resolves.toBe("resolved");
  });
});

/**
 * w23/m23 — the same boundary refuses the other hostile shapes: a lone
 * surrogate, an oversize string, deep nesting and a huge array. The MCP half
 * derives its cases from the tool schemas (`mcp-hostile-values.test.ts`).
 */
const deepObject = (levels: number) => {
  let node: unknown = "x";
  for (let i = 0; i < levels; i += 1) node = { k: node };
  return node;
};
const HOSTILE: [string, unknown][] = [
  ["a lone surrogate", "a\ud800b"],
  [
    "a string past the ceiling",
    "a".repeat(ARGUMENT_LIMITS.maxStringLength + 1),
  ],
  ["nesting past the ceiling", deepObject(ARGUMENT_LIMITS.maxDepth + 1)],
  [
    "an array past the ceiling",
    new Array(ARGUMENT_LIMITS.maxArrayLength + 1).fill("x"),
  ],
];

describe.each(HOSTILE)("hostile value: %s", (_name, value) => {
  it("is BAD_USER_INPUT on REST, in a body and in a query, before the handler", async () => {
    await expect(runRest({ body: { memo: value } })).rejects.toBeInstanceOf(
      BadUserInputError,
    );
    await expect(runRest({ query: { memo: value } })).rejects.toBeInstanceOf(
      BadUserInputError,
    );
  });

  it("is BAD_USER_INPUT on a GraphQL root-field argument", async () => {
    const next = jest.fn(async () => "resolved");
    await expect(
      (async () =>
        graphqlNulMiddleware()(
          { args: { input: { memo: value } }, info: { path: {} } } as never,
          next,
        ))(),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("the argument ceilings", () => {
  it("accept a value exactly at each ceiling", async () => {
    const { next } = await runRest({
      body: {
        memo: "a".repeat(ARGUMENT_LIMITS.maxStringLength),
        list: new Array(ARGUMENT_LIMITS.maxArrayLength).fill("x"),
        tree: deepObject(ARGUMENT_LIMITS.maxDepth - 2),
      },
    });
    expect(next).toHaveBeenCalled();
  });

  it("give file text a longer string bound but never a lone surrogate", async () => {
    const long = "a".repeat(ARGUMENT_LIMITS.maxStringLength + 1);
    const { next } = await runRest({ body: { content: long } });
    expect(next).toHaveBeenCalled();
    await expect(
      runRest({ body: { content: "a\ud800" } }),
    ).rejects.toBeInstanceOf(BadUserInputError);
    await expect(
      runRest({
        body: { content: "a".repeat(ARGUMENT_LIMITS.maxFileTextLength + 1) },
      }),
    ).rejects.toBeInstanceOf(BadUserInputError);
  });

  it("name the parameter in the refusal", async () => {
    await expect(
      runRest({ body: { files: [{ path: "a\ud800" }] } }),
    ).rejects.toThrow(/files\[\]\.path/);
  });
});
