import {
  evaluateDirectiveLimit,
  type DirectiveLimitGateDeps,
} from "../directive-limit-gate";

/**
 * The gate's contract is mostly about what it does when things go wrong, so the
 * fixtures are built to break in one specific way at a time.
 */
function deps(over: {
  user?: { id: string } | null;
  bypass?: boolean;
  maxDirectives?: number;
  count?: number | null;
  countThrows?: Error;
  limitThrows?: Error;
}): DirectiveLimitGateDeps {
  return {
    models: {
      user: {
        getUserByUsername: jest.fn(async () => {
          if (over.limitThrows) throw over.limitThrows;
          return over.user === undefined ? { id: "u_1" } : over.user;
        }),
      },
      paidCustomer: {},
    } as never,
    db: {} as never,
    stripe: {} as never,
    cacheHelper: {
      get: jest.fn(async () => over.bypass === true),
    } as never,
    ledgerClient: {
      request: jest.fn(async () => {
        if (over.countThrows) throw over.countThrows;
        return {
          data: { success: true, data: { count: over.count, sha: "s" } },
        };
      }),
    } as never,
  };
}

jest.mock("@/features/stripe/operations/get-user-tier", () => ({
  getUserTierLimits: jest.fn(),
}));
import { getUserTierLimits } from "@/features/stripe/operations/get-user-tier";
const tier = getUserTierLimits as jest.Mock;

describe("evaluateDirectiveLimit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tier.mockResolvedValue({ maxDirectives: 1000 });
  });

  it("is over only once the count passes the limit, not on reaching it", async () => {
    await expect(
      evaluateDirectiveLimit(deps({ count: 1000 }), "o", "r"),
    ).resolves.toEqual({ decision: "under", count: 1000, limit: 1000 });
    await expect(
      evaluateDirectiveLimit(deps({ count: 1001 }), "o", "r"),
    ).resolves.toEqual({ decision: "over", count: 1001, limit: 1000 });
  });

  it("does not count a ledger it cannot refuse anyway", async () => {
    tier.mockResolvedValue({ maxDirectives: -1 });
    const d = deps({ count: 999_999 });
    await expect(evaluateDirectiveLimit(d, "o", "r")).resolves.toEqual({
      decision: "unlimited",
    });
    // Premium: the count costs a Gitea read and a full ledger parse to answer a
    // question whose answer cannot change the outcome.
    expect(d.ledgerClient.request).not.toHaveBeenCalled();
  });

  it("fails open when ledger-v2 is unreachable", async () => {
    const v = await evaluateDirectiveLimit(
      deps({ countThrows: new Error("ECONNREFUSED") }),
      "o",
      "r",
    );
    expect(v).toEqual({ decision: "unknown", reason: "count: ECONNREFUSED" });
  });

  it("fails open when the count comes back unusable", async () => {
    const v = await evaluateDirectiveLimit(deps({ count: null }), "o", "r");
    expect(v.decision).toBe("unknown");
  });

  it("fails open when the owner has no account", async () => {
    // The alternative — refusing — would lock a user out of the only path left
    // for getting back under the limit once the pre-receive hook is gone.
    const v = await evaluateDirectiveLimit(deps({ user: null }), "o", "r");
    expect(v.decision).toBe("unknown");
  });

  it("fails open when the tier lookup itself throws", async () => {
    tier.mockRejectedValue(new Error("stripe down"));
    const v = await evaluateDirectiveLimit(deps({ count: 1 }), "o", "r");
    expect(v).toEqual({ decision: "unknown", reason: "limit: stripe down" });
  });

  it("asks ledger-v2 for the repository actually being pushed to", async () => {
    const d = deps({ count: 1 });
    await evaluateDirectiveLimit(d, "alice", "example");
    expect(d.ledgerClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/ledgers/alice/example/directive-count",
        method: "GET",
      }),
    );
  });
});
