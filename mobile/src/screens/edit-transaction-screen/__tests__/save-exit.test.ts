import { applySavedIdentity, resolveSaveExit } from "../save-exit";

describe("resolveSaveExit", () => {
  it("returns to the detail screen re-keyed with the new hash", () => {
    expect(resolveSaveExit("old-hash", "new-hash")).toEqual({
      kind: "detail",
      entryHash: "new-hash",
    });
  });

  it("lands on the journal when the server echoed the request hash", () => {
    // Pre-change servers echo the request; a newer server reports the same
    // hash only when the identity did not move. Both are safe on the journal.
    expect(resolveSaveExit("same-hash", "same-hash")).toEqual({
      kind: "journal",
    });
  });

  it("lands on the journal when no hash came back", () => {
    expect(resolveSaveExit("old-hash", undefined)).toEqual({
      kind: "journal",
    });
    expect(resolveSaveExit("old-hash", null)).toEqual({ kind: "journal" });
    expect(resolveSaveExit("old-hash", "")).toEqual({ kind: "journal" });
  });
});

describe("applySavedIdentity", () => {
  it("moves both the hash and the checksum to the saved entry", () => {
    expect(
      applySavedIdentity(
        { entryHash: "old-hash", sha256sum: "old-sha" },
        { entryHash: "new-hash", newSha256sum: "new-sha" },
      ),
    ).toEqual({ entryHash: "new-hash", sha256sum: "new-sha" });
  });

  it("keeps the current hash when the server reported none", () => {
    expect(
      applySavedIdentity(
        { entryHash: "old-hash", sha256sum: "old-sha" },
        { entryHash: "", newSha256sum: "new-sha" },
      ),
    ).toEqual({ entryHash: "old-hash", sha256sum: "new-sha" });
    expect(
      applySavedIdentity(
        { entryHash: "old-hash", sha256sum: "old-sha" },
        { entryHash: null, newSha256sum: "new-sha" },
      ),
    ).toEqual({ entryHash: "old-hash", sha256sum: "new-sha" });
  });
});
