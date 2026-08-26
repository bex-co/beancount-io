import "reflect-metadata";

// The ai-agent fragment transitively loads the harness ESM packages, whose
// `import.meta.url` Jest's CommonJS transform cannot evaluate. Nothing here
// calls them.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import Router, { type RouterContext } from "@koa/router";
import { GraphQLError, type GraphQLResolveInfo } from "graphql";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { config as realConfig, type AppConfig } from "@/config/config";
import { ForbiddenError } from "@/shared/errors";
import { formatError } from "@/server/graphql/format-error";
import type { IContext } from "@/server/graphql/context";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { buildGraphqlSchema } from "@/server/graphql/api-gateway";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { restScopeMiddleware } from "@/server/rest/scope-middleware";
import type { ToolContext } from "@/features/ai-agent/tools/types";
import type { Identity } from "../identity";
import { assembleMcpRegistry, type ApiGate } from "../composition-root";
import { assembleTestApi } from "./api-surface";

/**
 * Cross-surface consistency (ADR 0006 D3): one decision, three dialects.
 *
 * The same read-only token, refused the same write verb, must come back as a
 * GraphQL error, a REST 403 `{ ok: false }`, and an MCP `isError` result — and
 * a browser session must sail through all three untouched. The point of
 * checking them side by side is that a surface which quietly stopped enforcing
 * looks identical to one where the caller happened to be allowed.
 */

const readOnlyToken: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  capabilityExempt: false,
};

const writeToken: Identity = {
  ...readOnlyToken,
  scopes: new Set(["ledger.write"]),
};

const adminToken: Identity = {
  ...readOnlyToken,
  scopes: new Set(["ledger.admin"]),
};

const sessionIdentity: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const enforcing = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const shadowing = { api: { scopeEnforcement: "shadow" } } as AppConfig;

// --- REST --------------------------------------------------------------

/**
 * A real @koa/router dispatch, not a hand-built context.
 *
 * The middleware derives its op id from `ctx.matched`, which the router fills
 * in before running the layer chain — an assumption about router internals
 * that, if wrong, would leave the gate silently never firing. A fabricated
 * context is exactly where such an assumption gets baked in instead of
 * checked, so these go through the router itself.
 */
function buildRestRouter(identity: Identity | undefined, config: AppConfig) {
  const router = new Router();
  const gates = new Map<string, ApiGate>([
    ["REST POST /api-gateway/agent", "scoped"],
    ["REST GET /healthz", "outside"],
    ["REST ALL /git{/*path}", "outside"],
  ]);
  const reached: string[] = [];
  router.use(restErrorMiddleware());
  router.use(async (ctx, next) => {
    ctx.state.identity = identity;
    await next();
  });
  router.use(restScopeMiddleware(config, gates));
  const answer =
    (name: string): Router.Middleware =>
    (ctx) => {
      reached.push(name);
      ctx.status = 204;
    };
  router.post("/api-gateway/agent", answer("agent"));
  router.get("/healthz", answer("healthz"));
  router.all("/git{/*path}", answer("git"));
  return { dispatch: router.routes(), reached };
}

async function driveRest(
  identity: Identity | undefined,
  config: AppConfig,
  method = "POST",
  path = "/api-gateway/agent",
): Promise<{ ctx: RouterContext; reached: string[] }> {
  const { dispatch, reached } = buildRestRouter(identity, config);
  const ctx = {
    method,
    path,
    host: "localhost",
    status: 404,
    body: undefined,
    state: {},
    request: {},
  } as unknown as RouterContext;
  await dispatch(ctx, async () => undefined);
  return { ctx, reached };
}

// --- GraphQL -----------------------------------------------------------

function makeGraphqlInfo(
  parent: "Query" | "Mutation",
  fieldName: string,
  nested = false,
): GraphQLResolveInfo {
  return {
    parentType: { name: parent },
    fieldName,
    path: nested
      ? { prev: { key: "root" }, key: fieldName }
      : { key: fieldName },
  } as unknown as GraphQLResolveInfo;
}

async function driveGraphql(
  identity: Identity | undefined,
  info: GraphQLResolveInfo,
  config: AppConfig,
): Promise<{ error?: unknown; reached: boolean }> {
  let reached = false;
  try {
    await graphqlScopeMiddleware(config.api.scopeEnforcement)(
      { context: { identity } as IContext, info } as never,
      async () => {
        reached = true;
        return undefined;
      },
    );
  } catch (error) {
    return { error, reached };
  }
  return { reached };
}

// --- MCP ---------------------------------------------------------------

type McpHandler = (input: unknown) => Promise<CallToolResult>;

