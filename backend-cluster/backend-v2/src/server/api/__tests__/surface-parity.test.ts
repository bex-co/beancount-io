import { VERB_TABLE, isReachableOn, type VerbEntry } from "../op-class";

/**
 * ADR 0006 D9, test 1 — three-surface parity is a test, not a discipline.
 *
 * A verb missing from a surface is not an error; a verb missing from a surface
 * for no recorded reason is. The table's `restExempt` / `mcpExempt` /
 * `gqlExempt` strings are the recorded parity decisions, and this test is what
 * makes writing one unavoidable: add a GraphQL mutation with no REST twin and
 * no reason, and CI names it.
 *
 * Most rows carry exemptions today. That is D7's deliberately-small v1 REST
 * surface and the four-tool MCP surface, written down rather than assumed.
 */

const SURFACES = ["gql", "rest", "mcp"] as const;
type Surface = (typeof SURFACES)[number];

const EXEMPT_FIELD: Record<Surface, keyof VerbEntry> = {
  gql: "gqlExempt",
  rest: "restExempt",
  mcp: "mcpExempt",
};

interface ParityGap {
  readonly verb: string;
  readonly surface: Surface;
  readonly problem: "missing" | "empty-reason" | "vague-reason";
}

/**
 * A reason has to survive being read months later by someone deciding whether
 * to close the gap. "TODO" and "N/A" do not; a sentence naming the constraint
 * does. The length floor is a blunt proxy, but it is the one that catches the
 * failure mode — an exemption added to silence the test.
 */
const MIN_REASON_LENGTH = 40;
const VAGUE = /^(todo|tbd|n\/?a|none|later|not needed)\b/i;

export function findParityGaps(table: readonly VerbEntry[]): ParityGap[] {
  const gaps: ParityGap[] = [];
  for (const entry of table) {
    for (const surface of SURFACES) {
      if (entry[surface]) continue;
      const reason = entry[EXEMPT_FIELD[surface]];
      if (typeof reason !== "string" || reason.trim().length === 0) {
        gaps.push({ verb: entry.verb, surface, problem: "missing" });
        continue;
      }
      if (
        reason.trim().length < MIN_REASON_LENGTH ||
        VAGUE.test(reason.trim())
      ) {
        gaps.push({ verb: entry.verb, surface, problem: "vague-reason" });
      }
    }
  }
  return gaps;
}

/**
 * An exemption that excuses a verb by naming another route has made a factual
 * claim, and `runBqlQuery` is the one route whose limits are absolute: BQL is a
 * query language and cannot write a directive. So it can excuse a `read` and
 * never a `write` or an `admin`.
 *
 * `Mutation.bulkEntries` carried exactly this — the category was written for
 * reads, 29 of its 30 rows are reads, and it was pasted onto one write. The
 * conclusion happened to survive (`editLedgerFiles` does reach it) while the
 * argument did not, which is the shape that never surfaces on its own.
 */
export function findUnreachableEscapeHatches(
  table: readonly VerbEntry[],
): string[] {
  return table
    .filter(
      (entry) =>
        (entry.class === "write" || entry.class === "admin") &&
        !entry.mcp &&
        entry.mcpExempt?.includes("runBqlQuery"),
    )
    .map(
      (entry) =>
        `${entry.verb} is ${entry.class}-class but excused by a read-only escape hatch`,
    );
}

/**
 * An exemption whose truth rests on a decision made elsewhere has to say so in
 * a form that can be found by searching, so that changing that decision can
 * enumerate what it re-opens.
 *
 * Only the *format* is checkable — whether a reason genuinely depends on a
 * decision is a judgement. This enforces that anyone who writes `depends-on`
 * writes an id after it, which is what makes the grep work.
 */
const DEPENDENCY_CITATION = /depends-on ADR-\d{4}-D\d+/;

