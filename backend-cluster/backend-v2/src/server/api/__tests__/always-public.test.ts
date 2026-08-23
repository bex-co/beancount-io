jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-claude-code", () => ({
  createClaudeCode: () => ({}),
}));

import { ALWAYS_PUBLIC } from "../always-public";
import { assembleTestApi } from "./api-surface";

/**
 * ADR 0006 D9, test 3 — nothing sits outside the scope gate without saying why.
 *
 * The composition root marks each REST fragment `scoped` or `outside`; this
 * test takes the mounts that came out `outside` and holds them against the
 * checked-in census. A new ungated route fails until someone writes its reason;
 * a route that moves under the gate fails until its excuse is removed. Neither
 * list is derived from the other, so agreement between them is evidence rather
 * than tautology.
 */

interface CensusDrift {
  readonly uncensused: string[];
  readonly stale: string[];
  readonly unexplained: string[];
}

const MIN_REASON_LENGTH = 40;

export function findCensusDrift(
  outsideOpIds: readonly string[],
  census: readonly { opId: string; reason: string }[],
): CensusDrift {
  const censusIds = new Set(census.map((entry) => entry.opId));
  const live = new Set(outsideOpIds);
  return {
    uncensused: outsideOpIds.filter((opId) => !censusIds.has(opId)),
    stale: census.map((entry) => entry.opId).filter((opId) => !live.has(opId)),
    unexplained: census
      .filter((entry) => entry.reason.trim().length < MIN_REASON_LENGTH)
      .map((entry) => entry.opId),
  };
}

describe("always-public census", () => {
  let outsideOpIds: string[];
  let scopedOpIds: string[];

  beforeAll(async () => {
    const { restMounts: mounts } = await assembleTestApi();
    outsideOpIds = mounts
      .filter((mount) => mount.gate === "outside")
      .map((mount) => mount.opId);
    scopedOpIds = mounts
      .filter((mount) => mount.gate === "scoped")
      .map((mount) => mount.opId);
  });

  it("censuses every mount that sits outside the gate", () => {
    expect(findCensusDrift(outsideOpIds, ALWAYS_PUBLIC).uncensused).toEqual([]);
  });

  it("has no census entry for a mount that is gone or now scoped", () => {
    expect(findCensusDrift(outsideOpIds, ALWAYS_PUBLIC).stale).toEqual([]);
  });

  it("gives every entry a reason worth reading", () => {
    expect(findCensusDrift(outsideOpIds, ALWAYS_PUBLIC).unexplained).toEqual(
      [],
    );
  });

  it("does not excuse a scoped mount", () => {
    // Belt and braces on the two lists disagreeing in the one direction the
    // checks above cannot see: a route that is gated *and* excused would be
    // enforced correctly today and silently opened by a later refactor that
    // trusts the census.
    const censusIds = new Set(ALWAYS_PUBLIC.map((entry) => entry.opId));
    expect(scopedOpIds.filter((opId) => censusIds.has(opId))).toEqual([]);
  });

  it("still has ops under the gate", () => {
    // A census that quietly grew to cover everything would pass every check
    // above while meaning the gate guards nothing.
    expect(scopedOpIds.length).toBeGreaterThan(0);
  });
});

describe("findCensusDrift", () => {
  const entry = (opId: string) => ({
    opId,
    reason: "A".repeat(MIN_REASON_LENGTH),
  });

  it("reports an ungated mount nobody explained", () => {
    const drift = findCensusDrift(
      ["REST GET /healthz", "REST POST /api/new-webhook"],
      [entry("REST GET /healthz")],
    );
    expect(drift.uncensused).toEqual(["REST POST /api/new-webhook"]);
    expect(drift.stale).toEqual([]);
  });

  it("reports a census entry with nothing behind it", () => {
    const drift = findCensusDrift(
      ["REST GET /healthz"],
      [entry("REST GET /healthz"), entry("REST GET /gone")],
    );
    expect(drift.stale).toEqual(["REST GET /gone"]);
  });

  it("reports a reason too thin to re-litigate", () => {
    const drift = findCensusDrift(
      ["REST GET /healthz"],
      [{ opId: "REST GET /healthz", reason: "public" }],
    );
    expect(drift.unexplained).toEqual(["REST GET /healthz"]);
  });
});
