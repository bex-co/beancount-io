jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import { getMetadataStorage } from "type-graphql";
import { DIRECT_ONLY_ACTIONS, VERB_TABLE, classifiedOpIds } from "../op-class";
import { ALWAYS_PUBLIC_OP_IDS } from "../always-public";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationAction,
} from "../authorization";
import { assembleTestApi } from "./api-surface";
import {
  allowAnonymousMiddleware,
  authenticatedMiddleware,
} from "@/server/graphql/authenticated";

/**
 * ADR 0006 D9, test 2 — the op-class table matches what the process serves, in
 * both directions.
 *
 * This is the mechanism that keeps the fail-closed default from ever firing in
 * production. An unclassified op is treated as `write` at runtime, which is the
 * safe answer but the wrong one; the point is that it never gets that far,
 * because shipping an op nobody classified turns CI red first. The reverse
 * direction matters just as much: a stale row keeps its class alive for an op
 * that no longer exists, which is how a table stops describing anything.
 */

interface CoverageDrift {
  readonly unclassified: string[];
  readonly stale: string[];
}

export function findCoverageDrift(
  liveOps: readonly string[],
  tableOps: readonly string[],
  excused: ReadonlySet<string>,
): CoverageDrift {
  const table = new Set(tableOps);
  const live = new Set(liveOps);
  return {
    unclassified: liveOps.filter((op) => !table.has(op) && !excused.has(op)),
    stale: tableOps.filter((op) => !live.has(op)),
  };
}

