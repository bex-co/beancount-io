import baseline from "./fixtures/parity-baseline.json";
import { VERB_TABLE, isReachableOn } from "../op-class";

/**
 * The completion denominator is independent of today's mutable exemption
 * rules. Porting an adapter may add bindings, but must not erase a legacy
 * operation, exclude it, or change its authorization to make the gap smaller.
 * This fixture is a historical contract, not a snapshot to regenerate when a
 * test fails. New verbs remain subject to the live coverage/parity guards.
 */
describe("the accepted parity baseline", () => {
  const live = new Map(VERB_TABLE.map((entry) => [entry.verb, entry]));

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
        eligible: entry.eligible.includes(surface),
      });
    }
  });

  it.each(baseline.operations)(
    "keeps existing $verb clients reachable",
    (entry) => {
      const current = live.get(entry.verb);
      for (const surface of ["gql", "rest", "mcp", "mcpResource"] as const) {
        const binding = entry.bindings[surface];
        if (binding !== undefined) expect(current?.[surface]).toBe(binding);
      }
    },
  );
});
