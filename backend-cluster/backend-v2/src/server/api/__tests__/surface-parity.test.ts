import { VERB_TABLE, type VerbEntry } from "../op-class";

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