describe("op-class coverage", () => {
  let liveOps: string[];
  let graphqlOps: readonly string[];
  let mcpOps: readonly string[];

  beforeAll(async () => {
    const api = await assembleTestApi();
    graphqlOps = api.graphqlOps;
    mcpOps = api.mcpOps;
    liveOps = [
      ...api.restMounts.map((mount) => mount.opId),
      ...graphqlOps,
      ...mcpOps,
    ];
  });

  it("classifies every live op", () => {
    // A REST mount outside the gate answers to the always-public census
    // instead; between them the two lists account for every op with no third
    // place to hide.
    const { unclassified } = findCoverageDrift(
      liveOps,
      classifiedOpIds(),
      ALWAYS_PUBLIC_OP_IDS,
    );
    expect(unclassified).toEqual([]);
  });

  it("has no table entry for an op that is no longer live", () => {
    const { stale } = findCoverageDrift(
      liveOps,
      classifiedOpIds(),
      ALWAYS_PUBLIC_OP_IDS,
    );
    expect(stale).toEqual([]);
  });

  it("covers the whole GraphQL schema", () => {
    // The counts are asserted, not just membership, because a schema that
    // silently shrank would leave this test green on a table full of stale
    // rows the reverse check would then have to catch alone.
    expect(graphqlOps.filter((op) => op.startsWith("GQL Query.")).length).toBe(
      76,
    );
    expect(
      graphqlOps.filter((op) => op.startsWith("GQL Mutation.")).length,
    ).toBe(62);
  });

  it("gives every GraphQL root field exactly one explicit access mode", () => {
    const metadata = getMetadataStorage();
    const missing: string[] = [];
    const conflicting: string[] = [];
    const legacyAuthorized: string[] = [];

    for (const [parent, resolvers] of [
      ["Query", metadata.queries],
      ["Mutation", metadata.mutations],
    ] as const) {
      for (const resolver of resolvers) {
        const op = `${parent}.${resolver.schemaName}`;
        const middlewares = metadata.middlewares
          .filter(
            (entry) =>
              entry.target === resolver.target &&
              entry.fieldName === resolver.methodName,
          )
          .flatMap((entry) => entry.middlewares);
        const authenticated = middlewares.includes(authenticatedMiddleware);
        const anonymous = middlewares.includes(allowAnonymousMiddleware);

        if (!authenticated && !anonymous) missing.push(op);
        if (authenticated && anonymous) conflicting.push(op);
        if (resolver.roles !== undefined) legacyAuthorized.push(op);
      }
    }

    expect({ missing, conflicting, legacyAuthorized }).toEqual({
      missing: [],
      conflicting: [],
      legacyAuthorized: [],
    });
  });

  it("does not encode PDP credential reachability as an operational class", () => {
    const misleading = VERB_TABLE.filter(
      (entry) =>
        entry.authorizationAction &&
        (entry.class === "session-only" || entry.class === "public"),
    ).map((entry) => entry.verb);

    expect(misleading).toEqual([]);
  });

  it("partitions every verb between one PDP action and one explicit non-PDP reason", () => {
    const invalid = VERB_TABLE.filter((entry) => {
      const hasAction = entry.authorizationAction !== undefined;
      const hasReason = Boolean(entry.nonPdpReason?.trim());
      return hasAction === hasReason;
    }).map((entry) => entry.verb);
    const protectedWithoutPdp = VERB_TABLE.filter(
      (entry) =>
        !entry.authorizationAction &&
        entry.class !== "public" &&
        entry.class !== "session-only",
    ).map((entry) => entry.verb);
    const vagueReasons = VERB_TABLE.filter(
      (entry) =>
        entry.nonPdpReason !== undefined &&
        entry.nonPdpReason.trim().length < 40,
    ).map((entry) => entry.verb);

    expect({ invalid, protectedWithoutPdp, vagueReasons }).toEqual({
      invalid: [],
      protectedWithoutPdp: [],
      vagueReasons: [],
    });
  });

  it("accounts for every canonical action through an alias or a direct-call reason", () => {
    const aliased = new Set(
      VERB_TABLE.flatMap((entry) =>
        entry.authorizationAction ? [entry.authorizationAction] : [],
      ),
    );
    const direct = new Set(
      Object.entries(DIRECT_ONLY_ACTIONS)
        .filter(([, reason]) => Boolean(reason?.trim()))
        .map(([action]) => action as AuthorizationAction),
    );
    const duplicated = [...direct].filter((action) => aliased.has(action));
    const missing = Object.values(AUTHORIZATION_ACTIONS).filter(
      (action) => !aliased.has(action) && !direct.has(action),
    );
    const unknown = [...direct].filter(
      (action) => !Object.values(AUTHORIZATION_ACTIONS).includes(action),
    );

    expect({ missing, duplicated, unknown }).toEqual({
      missing: [],
      duplicated: [],
      unknown: [],
    });
  });

  it("covers every MCP tool, and budgets tools separately from resources", () => {
    // Four ledger tools, three key-management tools (w1/m22), and the two bank
    // tools w3/m8 added. Two rather than one because the op-class registry
    // refuses a tool spanning `write` and `admin` — a credential that may
    // import transactions must not thereby be able to sever the connection.
    //
    // The count is asserted because tool count is the dominant cost in an
    // agent's tool selection: growing it should be a decision, not a drift.
    const tools = mcpOps.filter((op) => !op.startsWith("MCP resource:"));
    expect(tools).toHaveLength(9);

    // Resources are counted apart on purpose. They do not compete for tool
    // selection (ADR 0008 D2), which is the entire reason 50 in-scope reads can
    // reach MCP at all — so they must not be held to the tool budget, and a
    // single number covering both would quietly do exactly that.
    // Ten vocabulary reads (w3/m6), ten analysis reads (w3/m7), seven bank
    // reads (w3/m8), and the file template m5 proved the shape with. This number is expected to climb as
    // the read surface ports; the tool count above is not.
    const resources = mcpOps.filter((op) => op.startsWith("MCP resource:"));
    expect(resources).toHaveLength(28);
  });
});

describe("findCoverageDrift", () => {
  // The guard, shown failing. A drift check that has quietly stopped checking
  // looks exactly like a codebase with no drift.
  it("reports a live op nobody classified", () => {
    const drift = findCoverageDrift(
      ["REST GET /api-gateway/v1/new-thing", "GQL Query.known"],
      ["GQL Query.known"],
      new Set(),
    );
    expect(drift.unclassified).toEqual(["REST GET /api-gateway/v1/new-thing"]);
    expect(drift.stale).toEqual([]);
  });

  it("reports a table row whose op is gone", () => {
    const drift = findCoverageDrift(
      ["GQL Query.known"],
      ["GQL Query.known", "GQL Query.removed"],
      new Set(),
    );
    expect(drift.stale).toEqual(["GQL Query.removed"]);
    expect(drift.unclassified).toEqual([]);
  });

  it("accepts a live op excused by the always-public census", () => {
    const drift = findCoverageDrift(
      ["REST GET /healthz"],
      [],
      new Set(["REST GET /healthz"]),
    );
    expect(drift).toEqual({ unclassified: [], stale: [] });
  });
});
