import { groupLedgersByOwner } from "../group-ledgers-by-owner";

type TestLedger = {
  id: string;
  fullName: string;
};

const ledger = (id: string, fullName: string): TestLedger => ({ id, fullName });

describe("groupLedgersByOwner", () => {
  it("shows one owner section for multiple ledgers", () => {
    const sections = groupLedgersByOwner([
      ledger("1", "open_ledger/adyn"),
      ledger("2", "open_ledger/airbnb"),
    ]);

    expect(sections.map((section) => section.owner)).toEqual(["open_ledger"]);
    expect(sections[0].data.map((item) => item.fullName)).toEqual([
      "open_ledger/adyn",
      "open_ledger/airbnb",
    ]);
  });

  it("preserves first-seen owner order and ledger order within each owner", () => {
    const sections = groupLedgersByOwner([
      ledger("1", "personal/checking"),
      ledger("2", "shared/home"),
      ledger("3", "personal/investing"),
    ]);

    expect(
      sections.map((section) => ({
        owner: section.owner,
        ledgers: section.data.map((item) => item.id),
      })),
    ).toEqual([
      { owner: "personal", ledgers: ["1", "3"] },
      { owner: "shared", ledgers: ["2"] },
    ]);
  });

  it("returns no sections when there are no ledgers", () => {
    expect(groupLedgersByOwner([])).toEqual([]);
  });
});
