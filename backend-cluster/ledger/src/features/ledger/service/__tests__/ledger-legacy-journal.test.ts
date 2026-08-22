import type { DirectiveJson } from "@rustledger/wasm";
import {
  runLegacyJournal,
  serialiseV1Directive,
} from "@/features/ledger/service/ledger-legacy-journal";

const tx = (
  date: string,
  narration: string,
  amount: string,
  payee = "P",
): DirectiveJson =>
  ({
    type: "transaction",
    date,
    flag: "*",
    payee,
    narration,
    tags: [],
    links: [],
    meta: {},
    postings: [
      {
        account: "Expenses:Food",
        units: { number: amount, currency: "USD" },
      },
      {
        account: "Assets:Cash",
        units: { number: `-${amount}`, currency: "USD" },
      },
    ],
  }) as unknown as DirectiveJson;

const noLocations = new Map<string, { filename: string; lineno: number }>();
const idsOf = (ds: DirectiveJson[]) =>
  new Map(ds.map((d, i) => [d, `id-${i}`]));

describe("serialiseV1Directive", () => {
  it("folds tags/links into narration and renders position strings", () => {
    const directive = {
      ...tx("2024-01-01", "lunch", "10"),
      tags: ["trip"],
      links: ["l1"],
    } as unknown as DirectiveJson;
    const out = serialiseV1Directive(directive);
    expect(out.type).toBe("Transaction");
    expect(out.narration).toBe("lunch #trip ^l1");
    expect((out.postings as Array<{ amount: string }>)[0].amount).toBe(
      "10 USD",
    );
  });

  it("renders Event with description only (type overwritten, Python parity)", () => {
    const out = serialiseV1Directive({
      type: "event",
      date: "2024-01-01",
      name: "location",
      value: "Paris",
      meta: {},
    } as unknown as DirectiveJson);
    expect(out.type).toBe("Event");
    expect(out.description).toBe("Paris");
    expect(out).not.toHaveProperty("name");
  });
});

describe("runLegacyJournal", () => {
  const ds = [
    tx("2024-01-01", "a", "10"),
    tx("2024-02-01", "b", "30"),
    tx("2024-03-01", "c", "20"),
  ];

  it("sorts desc by date by default and honours first/last", () => {
    const out = runLegacyJournal(ds, { first: 2 }, idsOf(ds), noLocations);
    expect(out.map((e) => e.narration)).toEqual(["c", "b"]);
    const lastTwo = runLegacyJournal(ds, { last: 2 }, idsOf(ds), noLocations);
    expect(lastTwo.map((e) => e.narration)).toEqual(["b", "a"]);
  });

  it("sorts by amount ascending", () => {
    const out = runLegacyJournal(
      ds,
      { sortBy: "amount", sortOrder: "asc" },
      idsOf(ds),
      noLocations,
    );
    expect(out.map((e) => e.narration)).toEqual(["a", "c", "b"]);
  });

  it("applies date cursors exclusively and amount range filters", () => {
    const afterFirst = runLegacyJournal(
      ds,
      { after: "2024-01-01", sortOrder: "asc" },
      idsOf(ds),
      noLocations,
    );
    expect(afterFirst.map((e) => e.narration)).toEqual(["b", "c"]);

    const ranged = runLegacyJournal(
      ds,
      { amountMin: 15, amountMax: 25 },
      idsOf(ds),
      noLocations,
    );
    expect(ranged.map((e) => e.narration)).toEqual(["c"]);
  });

  it("detailed mode adds entry_hash/entry_type and strips source meta", () => {
    const withMeta = [
      {
        ...tx("2024-01-01", "a", "10"),
        meta: { note: "keep" },
      } as unknown as DirectiveJson,
    ];
    const ids = idsOf(withMeta);
    const out = runLegacyJournal(
      withMeta,
      { detailed: true },
      ids,
      noLocations,
    );
    expect(out[0].entry_hash).toBe("id-0");
    expect(out[0].entry_type).toBe("transaction");
    expect(out[0].meta).toEqual({ note: "keep" });
  });

  it("falls back to substring matching on an invalid account regex", () => {
    const out = runLegacyJournal(
      ds,
      { accountFilter: "[expenses" },
      idsOf(ds),
      noLocations,
    );
    expect(out).toHaveLength(0); // substring "[expenses" matches nothing — and no crash
  });
});
