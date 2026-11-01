import { FavaApiError } from "@/foundation/fava";
import { createLedgerPinResolver } from "../ledger-pin-resolver";

/**
 * A pin is a repository ID; the resolver is how a name becomes one and an ID
 * becomes the ledger's current name (w23/065).
 */
function setup() {
  const getLedger = jest.fn();
  const getLedgerByRepoId = jest.fn();
  let clock = 1_000;
  const resolver = createLedgerPinResolver(
    {
      getAdminClient: () =>
        ({
          ledgers: { getLedger },
          admin: { getLedgerByRepoId },
        }) as never,
    },
    () => clock,
  );
  return {
    resolver,
    getLedger,
    getLedgerByRepoId,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}
const ok = (data: unknown) => ({ data: { success: true, data } });
const notFound = () => new FavaApiError("missing", 404);

describe("createLedgerPinResolver", () => {
  it("turns a ledger name into its repository ID", async () => {
    const { resolver, getLedger } = setup();
    getLedger.mockResolvedValue(ok({ id: 42 }));
    await expect(resolver.repoIdOf("alice/main")).resolves.toBe(42);
    expect(getLedger).toHaveBeenCalledWith("alice", "main");
  });

  it("turns a repository ID into the ledger's current name, after a rename", async () => {
    const { resolver, getLedgerByRepoId, advance } = setup();
    getLedgerByRepoId.mockResolvedValueOnce(ok({ full_name: "alice/p1" }));
    await expect(resolver.nameOf(42)).resolves.toBe("alice/p1");
    getLedgerByRepoId.mockResolvedValueOnce(ok({ full_name: "alice/p2" }));
    // Within the cache window the old answer stands; after it, the rename shows.
    await expect(resolver.nameOf(42)).resolves.toBe("alice/p1");
    advance(31_000);
    await expect(resolver.nameOf(42)).resolves.toBe("alice/p2");
  });

  it("reads a deleted repository and an unowned name as missing, not as an error", async () => {
    const { resolver, getLedger, getLedgerByRepoId } = setup();
    getLedgerByRepoId.mockRejectedValue(notFound());
    getLedger.mockRejectedValue(notFound());
    await expect(resolver.nameOf(42)).resolves.toBeUndefined();
    await expect(resolver.repoIdOf("alice/gone")).resolves.toBeUndefined();
  });

  it("lets a failed lookup throw, so an outage never reads as a match", async () => {
    const { resolver, getLedger, getLedgerByRepoId } = setup();
    getLedgerByRepoId.mockRejectedValue(new FavaApiError("down", 503));
    getLedger.mockRejectedValue(new Error("connect ECONNREFUSED"));
    await expect(resolver.nameOf(42)).rejects.toThrow();
    await expect(resolver.repoIdOf("alice/main")).rejects.toThrow(
      /ECONNREFUSED/,
    );
  });

  it("does not cache a failure", async () => {
    const { resolver, getLedgerByRepoId } = setup();
    getLedgerByRepoId.mockRejectedValueOnce(new FavaApiError("down", 503));
    await expect(resolver.nameOf(42)).rejects.toThrow();
    getLedgerByRepoId.mockResolvedValueOnce(ok({ full_name: "alice/main" }));
    await expect(resolver.nameOf(42)).resolves.toBe("alice/main");
  });

  it("refuses an unusable id in the response instead of pinning to it", async () => {
    const { resolver, getLedger } = setup();
    getLedger.mockResolvedValue(ok({ id: 0 }));
    await expect(resolver.repoIdOf("alice/main")).resolves.toBeUndefined();
  });
});
