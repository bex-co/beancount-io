import {
  filterLedgers,
  getDrawerLedgers,
  getLedgerOwner,
  groupLedgersByOwner,
} from "../drawer-ledgers";

const personal = {
  id: "1",
  name: "example",
  fullName: "puncsky/example",
  private: true,
};
const publicLedger = {
  id: "2",
  name: "minimax",
  fullName: "open_ledger/minimax",
  private: false,
};

describe("drawer ledger selection", () => {
  it("leaves a listed ledger where it sits when it is the open one", () => {
    const ledgers = [personal, publicLedger];
    expect(getDrawerLedgers(ledgers, "2")).toEqual([personal, publicLedger]);
    expect(ledgers).toEqual([personal, publicLedger]);
  });

  it("recognizes a canonical link to a listed ledger without duplicating or moving it", () => {
    expect(
      getDrawerLedgers([personal, publicLedger], publicLedger.fullName),
    ).toEqual([personal, publicLedger]);
  });

  it("includes a public ledger missing from the user's collection", () => {
    expect(
      getDrawerLedgers([personal], publicLedger.fullName, publicLedger),
    ).toEqual([publicLedger, personal]);
  });

  it("shows a link's identity while its visibility is still unknown", () => {
    const [current] = getDrawerLedgers([], publicLedger.fullName);
    expect(current).toEqual({
      id: publicLedger.fullName,
      fullName: publicLedger.fullName,
      name: publicLedger.name,
    });
    expect(current.private).toBe(undefined);
  });

  it("does not reuse the previous ledger's metadata after switching", () => {
    expect(getDrawerLedgers([], "new-owner/new-book", publicLedger)).toEqual([
      {
        id: "new-owner/new-book",
        fullName: "new-owner/new-book",
        name: "new-book",
      },
    ]);
  });

  it("does not invent a canonical URL for an unresolved opaque ID", () => {
    expect(getDrawerLedgers([personal], "unresolved-id")).toEqual([personal]);
  });

  it("preserves the list and empty state when nothing is selected", () => {
    expect(getDrawerLedgers([personal, publicLedger], null)).toEqual([
      personal,
      publicLedger,
    ]);
    expect(getDrawerLedgers([], null)).toEqual([]);
  });
});

describe("drawer owner groups", () => {
  it("reads the owner off a full name", () => {
    expect(getLedgerOwner("open_ledger/minimax")).toBe("open_ledger");
    expect(getLedgerOwner("puncsky/example")).toBe("puncsky");
  });

  it("falls back to the whole name when there is no owner segment", () => {
    expect(getLedgerOwner("example")).toBe("example");
  });

  it("names the account above its ledgers even when there is only one", () => {
    const sections = groupLedgersByOwner([
      publicLedger,
      { ...publicLedger, id: "3", fullName: "open_ledger/adyen" },
    ]);

    expect(sections.map((section) => section.owner)).toEqual(["open_ledger"]);
    expect(sections[0].data.map((ledger) => ledger.fullName)).toEqual([
      "open_ledger/minimax",
      "open_ledger/adyen",
    ]);
  });

  it("keeps the accounts in the collection's order whichever ledger is open", () => {
    const groups = (selectedId: string) =>
      groupLedgersByOwner(
        getDrawerLedgers([personal, publicLedger], selectedId),
      ).map((section) => ({
        owner: section.owner,
        ledgers: section.data.map((ledger) => ledger.id),
      }));

    const inCollectionOrder = [
      { owner: "puncsky", ledgers: ["1"] },
      { owner: "open_ledger", ledgers: ["2"] },
    ];
    expect(groups(personal.id)).toEqual(inCollectionOrder);
    expect(groups(publicLedger.id)).toEqual(inCollectionOrder);
  });

  it("groups every ledger of an account together, first appearance winning", () => {
    expect(
      groupLedgersByOwner([
        { id: "1", fullName: "personal/checking" },
        { id: "2", fullName: "shared/home" },
        { id: "3", fullName: "personal/investing" },
      ]).map((section) => ({
        owner: section.owner,
        ledgers: section.data.map((ledger) => ledger.id),
      })),
    ).toEqual([
      { owner: "personal", ledgers: ["1", "3"] },
      { owner: "shared", ledgers: ["2"] },
    ]);
  });

  it("has no groups to show for an empty collection", () => {
    expect(groupLedgersByOwner([])).toEqual([]);
  });
});

describe("drawer ledger filter", () => {
  const collection = [personal, publicLedger];

  it("matches a ledger name whoever owns it", () => {
    expect(filterLedgers(collection, "mini")).toEqual([publicLedger]);
  });

  it("matches an account name, bringing up that account's books", () => {
    expect(filterLedgers(collection, "open_ledger")).toEqual([publicLedger]);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(filterLedgers(collection, "  MiNiMax ")).toEqual([publicLedger]);
  });

  it("keeps every ledger for an empty or blank query", () => {
    expect(filterLedgers(collection, "")).toEqual(collection);
    expect(filterLedgers(collection, "   ")).toEqual(collection);
  });

  it("keeps the matches in the list's own order", () => {
    expect(filterLedgers(collection, "e")).toEqual([personal, publicLedger]);
  });

  it("matches nothing rather than everything when the query is unknown", () => {
    expect(filterLedgers(collection, "walmart")).toEqual([]);
  });
});