function captureMcpHandlers(
  identity: Identity,
  config: AppConfig,
  services?: Record<string, unknown>,
): Map<string, McpHandler> {
  const handlers = new Map<string, McpHandler>();
  const spy = jest
    .spyOn(McpServer.prototype, "registerTool")
    .mockImplementation(((name: string, _cfg: unknown, cb: McpHandler) => {
      handlers.set(name, cb);
      return {} as never;
    }) as never);
  try {
    assembleMcpRegistry(
      {
        services: services ?? {
          // Reached only if the gate lets the call through, which is exactly
          // what the denial assertions below are checking does not happen.
          ledgerShell: { queryShellText: jest.fn() },
          ledgerRepo: {},
        },
        identity,
        ledgerId: "alice/main",
      } as unknown as ToolContext,
      config,
    );
  } finally {
    spy.mockRestore();
  }
  return handlers;
}

describe("scope enforcement across surfaces", () => {
  describe("the committed policy closes high-impact scope escalation", () => {
    it("GraphQL: even every ledger scope cannot unlock a session-only operation", async () => {
      const allScopes: Identity = {
        ...adminToken,
        scopes: new Set([
          "ledger.read",
          "ledger.write",
          "ledger.admin",
        ]),
      };
      const { error, reached } = await driveGraphql(
        allScopes,
        makeGraphqlInfo("Mutation", "deleteAccount"),
        realConfig,
      );

      expect(reached).toBe(false);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as Error).message).toContain("browser session");
    });

    it("GraphQL: a normal signed-in session still reaches that operation", async () => {
      const { error, reached } = await driveGraphql(
        sessionIdentity,
        makeGraphqlInfo("Mutation", "deleteAccount"),
        realConfig,
      );

      expect(error).toBeUndefined();
      expect(reached).toBe(true);
    });

    it("MCP: ledger.write cannot list API keys", async () => {
      const handlers = captureMcpHandlers(writeToken, realConfig);
      const result = await handlers.get("listApiKeys")!({});

      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("ledger.admin");
    });

    it("MCP: ledger.admin still reaches an admin operation", async () => {
      const list = jest.fn().mockResolvedValue([]);
      const handlers = captureMcpHandlers(adminToken, realConfig, {
        apiKey: { list },
        ledgerRepo: {},
        ledgerShell: {},
      });
      const result = await handlers.get("listApiKeys")!({});

      expect(result.isError).not.toBe(true);
      expect(list).toHaveBeenCalledWith(adminToken);
    });

    it("still lets an unauthenticated signup ceremony reach its resolver", async () => {
      const { error, reached } = await driveGraphql(
        undefined,
        makeGraphqlInfo("Mutation", "signUp"),
        realConfig,
      );

      expect(error).toBeUndefined();
      expect(reached).toBe(true);
    });
  });

  describe("refuses a read-only token a write op, in each surface's dialect", () => {
    it("REST: 403 with the standard error envelope", async () => {
      const { ctx, reached } = await driveRest(readOnlyToken, enforcing);
      expect(reached).toEqual([]);
      expect(ctx.status).toBe(403);
      expect(ctx.body).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
      expect(
        (ctx.body as { error: { message: string } }).error.message,
      ).toContain("ledger.write");
    });

    it("GraphQL: an error carrying extensions.code FORBIDDEN", async () => {
      const { error, reached } = await driveGraphql(
        readOnlyToken,
        makeGraphqlInfo("Mutation", "createLedgerFile"),
        enforcing,
      );
      expect(reached).toBe(false);
      expect(error).toBeInstanceOf(ForbiddenError);
      // The pair Apollo hands `formatError`, so the assertion is on the wire
      // shape a client actually receives rather than on the throw.
      const wire = formatError(
        {
          message: (error as Error).message,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        },
        new GraphQLError((error as Error).message, {
          originalError: error as Error,
          path: ["createLedgerFile"],
        }),
      );
      expect(wire.extensions).toMatchObject({ code: "FORBIDDEN" });
      expect(wire.message).toContain("ledger.write");
    });

    it("MCP: an isError tool result rather than a dead connection", async () => {
      // An agent is mid-conversation; a thrown transport error would end the
      // session instead of telling it what it lacked.
      const handlers = captureMcpHandlers(readOnlyToken, enforcing);
      const result = await handlers.get("editLedgerFiles")!({});
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("ledger.write");
    });

    /**
     * The gate above is not the only place a call is refused. A grant the
     * caller still holds the scope for can be revoked on the ledger itself, and
     * every tool re-checks that per call through `authorizeLedger` — inside
     * `runToolSafely`, which is an error boundary: it catches the ForbiddenError
     * and *returns* `{ ok: false, error }`. That value used to be wrapped as an
     * ordinary successful result, so the second dialect of "no" reached the
     * agent as a yes, and only the first one it branches on said otherwise.
     */
    it("MCP: a refusal raised inside the tool is an isError result too", async () => {
      const handlers = captureMcpHandlers(
        {
          userId: "usr_1",
          method: "oauth",
          // Holds the scope — this denial comes from the ledger, not the gate.
          scopes: new Set(["ledger.read"]),
          tokenId: "tok_1",
          capabilityExempt: false,
        },
        enforcing,
        {
          ledgerShell: {
            queryShellText: jest
              .fn()
              .mockRejectedValue(
                new ForbiddenError("You no longer have access to this ledger"),
              ),
          },
          ledgerRepo: {},
        },
      );

      const result = await handlers.get("runBqlQuery")!({ query: "BALANCES" });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("no longer have access");
    });
  });

  describe("leaves dashboard and mobile session traffic untouched", () => {
    it("REST", async () => {
      const { ctx, reached } = await driveRest(sessionIdentity, enforcing);
      expect(reached).toEqual(["agent"]);
      expect(ctx.status).toBe(204);
    });

    it("GraphQL", async () => {
      const { error, reached } = await driveGraphql(
        sessionIdentity,
        makeGraphqlInfo("Mutation", "createLedgerFile"),
        enforcing,
      );
      expect(error).toBeUndefined();
      expect(reached).toBe(true);
    });

    it("MCP is not a session surface at all, but the gate agrees anyway", () => {
      // `mcp-route` refuses a session before this point; the matrix would too
      // only by exemption, so this documents that the two do not disagree.
      const handlers = captureMcpHandlers(sessionIdentity, enforcing);
      expect([...handlers.keys()]).toHaveLength(9);
    });
  });

  describe("shadow mode", () => {
    it("REST lets the refused request through", async () => {
      const { ctx, reached } = await driveRest(readOnlyToken, shadowing);
      expect(reached).toEqual(["agent"]);
      expect(ctx.status).toBe(204);
    });

    it("GraphQL lets the refused field resolve", async () => {
      const { error, reached } = await driveGraphql(
        readOnlyToken,
        makeGraphqlInfo("Mutation", "createLedgerFile"),
        shadowing,
      );
      expect(error).toBeUndefined();
      expect(reached).toBe(true);
    });
  });

  describe("where the gate deliberately does not run", () => {
    it("skips a REST mount marked outside the gate", async () => {
      const { reached } = await driveRest(
        readOnlyToken,
        enforcing,
        "GET",
        "/healthz",
      );
      expect(reached).toEqual(["healthz"]);
    });

    it("recognises a router.all() mount by its ALL op id", async () => {
      // `.all()` stamps every HTTP method onto the layer. Deriving
      // `REST POST /git{/*path}` instead would miss the census entry and start
      // 403-ing git pushes.
      const { reached } = await driveRest(
        readOnlyToken,
        enforcing,
        "POST",
        "/git/alice/main.git/git-receive-pack",
      );
      expect(reached).toEqual(["git"]);
    });

    it("skips nested GraphQL field resolution", async () => {
      // Only root fields are ops. Re-checking every nested field would charge a
      // query for its own shape and cost a lookup per resolved field.
      const { error, reached } = await driveGraphql(
        readOnlyToken,
        makeGraphqlInfo("Mutation", "createLedgerFile", true),
        enforcing,
      );
      expect(error).toBeUndefined();
      expect(reached).toBe(true);
    });
  });
});

