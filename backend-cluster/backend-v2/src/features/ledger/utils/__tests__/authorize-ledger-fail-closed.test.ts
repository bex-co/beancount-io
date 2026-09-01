import { authorizeLedger, type AuthorizeLedgerDeps } from "../authorize-ledger";
import { assertLedgerAccess } from "../ledger-access-check";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

jest.mock("../ledger-access-check", () => ({
  assertLedgerAccess: jest.fn(),
}));

const mockAssertLedgerAccess = assertLedgerAccess as jest.Mock;

const deps = {} as AuthorizeLedgerDeps;

function identity(): Identity {
  return {
    userId: "user-1",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  };
}

/**
 * `asLedgerPermission` is the gate that keeps an out-of-vocabulary string out
 * of `authorizeLedger`; this covers the second lock behind it. The rank
 * comparison used to be a bare `PERMISSION_RANK[permission] < REL_RANK[rel]`,
 * and `undefined < 0` is `false` — so any permission the record did not know
 * satisfied every rel, admin included, instead of being refused.
 */
describe("authorizeLedger fails closed on an unknown permission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["none", "read"],
    ["none", "write"],
    ["none", "admin"],
    ["owner", "admin"],
    ["", "read"],
  ] as const)("refuses %p for a %s verb", async (permission, rel) => {
    mockAssertLedgerAccess.mockResolvedValue({
      permission,
      ledgerOwnerId: "owner-1",
      ledgerRepoId: 42,
    });

    await expect(
      authorizeLedger(identity(), "owner/main", rel, deps),
    ).rejects.toThrow(ForbiddenError);
  });

  it("still authorizes a permission inside the vocabulary", async () => {
    mockAssertLedgerAccess.mockResolvedValue({
      permission: "write",
      ledgerOwnerId: "owner-1",
      ledgerRepoId: 42,
    });

    await expect(
      authorizeLedger(identity(), "owner/main", "write", deps),
    ).resolves.toEqual({ ledgerRepoId: 42, ownerUserId: "owner-1" });
  });
});
