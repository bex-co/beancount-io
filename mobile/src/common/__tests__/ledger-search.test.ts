import fs from "fs";
import path from "path";
import { ledgerMatchesQuery } from "../ledger-search";
import { filterLedgers as filterDrawer } from "../../components/ledger-drawer/drawer-ledgers";
import { filterLedgers as filterBrowse } from "../../screens/ledger-selection/discovery-store";

// w21/244: the drawer's filter was one substring match on owner/name, so
// "my book" (what people type for `my-book`) and a word from the description
// found nothing there while Browse ledgers found the ledger.
describe("ledger search", () => {
  const book = {
    id: "1",
    fullName: "qa/my-book",
    description: "Household budget",
    private: true,
  };
  const other = {
    id: "2",
    fullName: "qa/work",
    description: "Invoices",
    private: false,
  };
  const ledgers = [book, other];

  it("finds my-book for the four queries in the note", () => {
    for (const query of ["my book", "book my", "qa my-book", "household"]) {
      expect(ledgerMatchesQuery(book, query)).toBe(true);
      expect(filterDrawer(ledgers, query).map((l) => l.id)).toEqual(["1"]);
      expect(filterBrowse(ledgers, query).map((l) => l.id)).toEqual(["1"]);
    }
  });

  it("still finds a ledger by a substring of its name, whoever owns it", () => {
    expect(filterDrawer(ledgers, "work").map((l) => l.id)).toEqual(["2"]);
    expect(filterDrawer(ledgers, "qa/").map((l) => l.id)).toEqual(["1", "2"]);
    expect(filterDrawer(ledgers, "my-bo").map((l) => l.id)).toEqual(["1"]);
  });

  it("needs every word, not just one", () => {
    expect(filterDrawer(ledgers, "my invoices")).toEqual([]);
    expect(filterDrawer(ledgers, "zzz")).toEqual([]);
  });

  it("matches everything for an empty query, in the list's own order", () => {
    expect(filterDrawer(ledgers, "  ").map((l) => l.id)).toEqual(["1", "2"]);
    expect(filterDrawer([], "x")).toEqual([]);
  });

  it("works for a drawer ledger with no description", () => {
    expect(filterDrawer([{ fullName: "qa/book" }], "qa book").length).toBe(1);
  });

  it("is asked for the description by the directory query", () => {
    const query = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "graphql",
        "queries",
        "ledgerDirectory.graphql",
      ),
      "utf8",
    );
    expect(/\bdescription\b/.test(query)).toBe(true);
  });
});

// w21/966: the ledger filter was literal about quotes, Unicode form, width and
// Arabic script, unlike every other search.
describe("ledgerMatchesQuery folds as the other searches do", () => {
  const rows: [string, string][] = [
    ["Mom’s household", "Mom's"],
    ["Mom's household", "Mom’s"],
    ["Café budget", "café"],
    ["İstanbul expenses", "istanbul"],
    ["ＦＸ trades", "fx"],
    ["كافي شاپ", "کافی"],
    ["Costco‎ run", "costco"],
  ];

  it("finds each description from the other way of writing it", () => {
    for (const [description, query] of rows) {
      expect([
        description,
        query,
        ledgerMatchesQuery({ fullName: "me/book", description }, query),
      ]).toEqual([description, query, true]);
    }
  });

  it("still misses a word that is not there, and keeps the word split", () => {
    expect(
      ledgerMatchesQuery(
        { fullName: "me/my-book", description: "Mom’s household" },
        "work",
      ),
    ).toBe(false);
    expect(
      ledgerMatchesQuery(
        { fullName: "me/my-book", description: null },
        "my book",
      ),
    ).toBe(true);
  });
});
