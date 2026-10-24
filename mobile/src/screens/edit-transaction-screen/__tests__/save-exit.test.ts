import { applySavedIdentity, resolveSaveExit } from "../save-exit";

describe("resolveSaveExit", () => {
  it("returns to the detail screen re-keyed with the new hash", () => {
    expect(resolveSaveExit("old-hash", "new-hash")).toEqual({
      kind: "detail",
      entryHash: "new-hash",
    });
  });

  // w21/251: the hash omits meta and sorts postings, so these edits keep it.
  it("goes back to the same detail when the entry kept its hash", () => {
    expect(resolveSaveExit("same-hash", "same-hash")).toEqual({
      kind: "unchanged",
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

describe("the edit screen's exits", () => {
  it("goes back to the detail when the entry kept its identity", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "edit-transaction-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(source.includes('elseif(here&&exit.kind==="unchanged"){')).toBe(
      true,
    );
    expect(
      source.includes(
        "if(router.canGoBack())router.back();elserouter.dismiss(2);",
      ),
    ).toBe(true);
  });
});

// w21/253: Edit on an entry changed elsewhere opened a blank "Failed to load
// transaction" sheet with no way on, every time.
describe("the editor's first load of a changed entry", () => {
  const source = require("fs")
    .readFileSync(
      require("path").join(__dirname, "..", "edit-transaction-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("treats a NOT_FOUND context as the removed state", () => {
    expect(
      source.includes(
        "constcontextGone=!initialized&&isEntryGone(contextError);",
      ),
    ).toBe(true);
    expect(
      source.includes(
        "if(entryGone||contextGone){return(<RouteLedgerUnavailable",
      ),
    ).toBe(true);
  });

  it("invalidates the ledger so the detail behind shows it on return", () => {
    expect(
      source.includes(
        'useEffect(()=>{if(contextGone)voidinvalidateLedgerData(client,"entries");},[contextGone,client]);',
      ),
    ).toBe(true);
  });
});

// w21/937: after a save that stayed on screen, the target moved to H2 while the
// detail screen behind still held the route's H1.
describe("resolveSaveExit against the route's ID", () => {
  it("returns to the detail screen, re-keyed, when the saved ID is not the one it holds", () => {
    const routeEntryHash = "H1";
    const target = applySavedIdentity(
      { entryHash: routeEntryHash, sha256sum: "s1" },
      { entryHash: "H2", newSha256sum: "s2" },
    );
    expect(target.entryHash).toBe("H2");
    // A comment-only save keeps H2: compared with the target it read
    // "unchanged"; compared with the route's ID it is the detail's H2.
    expect(resolveSaveExit(target.entryHash, "H2")).toEqual({
      kind: "unchanged",
    });
    expect(resolveSaveExit(routeEntryHash, "H2")).toEqual({
      kind: "detail",
      entryHash: "H2",
    });
  });

  it("is decided against the route's ID in the screen", () => {
    const source = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "edit-transaction-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'constexit=resolveSaveExit(entryHash??"",saved.entryHash);',
      ),
    ).toBe(true);
  });
});