/**
 * The same gate, exercised through a real GraphQL execution rather than a
 * hand-built `info` object.
 *
 * This is what stands in for the dashboard smoke: session traffic driving the
 * real schema, including admin-class mutations, and never meeting a scope
 * refusal — while the same documents on a read-only token do. A hand-made
 * middleware call cannot show that the middleware is actually wired into the
 * schema; this can.
 */
describe("scope enforcement through the real schema", () => {
  const DOCUMENTS: Record<string, string> = {
    publicQuery: "query { health }",
    readQuery:
      'query { queryShellText(ledgerId: "alice/main", query: "SELECT 1") { __typename } }',
    adminMutation:
      'mutation { deleteLedger(ledgerId: "alice/main") { __typename } }',
  };

  const contextFor = (identity: Identity): IContext =>
    ({
      identity,
      userId: identity.userId,
      getCurrentUserId: () => identity.userId,
    }) as IContext;

  const forbiddenOps = async (identity: Identity) => {
    const { graphql } = await import("graphql");
    const schema = await buildGraphqlSchema();
    const refused: string[] = [];
    for (const [name, source] of Object.entries(DOCUMENTS)) {
      const result = await graphql({
        schema,
        source,
        contextValue: contextFor(identity),
      });
      // A parse or validation error would mean the document never reached
      // execution, so nothing was gated and the op would look "allowed". Those
      // carry no `path`, unlike an error thrown during execution.
      const invalid = result.errors?.filter((error) => !error.path) ?? [];
      if (invalid.length > 0) {
        throw new Error(
          `${name} is not a valid document: ${invalid.map((e) => e.message).join("; ")}`,
        );
      }
      // Resolution itself fails without a service container — irrelevant here.
      // The gate runs before the resolver, so a FORBIDDEN is the gate's and
      // nothing else's.
      if (
        result.errors?.some(
          (error) => error.originalError instanceof ForbiddenError,
        )
      ) {
        refused.push(name);
      }
    }
    return refused;
  };

  it("never refuses a browser session, admin-class mutations included", async () => {
    expect(await forbiddenOps(sessionIdentity)).toEqual([]);
  });

  it("refuses a read-only token everything above its class", async () => {
    expect(await forbiddenOps(readOnlyToken)).toEqual(["adminMutation"]);
  });

  it("refuses a scopeless token everything but the public op", async () => {
    // Pins down that `readQuery` passing above is the read scope working, not
    // the gate quietly skipping the field.
    const scopeless: Identity = { ...readOnlyToken, scopes: new Set() };
    expect(await forbiddenOps(scopeless)).toEqual([
      "readQuery",
      "adminMutation",
    ]);
  });
});

