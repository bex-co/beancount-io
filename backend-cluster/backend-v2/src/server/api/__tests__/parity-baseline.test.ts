import baseline from "./fixtures/parity-baseline.json";
import { VERB_TABLE, isReachableOn, isWithheldFromMcp } from "../op-class";

/**
 * The completion denominator is independent of today's mutable exemption
 * rules. Porting an adapter may add bindings, but must not erase a legacy
 * operation, exclude it, or change its authorization to make the gap smaller.
 * This fixture is a historical contract, not a snapshot to regenerate when a
 * test fails. New verbs remain subject to the live coverage/parity guards.
 */
/**
 * Verbs whose MCP adapter was withdrawn on purpose, by directory policy
 * (ADR 019, 2026-10-09 amendment, w1/m36): access credentials (API and SSH
 * keys), irreversible account deletion, and plan tiers or usage, which the
 * Claude and ChatGPT directories' published rules refuse. GraphQL and REST
 * keep them. This is the only list that may narrow a baseline row, and only
 * on MCP. It is written out rather than derived, so that op-class withholding
 * one more verb fails here until this contract names it too.
 */
const WITHDRAWN_FROM_MCP = new Set([
  "apikeys.list",
  "apikeys.create",
  "apikeys.revoke",
  "Query.listPublicKeys",
  "Query.getPublicKey",
  "Mutation.createPublicKey",
  "Mutation.deletePublicKey",
  "Mutation.deleteAccount",
  "Query.allTierQuotas",
  "Query.aiCfoUsage",
]);

describe("the accepted parity baseline", () => {
  const live = new Map(VERB_TABLE.map((entry) => [entry.verb, entry]));

  it("names exactly the verbs op-class withholds from MCP", () => {
    expect(
      new Set(VERB_TABLE.filter(isWithheldFromMcp).map((entry) => entry.verb)),
    ).toEqual(WITHDRAWN_FROM_MCP);
  });

  it.each(baseline.operations)("preserves $verb and its authority", (entry) => {
    const current = live.get(entry.verb);
    expect(current).toBeDefined();
    expect(current?.authorizationAction).toBe(entry.authorizationAction);
    expect(current?.class).toBe(entry.class);
  });

  it.each(baseline.operations)("preserves $verb eligibility", (entry) => {
    const current = live.get(entry.verb)!;
    for (const surface of ["gql", "rest", "mcp"] as const) {
      expect({
        verb: entry.verb,
        surface,
        eligible: current !== undefined && isReachableOn(current, surface),
      }).toEqual({
        verb: entry.verb,
        surface,
        // Explicit policy expansion for native OAuth feed access; the historical
        // fixture stays frozen and every other operation keeps its eligibility.
        eligible:
          entry.verb === "Query.getFeed" ||
          (entry.eligible.includes(surface) &&
            !(surface === "mcp" && WITHDRAWN_FROM_MCP.has(entry.verb))),
      });
    }
  });

  it.each(baseline.operations)(
    "keeps existing $verb clients reachable",
    (entry) => {
      const current = live.get(entry.verb);
      for (const surface of ["gql", "rest", "mcp", "mcpResource"] as const) {
        const binding = entry.bindings[surface];
        if (binding === undefined) continue;
        if (surface === "mcp" && WITHDRAWN_FROM_MCP.has(entry.verb)) {
          expect(current?.mcp).toBeUndefined();
          continue;
        }
        expect(current?.[surface]).toBe(binding);
      }
    },
  );
});
