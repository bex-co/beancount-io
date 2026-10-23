import fs from "fs";
import path from "path";
import {
  entryLocation,
  relocatedEntryId,
  sameDayTransactionIds,
} from "../relocate-entry";

// w21/823: after a change elsewhere the entry's content-hash ID was gone, so
// Copy & Reload landed on "changed or removed" with the draft on the
// clipboard and nowhere to paste it.
describe("finding a changed entry again", () => {
  const cafe = {
    payee: "Cafe",
    narration: "latte",
    postings: [{ account: "Expenses:Food" }, { account: "Assets:Cash" }],
  };
  const context = (
    lineno: number,
    filename = "main.bean",
    entry: Record<string, unknown> = cafe,
  ) => ({
    date: "2026-10-20",
    meta: { filename, lineno },
    ...entry,
  });
  const at = entryLocation(context(12))!;

  it("reads where a context says its entry is written, and what it is", () => {
    expect(at).toEqual({
      filename: "main.bean",
      lineno: 12,
      date: "2026-10-20",
      payee: "Cafe",
      narration: "latte",
      accounts: ["Assets:Cash", "Expenses:Food"],
    });
    expect(entryLocation({ date: "2026-10-20" })).toBe(null);
    expect(entryLocation(null)).toBe(null);
  });

  it("looks only at that day's transactions", () => {
    expect(
      sameDayTransactionIds(
        [
          {
            entry_hash: "a",
            date: "2026-10-20",
            directive_type: "Transaction",
          },
          {
            entry_hash: "b",
            date: "2026-10-21",
            directive_type: "Transaction",
          },
          { entry_hash: "c", date: "2026-10-20", directive_type: "Balance" },
          {
            entry_hash: "d",
            date: "2026-10-20",
            directive_type: "Transaction",
          },
        ],
        "2026-10-20",
      ),
    ).toEqual(["a", "d"]);
  });

  it("takes the one entry still at its file and line", () => {
    expect(
      relocatedEntryId(
        [
          { entryHash: "lunch-15", location: entryLocation(context(12)) },
          { entryHash: "other", location: entryLocation(context(20)) },
        ],
        at,
      ),
    ).toBe("lunch-15");
  });

  it("leaves twins and a deletion unresolved", () => {
    expect(
      relocatedEntryId(
        [
          { entryHash: "a", location: entryLocation(context(12)) },
          { entryHash: "b", location: entryLocation(context(12)) },
        ],
        at,
      ),
    ).toBe(null);
    expect(
      relocatedEntryId(
        [{ entryHash: "other", location: entryLocation(context(20)) }],
        at,
      ),
    ).toBe(null);
    expect(
      relocatedEntryId(
        [
          {
            entryHash: "elsewhere",
            location: entryLocation(context(12, "b.bean")),
          },
        ],
        at,
      ),
    ).toBe(null);
  });

  // w21/852: A was deleted elsewhere and B, the next entry of the day, moved up
  // into A's line.
  it("does not adopt a different entry that moved into the old line", () => {
    const rent = {
      payee: "Landlord",
      narration: "rent",
      postings: [{ account: "Expenses:Rent" }, { account: "Assets:Bank" }],
    };
    expect(
      relocatedEntryId(
        [
          {
            entryHash: "rent",
            location: entryLocation(context(12, "main.bean", rent)),
          },
        ],
        at,
      ),
    ).toBe(null);
  });

  it("still adopts the entry after an edit of its amount, narration or accounts", () => {
    // Amounts are not part of what recognises it.
    expect(
      relocatedEntryId(
        [{ entryHash: "edited", location: entryLocation(context(12)) }],
        at,
      ),
    ).toBe("edited");
    // A new narration, the same accounts.
    expect(
      relocatedEntryId(
        [
          {
            entryHash: "renamed",
            location: entryLocation(
              context(12, "main.bean", { ...cafe, narration: "flat white" }),
            ),
          },
        ],
        at,
      ),
    ).toBe("renamed");
    // New accounts, the same payee and narration.
    expect(
      relocatedEntryId(
        [
          {
            entryHash: "recategorised",
            location: entryLocation(
              context(12, "main.bean", {
                ...cafe,
                postings: [
                  { account: "Expenses:Coffee" },
                  { account: "Assets:Cash" },
                ],
              }),
            ),
          },
        ],
        at,
      ),
    ).toBe("recategorised");
  });

  it("is how Reload, and Copy & Reload, find it", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "edit-transaction-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    const reload = screen.slice(
      screen.indexOf("consthandleReload=useCallback("),
    );
    expect(
      reload.includes(
        "constmoved=awaitrelocateEntry();if(moved){entryHashRef.current=moved.entryHash;context=moved.context;}}if(!context){setHasUnsavedChanges(false);setEntryGone(true);",
      ),
    ).toBe(true);
    expect(
      screen.split("locationRef.current=entryLocation(context.entry);").length -
        1,
    ).toBe(2);
    // Copy & Reload goes through the same reload.
    const copy = screen.slice(
      screen.indexOf("constcopyThenReload=useCallback("),
    );
    expect(copy.includes("awaithandleReload();")).toBe(true);
  });
});