/**
 * Shadow mode changes nothing for anyone.
 *
 * The gate ships turned down: it classifies and logs, and every request that
 * would be refused still reaches its handler. That is the whole safety
 * argument for putting it in front of live REST routes at all, so it is worth
 * a test rather than a paragraph — checked against every mount the composition
 * root actually produces, with the least-privileged caller there is.
 *
 * With one deliberate exception, checked below: a fragment marked `enforced`
 * denies whatever the global mode says. Shadow mode protects working
 * integrations from a misclassification, and the v1 surface has none to
 * protect — it is published with a documented scope model, so a gate that does
 * not actually refuse would be a documented lie.
 */
describe("configured enforcement and the shadow-mode compatibility path", () => {
  it("commits the product to enforcement", () => {
    expect(realConfig.api.scopeEnforcement).toBe("enforce");
  });

  it("neither refuses nor touches the response on any mount", async () => {
    const { restMounts } = await assembleTestApi();
    const gates = new Map<string, ApiGate>(
      restMounts.map((mount) => [mount.opId, mount.gate]),
    );
    const middleware = restScopeMiddleware(shadowing, gates);
    const scopeless: Identity = { ...readOnlyToken, scopes: new Set() };

    const touched: string[] = [];
    for (const mount of restMounts) {
      if (mount.gate === "enforced") continue;
      const ctx = {
        method: mount.method === "ALL" ? "POST" : mount.method,
        path: mount.path,
        status: 404,
        body: undefined,
        state: { identity: scopeless },
        matched: [{ methods: [mount.method], path: mount.path }],
      } as unknown as RouterContext;
      let reached = false;
      await middleware(ctx, async () => {
        reached = true;
      });
      if (!reached || ctx.status !== 404 || ctx.body !== undefined) {
        touched.push(mount.opId);
      }
    }
    expect(touched).toEqual([]);
    expect(restMounts.length).toBeGreaterThan(30);
  });

  it("still refuses on a mount whose fragment asked to be enforced", async () => {
    const { restMounts } = await assembleTestApi();
    const gates = new Map<string, ApiGate>(
      restMounts.map((mount) => [mount.opId, mount.gate]),
    );
    const middleware = restScopeMiddleware(shadowing, gates);
    const scopeless: Identity = { ...readOnlyToken, scopes: new Set() };

    const enforced = restMounts.filter((mount) => mount.gate === "enforced");
    // If this is ever empty the test above silently becomes the only one, and
    // v1 could lose its enforcement without anything failing.
    expect(enforced.length).toBeGreaterThan(0);

    for (const mount of enforced) {
      const ctx = {
        method: mount.method === "ALL" ? "POST" : mount.method,
        path: mount.path,
        status: 404,
        body: undefined,
        state: { identity: scopeless },
        matched: [{ methods: [mount.method], path: mount.path }],
      } as unknown as RouterContext;
      await expect(middleware(ctx, async () => {})).rejects.toThrow(
        ForbiddenError,
      );
    }
  });
});
