import { ledgerPinClaims } from "../ledger-pin-claims";

describe("ledgerPinClaims (w23/065)", () => {
  it("adds the repository the pinned name is to the token claims", async () => {
    const resolve = jest.fn(async () => ({ repoId: 42 }));
    await expect(ledgerPinClaims("usr_1:alice/main", resolve)).resolves.toEqual(
      { ledger_id: "alice/main", ledger_repo_id: 42 },
    );
    expect(resolve).toHaveBeenCalledWith({ name: "alice/main" });
  });

  it("keeps a colon inside the ledger part of the account id", async () => {
    const resolve = jest.fn(async () => ({ repoId: 1 }));
    await ledgerPinClaims("usr_1:alice/we:ird", resolve);
    expect(resolve).toHaveBeenCalledWith({ name: "alice/we:ird" });
  });

  it("issues no pin claims, and does no lookup, for an unpinned grant", async () => {
    const resolve = jest.fn();
    await expect(ledgerPinClaims("usr_1", resolve)).resolves.toEqual({
      ledger_id: undefined,
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("leaves the repository out when the pinned ledger no longer exists", async () => {
    await expect(
      ledgerPinClaims("usr_1:alice/gone", async () => null),
    ).resolves.toEqual({ ledger_id: "alice/gone", ledger_repo_id: undefined });
  });

  it("lets a failed lookup refuse the token instead of issuing it unpinned", async () => {
    await expect(
      ledgerPinClaims("usr_1:alice/main", async () => {
        throw new Error("lookup down");
      }),
    ).rejects.toThrow(/lookup down/);
  });
});
