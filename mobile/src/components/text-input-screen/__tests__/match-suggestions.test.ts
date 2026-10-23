import { matchSuggestions } from "../match-suggestions";

// w21/257: the suggestions list used `toLowerCase().includes()` and the raw
// string as its key, so "iş" never matched "İşBank ATM", a composed "café"
// never matched an NFD "Café Central", and the two spellings were two rows.
describe("matchSuggestions", () => {
  it("matches a Turkish capital İ by its lower-case spelling", () => {
    expect(matchSuggestions(["İşBank ATM"], "iş", 30)).toEqual(["İşBank ATM"]);
    expect(matchSuggestions(["İşBank ATM"], "işbank", 30)).toEqual([
      "İşBank ATM",
    ]);
  });

  it("matches NFD text with an NFC query, and the other way round", () => {
    const nfd = "Café Central";
    expect(matchSuggestions([nfd], "café", 30)).toEqual([nfd]);
    expect(matchSuggestions(["Café Central"], "café", 30)).toEqual([
      "Café Central",
    ]);
  });

  it("shows the NFC and NFD spellings of one payee as one row, as first written", () => {
    expect(matchSuggestions(["Café Central", "Café Central"], "", 30)).toEqual([
      "Café Central",
    ]);
  });

  it("shows spellings that differ only in runs of whitespace as one row, and finds it by a single-spaced query (w21/509)", () => {
    const rows = ["Qa Whole Foods", "Qa Whole  Foods"];
    expect(matchSuggestions(rows, "", 30)).toEqual(["Qa Whole Foods"]);
    expect(matchSuggestions(["Qa Whole  Foods"], "whole foods", 30)).toEqual([
      "Qa Whole  Foods",
    ]);
  });

  it("finds a straight apostrophe by the curly one Smart Punctuation types (w21/519)", () => {
    expect(matchSuggestions(["Trader Joe's"], "Trader Joe\u2019", 30)).toEqual([
      "Trader Joe's",
    ]);
    expect(
      matchSuggestions(["Trader Joe's", "Trader Joe\u2019s"], "", 30),
    ).toEqual(["Trader Joe's"]);
  });

  it("keeps the plain behaviour: trim, drop empties, substring, limit", () => {
    expect(
      matchSuggestions([" Coffee ", "", "  ", "Tea", "coffee"], "cof", 30),
    ).toEqual(["Coffee", "coffee"]);
    expect(matchSuggestions(["a", "b", "c"], "", 2)).toEqual(["a", "b"]);
    expect(matchSuggestions(undefined, "x", 5)).toEqual([]);
    expect(matchSuggestions(["Tea"], "  ", 5)).toEqual(["Tea"]);
  });
});

// w21/835: a Persian keyboard's ی and ک against the Arabic ي and ك.
describe("matchSuggestions across Arabic-script spellings", () => {
  const arabic = "Qa كافي شاپ";

  it("finds the Arabic spelling from Persian typing", () => {
    expect(matchSuggestions([arabic], "کافی", 30)).toEqual([arabic]);
  });

  it("lists the two spellings as one row", () => {
    expect(matchSuggestions(["Qa کافی شاپ", arabic], "", 30)).toEqual([
      "Qa کافی شاپ",
    ]);
  });
});
