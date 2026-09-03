import "reflect-metadata";
import { LLMService } from "../llm-service";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";
import { AuthorizationService } from "@/server/api/authorization";

/**
 * The LLM verbs take a caller-supplied `ledgerId` and have no `authorizeLedger`
 * seam of their own — they build a Fava client straight from the user id. Until
 * this fix they also rebuilt `trustedIdentity(userId)` internally, so a
 * ledger-pinned OAuth grant arrived pinned and was immediately widened to a
 * capability-exempt session: `assertLedgerScope` had nothing left to compare
 * and the whole check passed. A grant confined to ledger A could then read
 * ledger B's accounts and recent transactions whenever the underlying user
 * happened to be a collaborator on B.
 *
 * These assert on refusal *before any work happens* — no usage check, no S3
 * fetch, no LLM spend — because that is what a scope mismatch is supposed to
 * cost.
 */
describe("LLMService authorizes as the caller", () => {
  const pinnedToA: Identity = {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write"]),
    ledgerScope: "alice/a",
    tokenId: "tok_1",
  };

  /** An API key minted against no particular ledger: narrowed by scope only. */
  const unpinned: Identity = {
    userId: "usr_1",
    method: "apikey",
    scopes: new Set(["ledger.read", "ledger.write"]),
    tokenId: "key_1",
  };

  const usageCheck = jest.fn();
  const getObjectMetadata = jest.fn();

  function makeService() {
    return new LLMService(
      { getApiContext: jest.fn() } as never,
      { getObjectMetadata, generateDownloadUrl: jest.fn() } as never,
      { check: usageCheck, addTokenUsage: jest.fn() } as never,
      { blockeden: { accessKey: "test-key" } } as never,
      new AuthorizationService({ check: async () => true }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    usageCheck.mockResolvedValue({ allowed: true });
  });

  it("refuses suggestCategories on a ledger the grant is not pinned to", async () => {
    await expect(
      makeService().suggestCategories(pinnedToA, "alice/b", []),
    ).rejects.toMatchObject({ category: "FORBIDDEN" });
    expect(usageCheck).not.toHaveBeenCalled();
  });

  it("refuses parseReceipt on a ledger the grant is not pinned to", async () => {
    await expect(
      makeService().parseReceipt(pinnedToA, "tmp/r.pdf", "alice/b"),
    ).rejects.toMatchObject({ category: "FORBIDDEN" });
    expect(usageCheck).not.toHaveBeenCalled();
    expect(getObjectMetadata).not.toHaveBeenCalled();
  });

  it("lets the pinned ledger through — the check is a mismatch, not a ban", async () => {
    // Past the scope gate the usage check runs, which is as far as this stub
    // goes; reaching it is the signal.
    usageCheck.mockResolvedValue({
      allowed: false,
      maxAllowed: 0,
      currentCount: 0,
    });
    await expect(
      makeService().suggestCategories(pinnedToA, "alice/a", []),
    ).rejects.not.toBeInstanceOf(ForbiddenError);
    expect(usageCheck).toHaveBeenCalledWith("usr_1");
  });

  it("does not confine a credential that was never pinned", async () => {
    // Over-blocking would be its own outage: an unpinned key's per-ledger
    // access is decided the normal way, by the ledger access check downstream.
    usageCheck.mockResolvedValue({
      allowed: false,
      maxAllowed: 0,
      currentCount: 0,
    });
    await expect(
      makeService().parseReceipt(unpinned, "tmp/r.pdf", "bob/anything"),
    ).rejects.not.toBeInstanceOf(ForbiddenError);
  });
});
