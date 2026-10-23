import fs from "fs";
import path from "path";
import { searchForLedger } from "../scoped-search";

// w21/786: a journal link replaced the filters and kept the search typed
// before it, so the linked account and month could read "No transactions
// match". The var and the tab need the native runtime; their wiring is
// checked on the source.
describe("searchForLedger", () => {
  const typed = { ledgerId: "alice/books", text: "cafe", reset: 0 };

  it("keeps the search on its ledger until a link resets it", () => {
    expect(searchForLedger(typed, "alice/books", 0)).toBe("cafe");
    expect(searchForLedger(typed, "alice/books", 1)).toBe("");
    expect(searchForLedger(typed, "alice/other", 0)).toBe("");
  });

  it("keeps a search typed after the link", () => {
    expect(searchForLedger({ ...typed, reset: 1 }, "alice/books", 1)).toBe(
      "cafe",
    );
  });
});

describe("a journal link's filters", () => {
  const read = (...parts: string[]) =>
    fs.readFileSync(path.join(__dirname, ...parts), "utf8").replace(/\s+/g, "");

  it("empty the search box when they replace the filters", () => {
    const vars = read("..", "var.ts");
    const set = vars.slice(
      vars.indexOf("functionsetTransactionFiltersForLedger("),
    );
    expect(
      set.includes("transactionSearchResetVar(transactionSearchResetVar()+1);"),
    ).toBe(true);
  });

  it("reach the tab's search, typed and debounced", () => {
    const tab = read("..", "..", "transactions-screen.tsx");
    expect(
      tab.includes(
        "constsearchReset=useReactiveVar(transactionSearchResetVar);",
      ),
    ).toBe(true);
    expect(
      tab.includes("searchForLedger(scopedSearch,ledgerId,searchReset)"),
    ).toBe(true);
    expect(
      tab.includes(
        "searchForLedger(useDebouncedValue(scopedSearch,300),ledgerId,searchReset,)",
      ),
    ).toBe(true);
    expect(
      tab.includes("setScopedSearch({ledgerId,text,reset:searchReset})"),
    ).toBe(true);
  });
});
