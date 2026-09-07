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
import { classifyOp } from "../op-class";

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
};

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
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
    expect(budgetFor(opId, classifyOp(opId))).toEqual(OP_BUDGETS[opId]);
    expect(budgetFor("GQL Mutation.somethingElse", classifyOp("GQL Mutation.somethingElse"))).toEqual(
      CLASS_BUDGETS.write,
    );
  });

  it("preserves admin budgets for API-key list and revoke on every surface", () => {
    const operations = [
      "GQL Query.apiKeys",
      "REST GET /api-gateway/v1/api-keys",
      "MCP listApiKeys",
      "GQL Mutation.revokeApiKey",
      "REST DELETE /api-gateway/v1/api-keys/{id}",
      "MCP revokeApiKey",
    ];
    for (const opId of operations) {
      const classification = classifyOp(opId);
      expect(classification.class).toBe("admin");
      expect(budgetFor(opId, classification)).toEqual(
        CLASS_BUDGETS.admin,
      );
    }
  });

  it("preserves the destructive admin budget for every ledger control-plane verb", () => {
    for (const opId of [
      "GQL Mutation.createLedger",
      "GQL Mutation.updateLedger",
      "GQL Mutation.deleteLedger",
      "GQL Query.listPublicKeys",
      "GQL Query.getPublicKey",
      "GQL Mutation.createPublicKey",
      "GQL Mutation.deletePublicKey",
      "GQL Query.listLedgerCollaborators",
      "GQL Query.getLedgerCollaboratorPermission",
      "GQL Mutation.addOrUpdateLedgerCollaborator",
      "GQL Mutation.deleteLedgerCollaborator",
      "GQL Mutation.leaveLedger",
    ]) {
      const classification = classifyOp(opId);
      expect(classification.class).toBe("admin");
      expect(budgetFor(opId, classification)).toEqual(
        CLASS_BUDGETS.admin,
      );
    }
  });

  it("keeps the five-per-minute create-key override on every surface", () => {
    for (const opId of [
      "GQL Mutation.createApiKey",
      "REST POST /api-gateway/v1/api-keys",
      "MCP createApiKey",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual({
        windowMs: 60_000,
        max: 5,
      });
    }
  });

  it("preserves every billing operation's legacy 300-per-minute budget", () => {
    for (const opId of [
      "GQL Query.allTierQuotas",
      "GQL Query.subscriptionStatus",
      "GQL Mutation.createSubscriptionSession",
      "GQL Mutation.createStripePortalSession",
      "GQL Mutation.cancelSubscription",
      "GQL Mutation.resumeSubscription",
      "GQL Mutation.upgradeSubscription",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual({
        windowMs: 60_000,
        max: 300,
      });
    }
  });

  it("preserves social budgets while reachability moves to public/PDP classes", () => {
    for (const opId of [
      "GQL Query.getFeed",
      "GQL Query.getUserProfile",
      "GQL Query.getUserFollowers",
      "GQL Query.getUserFollowing",
      "GQL Query.getUserStarredRepos",
      "GQL Mutation.followUser",
      "GQL Mutation.unfollowUser",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual({
        windowMs: 60_000,
        max: 300,
      });
    }
    for (const opId of [
      "GQL Mutation.starLedger",
      "GQL Mutation.unstarLedger",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual(
        CLASS_BUDGETS.write,
      );
    }
  });

  it("limits REST and MCP archive downloads to 30 per minute", () => {
    for (const opId of [
      "REST GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}",
      "REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}",
      "MCP resource:ledgerArchive",
      "MCP resource:legacyLedgerArchive",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual({
        windowMs: 60_000,
        max: 30,
      });
    }
    expect(budgetFor("GQL Query.listLedgers", classifyOp("GQL Query.listLedgers"))).toEqual(
      CLASS_BUDGETS.read,
    );
  });

  it("keeps the anonymous intakes on separate budgets", () => {
    expect(anonymousFamily("/api-gateway/oauth/token")).toBe("oauth");
    expect(anonymousFamily("/.well-known/oauth-protected-resource")).toBe(
      "oauth",
    );
    expect(anonymousFamily("/api-gateway/stripe/webhook")).toBe("webhook");
    expect(
      anonymousFamily("/api-gateway/v1/ledgers/alice/main/archive/main.zip"),
    ).toBe("archive");
    expect(
      anonymousFamily("/api-gateway/ledgers/alice%2Fmain/archive/main.tar.gz"),
    ).toBe("archive");
    expect(anonymousFamily("/api-gateway/v1/ledgers")).toBe("default");
    // A flood against one must not be able to exhaust another.
    expect(new Set(Object.keys(ANONYMOUS_BUDGETS)).size).toBe(4);
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

  it("charges every surface's spelling of one verb to one counter", async () => {
    // Three aliases, one 5/minute operation — otherwise rotating surfaces
    // would turn the deliberate createApiKey override into 15/minute.
    respond(1);
    respond(2);
    respond(3);
    await consume({
      opId: "GQL Mutation.createApiKey",
      identity: token,
      ip: "ip",
    });
    await consume({
      opId: "REST POST /api-gateway/v1/api-keys",
      identity: token,
      ip: "ip",
    });
    await consume({ opId: "MCP createApiKey", identity: token, ip: "ip" });
    const keys = new Set(counter.mock.calls.map(([key]) => key));
    expect(keys.size).toBe(1);
  });

  it("follows a per-op override to aliases that never spelled it", async () => {
    // The 10/minute temp-upload budget is declared once, on the GraphQL alias.
    // The REST route and MCP tool share its counter, so they must share its
    // max as well — a shared count judged against different maxes would refuse
    // on one surface what it allows on another.
    for (const opId of [
      "GQL Mutation.generateTempAssetUploadUrl",
      "REST POST /api-gateway/v1/temp-assets/upload-url",
      "MCP generateTempAssetUploadUrl",
    ]) {
      expect(budgetFor(opId, classifyOp(opId))).toEqual({
        windowMs: 60_000,
        max: 10,
      });
    }
  });

  it("shares one counter between canonical and compatibility archive routes", async () => {
    respond(1);
    respond(2);
    await consume({
      opId: "REST GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}",
      identity: token,
      ip: "ip",
    });
    await consume({
      opId: "REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}",
      identity: token,
      ip: "ip",
    });
    const [first] = counter.mock.calls[0];
    const [second] = counter.mock.calls[1];
    expect(first).toEqual(second);
    expect(first).toContain("REST archive-download");
  });

  it("charges anonymous archive downloads to their own 30-per-minute bucket", async () => {
    respond(ANONYMOUS_BUDGETS.archive.max + 1);
    await expect(
      consumeAnonymous({
        path: "/api-gateway/ledgers/alice%2Fmain/archive/main.zip",
        ip: "1.2.3.4",
      }),
    ).resolves.toMatchObject({
      allowed: false,
      budget: { windowMs: 60_000, max: 30 },
    });
    expect(counter).toHaveBeenCalledWith(
      "ratelimit:anon:archive:1.2.3.4",
      60_000,
    );
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

it("alternating REST and MCP archive aliases cannot reset the shared budget", async () => {
  const counts = new Map<string, number>();
  counter.mockImplementation(async (key: string) => {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return { count, resetInMs: 60000 };
  });
  const aliases = [
    "REST GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}",
    "MCP resource:ledgerArchive",
    "REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}",
    "MCP resource:legacyLedgerArchive",
  ];
  for (let i = 0; i < 30; i++)
    expect(
      (await consume({ opId: aliases[i % 4], identity: token, ip: "fixture" }))
        .allowed,
    ).toBe(true);
  for (const opId of aliases)
    expect(
      (await consume({ opId, identity: token, ip: "fixture" })).allowed,
    ).toBe(false);
  expect(counts.size).toBe(1);
});