export function findMalformedDependencies(
  table: readonly VerbEntry[],
): string[] {
  const problems: string[] = [];
  for (const entry of table) {
    for (const field of ["gqlExempt", "restExempt", "mcpExempt"] as const) {
      const reason = entry[field];
      if (!reason?.includes("depends-on")) continue;
      if (!DEPENDENCY_CITATION.test(reason)) {
        problems.push(
          `${entry.verb}'s ${field} says "depends-on" without an ADR-NNNN-DN id to grep for`,
        );
      }
    }
  }
  return problems;
}

/**
 * How many in-scope verbs each surface is still missing.
 *
 * Out-of-scope absences are excluded rather than counted and forgiven, so the
 * number is the work remaining and nothing else (ADR 0008 D4/D6).
 */
export function countDeferred(
  table: readonly VerbEntry[],
): Record<"gql" | "rest" | "mcp", number> {
  // A verb is present on MCP if *either* primitive carries it. Counting only
  // `mcp` would have left the vocabulary reads in the debt after w3/m6 ported
  // them as resources — the surface reaches them, which is the only question
  // parity asks.
  const present = (entry: VerbEntry, surface: "gql" | "rest" | "mcp") =>
    surface === "mcp"
      ? Boolean(entry.mcp ?? entry.mcpResource)
      : Boolean(entry[surface]);
  const missing = (surface: "gql" | "rest" | "mcp") =>
    table.filter(
      (entry) => !present(entry, surface) && isReachableOn(entry, surface),
    ).length;
  return { gql: missing("gql"), rest: missing("rest"), mcp: missing("mcp") };
}

const describeGap = (gap: ParityGap) =>
  gap.problem === "missing"
    ? `${gap.verb} is absent from ${gap.surface} with no ${EXEMPT_FIELD[gap.surface]} reason`
    : `${gap.verb}'s ${EXEMPT_FIELD[gap.surface]} reason is too thin to re-litigate later`;

describe("surface parity", () => {
  it("has every verb on all three surfaces or excused with a reason", () => {
    expect(findParityGaps(VERB_TABLE).map(describeGap)).toEqual([]);
  });

  it("keeps verb ids unique", () => {
    const seen = new Set<string>();
    const duplicates = VERB_TABLE.filter((entry) => {
      if (seen.has(entry.verb)) return true;
      seen.add(entry.verb);
      return false;
    }).map((entry) => entry.verb);
    expect(duplicates).toEqual([]);
  });

  /**
   * ADR 0008 D6 — the parity gap, tracked exactly.
   *
   * Asserted with `toEqual`, not as a ceiling, so the number moves in *either*
   * direction only by someone editing this line. Adding a verb without its
   * twins fails until the count is raised; porting one fails until it is
   * lowered. Both are the point: the first makes growing the gap a visible,
   * arguable act, and the second keeps the number tight — a ceiling with slack
   * under it is how the next unpaired verb arrives unnoticed.
   *
   * Out-of-scope verbs (ADR 0008 D4) and ones a surface physically cannot carry
   * are excluded upstream, so this is work remaining and nothing else.
   */
  const DEFERRED: Record<"gql" | "rest" | "mcp", number> = {
    gql: 0,
    rest: 45,
    mcp: 56,
  };

  it("tracks the in-scope gap exactly, so it cannot drift either way", () => {
    expect(countDeferred(VERB_TABLE)).toEqual(DEFERRED);
  });

  it("excuses a write verb only by a route that can write", () => {
    expect(findUnreachableEscapeHatches(VERB_TABLE)).toEqual([]);
  });

  it("keeps every dependency citation greppable", () => {
    expect(findMalformedDependencies(VERB_TABLE)).toEqual([]);
  });

  it("reaches all three surfaces for at least the ADR 0006 D1 verbs", () => {
    // The MCP tools are the worked example of one service method with three
    // adapters. If this drops to zero the table has become a list of
    // GraphQL ops with excuses, which is the state D1 exists to end.
    const crossSurface = VERB_TABLE.filter((entry) => entry.gql && entry.mcp);
    expect(crossSurface.length).toBeGreaterThanOrEqual(4);
  });
});

