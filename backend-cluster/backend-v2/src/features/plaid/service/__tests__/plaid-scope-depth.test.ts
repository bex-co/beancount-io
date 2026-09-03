import "reflect-metadata";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));
import { PlaidItemService } from "../plaid-item-service";
import { systemIdentity } from "@/server/api/identity";
import type { Identity } from "@/server/api/identity";

const authorizeOrThrow = jest.fn().mockResolvedValue({ allowed: true });

/**
 * w3/m9 — a Plaid service authorizes as its caller.
 *
 * Driven through a real service method with **no transport in the picture**,
 * which is the whole point. Before m9 the services rebuilt
 * `trustedIdentity(userId)` internally: a narrowed token arrived narrow and was
 * immediately widened to a capability-exempt session. The transport gate still
 * refused it, but the gate was the *only* thing that did — one bug away from a
 * scoped agent unlinking a bank connection.
 *
 * The assertion is on which identity reaches `authorizeLedger`, because that is
 * precisely what regressed and precisely what the fix restores.
 */
describe("Plaid services authorize as the caller, not as a session", () => {
  const narrowed: Identity = {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set(["ledger.read"]),
    tokenId: "tok_1",
  };

  let service: PlaidItemService;

  beforeEach(() => {
    jest.clearAllMocks();
    authorizeOrThrow.mockResolvedValue({ allowed: true });
    service = new PlaidItemService(
      {} as never,
      {
        getAdminClient: () => ({
          ledgers: {
            getLedger: jest.fn().mockResolvedValue({
              data: { success: true, data: { id: 42 } },
            }),
          },
        }),
      } as never,
      {
        plaidItem: {
          getByLedgerRepoIdAndUserId: jest.fn().mockResolvedValue([]),
        },
      } as never,
      {} as never,
      {} as never,
      {
        authorizeOrThrow,
      } as never,
    );
  });

  it("hands the caller's own identity down, still narrowed", async () => {
    await service.getItems(narrowed, "alice/main");

    expect(authorizeOrThrow).toHaveBeenCalledTimes(1);
    const identity = authorizeOrThrow.mock.calls[0]![0]!.principal;
    expect(identity).toBe(narrowed);
    expect([...identity.scopes]).toEqual(["ledger.read"]);
  });

  it("does not widen a scoped credential into a full-capability one", async () => {
    await service.getItems(narrowed, "alice/main");

    const identity = authorizeOrThrow.mock.calls[0]![0]!.principal;
    // The pre-m9 shape: same user, entirely different authority. If this ever
    // holds again, the scope check downstream cannot tell a scoped agent from
    // a browser session.
    expect(identity.method).toBe("oauth");
  });

  it("still lets an unattended caller through, under a name that greps", async () => {
    const system = systemIdentity("usr_1");

    await service.getItems(system, "alice/main");

    const identity = authorizeOrThrow.mock.calls[0]![0]!.principal;
    expect(identity.method).toBe("system");
    expect(identity.principal).toEqual({
      type: "service",
      id: "backend-v2",
      onBehalfOfUserId: "usr_1",
    });
    expect(identity.assurance).toEqual({ type: "workload" });
    expect([...(identity.capabilities ?? [])].sort()).toEqual([
      "admin",
      "read",
      "write",
    ]);
    expect(identity.userId).toBe("usr_1");
  });
});
