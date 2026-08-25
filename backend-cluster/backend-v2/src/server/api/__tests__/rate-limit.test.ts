const counter = jest.fn();
jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: (...args: unknown[]) => counter(...args),
}));

import {
  ANONYMOUS_BUDGETS,
  CLASS_BUDGETS,
  OP_BUDGETS,
  anonymousFamily,
  budgetFor,
  consume,
  consumeAnonymous,
  enforceRateLimit,
} from "../rate-limit";
import { RateLimitedError } from "@/shared/errors";
import type { Identity } from "../identity";

/**
 * The limiter that replaced two hand-attached in-process ones.
 *
 * The properties worth pinning are the ones the old design got wrong: budgets
 * that follow the credential rather than the surface, writes costing more than
 * reads, and a store outage that does not become an API outage.
 */

const token: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  capabilityExempt: false,
};

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

/** Answer the Nth call with a given count. */
const respond = (count: number, resetInMs = 60_000) =>
  counter.mockResolvedValueOnce({ count, resetInMs });

beforeEach(() => {
  counter.mockReset();
});

describe("budgets", () => {
  it("gives writes a much smaller budget than reads", () => {
    expect(CLASS_BUDGETS.write.max).toBeLessThan(CLASS_BUDGETS.read.max);
    expect(CLASS_BUDGETS.admin.max).toBeLessThanOrEqual(
      CLASS_BUDGETS.write.max,
    );
  });

  it("prefers a per-op override to the class budget", () => {
    const opId = "GQL Mutation.generateTempAssetUploadUrl";
    expect(budgetFor(opId, "write")).toEqual(OP_BUDGETS[opId]);
    expect(budgetFor("GQL Mutation.somethingElse", "write")).toEqual(
      CLASS_BUDGETS.write,
    );
  });

  it("keeps the anonymous intakes on separate budgets", () => {
    expect(anonymousFamily("/api-gateway/oauth/token")).toBe("oauth");
    expect(anonymousFamily("/.well-known/oauth-protected-resource")).toBe(
      "oauth",
    );
    expect(anonymousFamily("/api-gateway/stripe/webhook")).toBe("webhook");
    expect(anonymousFamily("/api-gateway/v1/ledgers")).toBe("default");
    // A flood against one must not be able to exhaust another.
    expect(new Set(Object.keys(ANONYMOUS_BUDGETS)).size).toBe(3);
  });
});

describe("charging", () => {
  it("charges a token against its own key, not just its user's", async () => {
    respond(1);
    await consume({ opId: "GQL Query.x", identity: token, ip: "1.2.3.4" });
    expect(counter).toHaveBeenCalledWith(
      expect.stringContaining("tok:tok_1"),
      expect.any(Number),
    );
  });

  it("charges a session against its user", async () => {
    respond(1);
    await consume({ opId: "GQL Query.x", identity: session, ip: "1.2.3.4" });
    expect(counter).toHaveBeenCalledWith(
      expect.stringContaining("usr:usr_1"),
      expect.any(Number),
    );
  });

  it("charges an anonymous caller by IP", async () => {
    respond(1);
    await consume({ opId: "GQL Query.x", ip: "1.2.3.4" });
    expect(counter).toHaveBeenCalledWith(
      expect.stringContaining("ip:1.2.3.4"),
      expect.any(Number),
    );
  });

  it("separates the same caller's budgets per op", async () => {
    respond(1);
    respond(1);
    await consume({ opId: "GQL Query.a", identity: token, ip: "ip" });
    await consume({ opId: "GQL Query.b", identity: token, ip: "ip" });
    const [first] = counter.mock.calls[0];
    const [second] = counter.mock.calls[1];
    expect(first).not.toEqual(second);
  });
});

describe("refusal", () => {
  // A classified read op: `classifyOp` defaults an unknown op to `write`, so a
  // made-up op id would silently be tested against the write budget.
  const READ_OP = "GQL Query.listLedgers";

  it("gives an unclassified op the write budget, not the read one", async () => {
    respond(CLASS_BUDGETS.write.max + 1);
    await expect(
      consume({ opId: "GQL Query.neverHeardOfIt", identity: token, ip: "ip" }),
    ).resolves.toMatchObject({ allowed: false, budget: CLASS_BUDGETS.write });
  });

  it("allows up to the budget and refuses past it", async () => {
    respond(CLASS_BUDGETS.read.max);
    await expect(
      consume({ opId: READ_OP, identity: token, ip: "ip" }),
    ).resolves.toMatchObject({ allowed: true });

    respond(CLASS_BUDGETS.read.max + 1);
    await expect(
      consume({ opId: READ_OP, identity: token, ip: "ip" }),
    ).resolves.toMatchObject({ allowed: false });
  });

  it("throws with a retry-after a client can act on", async () => {
    respond(CLASS_BUDGETS.read.max + 1, 30_000);
    await expect(
      enforceRateLimit({ opId: READ_OP, identity: token, ip: "ip" }),
    ).rejects.toMatchObject({
      metadata: { retryAfter: 30 },
    });
  });

  it("refuses with a RateLimitedError, which every surface already renders", async () => {
    respond(CLASS_BUDGETS.read.max + 1);
    await expect(
      enforceRateLimit({ opId: READ_OP, identity: token, ip: "ip" }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("never reports a retry-after of zero", async () => {
    respond(CLASS_BUDGETS.read.max + 1, 10);
    const decision = await consume({
      opId: READ_OP,
      identity: token,
      ip: "ip",
    });
    expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});

describe("store outage", () => {
  it("fails open rather than turning a Redis blip into an outage", async () => {
    counter.mockResolvedValue(undefined);
    await expect(
      consume({ opId: "GQL Query.x", identity: token, ip: "ip" }),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      enforceRateLimit({ opId: "GQL Query.x", identity: token, ip: "ip" }),
    ).resolves.toBeUndefined();
    await expect(
      consumeAnonymous({ path: "/api-gateway/v1/ledgers", ip: "ip" }),
    ).resolves.toMatchObject({ allowed: true });
  });
});