describe("findParityGaps", () => {
  // Proves the guard is load-bearing: the same check the table is held to,
  // shown failing. Without this the suite could stay green because the checker
  // stopped checking rather than because the table is right.
  const excused = (over: Partial<VerbEntry> = {}): VerbEntry => ({
    verb: "test.verb",
    class: "read",
    gql: "Query.testVerb",
    restExempt: "A".repeat(MIN_REASON_LENGTH),
    mcpExempt: "B".repeat(MIN_REASON_LENGTH),
    ...over,
  });

  it("passes a fully excused verb", () => {
    expect(findParityGaps([excused()])).toEqual([]);
  });

  it("fails a verb whose exemption was deleted, naming it", () => {
    const gaps = findParityGaps([excused({ restExempt: undefined })]);
    expect(gaps).toEqual([
      { verb: "test.verb", surface: "rest", problem: "missing" },
    ]);
  });

  it("fails a placeholder reason", () => {
    const gaps = findParityGaps([excused({ mcpExempt: "TODO" })]);
    expect(gaps).toEqual([
      { verb: "test.verb", surface: "mcp", problem: "vague-reason" },
    ]);
  });

  it("fails a reason that only looks like prose", () => {
    const gaps = findParityGaps([excused({ mcpExempt: "not needed here" })]);
    expect(gaps).toEqual([
      { verb: "test.verb", surface: "mcp", problem: "vague-reason" },
    ]);
  });
});

describe("the checks ADR 0008 D7 added", () => {
  const row = (over: Partial<VerbEntry>): VerbEntry => ({
    verb: "test.verb",
    class: "read",
    gql: "Query.testVerb",
    restExempt: "A".repeat(MIN_REASON_LENGTH),
    mcpExempt: "B".repeat(MIN_REASON_LENGTH),
    ...over,
  });

  describe("escape-hatch reachability", () => {
    it("accepts a read excused by runBqlQuery", () => {
      const entry = row({
        mcpExempt: "Already reachable through `runBqlQuery`.",
      });
      expect(findUnreachableEscapeHatches([entry])).toEqual([]);
    });

    it("rejects a write excused by runBqlQuery — the bulkEntries defect", () => {
      const entry = row({
        verb: "Mutation.bulkEntries",
        class: "write",
        mcpExempt: "Already reachable through `runBqlQuery`.",
      });
      expect(findUnreachableEscapeHatches([entry])).toEqual([
        "Mutation.bulkEntries is write-class but excused by a read-only escape hatch",
      ]);
    });

    it("rejects an admin verb the same way", () => {
      const entry = row({
        class: "admin",
        mcpExempt: "Already reachable through `runBqlQuery`.",
      });
      expect(findUnreachableEscapeHatches([entry])).toHaveLength(1);
    });
  });

  describe("dependency citations", () => {
    it("ignores a reason that claims no dependency", () => {
      expect(findMalformedDependencies([row({})])).toEqual([]);
    });

    it("accepts a greppable citation", () => {
      const entry = row({
        mcpExempt: "depends-on ADR-0007-D3 — the ledger pin.",
      });
      expect(findMalformedDependencies([entry])).toEqual([]);
    });

    it("rejects a dependency with no id to grep for", () => {
      const entry = row({
        mcpExempt: "depends-on the ledger pinning decision.",
      });
      expect(findMalformedDependencies([entry])).toHaveLength(1);
    });
  });

  describe("deferred counting", () => {
    it("counts an in-scope absence", () => {
      expect(countDeferred([row({ rest: undefined })]).rest).toBe(1);
    });

    it("does not count a session-only absence — it is out of scope, not debt", () => {
      const entry = row({ class: "session-only", rest: undefined });
      expect(countDeferred([entry]).rest).toBe(0);
    });

    it("does not count a verb the surface physically cannot carry", () => {
      // `ai.agent` IS the agent transport; a tool for reaching it is circular.
      const entry = row({ verb: "ai.agent", class: "write", mcp: undefined });
      expect(countDeferred([entry]).mcp).toBe(0);
    });

    it("does not count the Plaid Link ceremony", () => {
      const entry = row({
        verb: "Mutation.exchangePlaidPublicToken",
        class: "admin",
        rest: undefined,
      });
      expect(countDeferred([entry]).rest).toBe(0);
    });
  });
});
