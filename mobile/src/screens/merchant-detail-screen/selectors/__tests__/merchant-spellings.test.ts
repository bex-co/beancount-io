import fs from "fs";
import path from "path";
import { merchantSpellings } from "../merchant-spellings";
import { filterExactPayee } from "../filter-exact-payee";
import { aggregatePayees } from "../../../merchants-screen/selectors/aggregate-payees";

/**
 * w21/724: after one of two "Qa20261020 Cafe" coffees was edited to
 * "QA20261020 CAFE", the detail kept the spelling it was opened with and read
 * one transaction, while Merchants merged both into one row of two.
 */
const rollup = (rows: [string, number][]) => ({
  types: [
    { name: "payee", dtype: "str" },
    { name: "transaction_count", dtype: "int" },
    { name: "first_date", dtype: "date" },
    { name: "last_date", dtype: "date" },
  ],
  rows: rows.map(([payee, count]) => [
    payee,
    count,
    "2026-10-01",
    "2026-10-20",
  ]),
});

describe("merchantSpellings", () => {
  it("follows the row the payee now belongs to, after a recasing edit", () => {
    const merchants = aggregatePayees(
      rollup([
        ["QA20261020 CAFE", 1],
        ["Qa20261020 Cafe", 1],
      ]),
    );
    const spellings = merchantSpellings(["Qa20261020 Cafe"], merchants);
    expect([...spellings].sort()).toEqual([
      "QA20261020 CAFE",
      "Qa20261020 Cafe",
    ]);
    const coffees = [
      { payee: "Qa20261020 Cafe", narration: "coffee" },
      { payee: "QA20261020 CAFE", narration: "coffee" },
    ];
    expect(filterExactPayee(coffees, spellings).length).toBe(2);
  });

  it("keeps the spellings it was opened with while they still hold, or no row has the payee", () => {
    const opened = ["Qa20261020 Cafe"];
    expect(
      merchantSpellings(
        opened,
        aggregatePayees(rollup([["Qa20261020 Cafe", 2]])),
      ),
    ).toBe(opened);
    expect(merchantSpellings(opened, [])).toBe(opened);
    expect(
      merchantSpellings(opened, aggregatePayees(rollup([["Someone else", 2]]))),
    ).toBe(opened);
  });

  it("is what the detail reads by, from the Merchants list's rollup", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "merchant-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes("query:PAYEE_ROLLUP_BQL")).toBe(true);
    expect(
      screen.includes(
        "merchantSpellings(opened,aggregatePayees(rollup?.queryShell?.table??null),)",
      ),
    ).toBe(true);
  });
});
