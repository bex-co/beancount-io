import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import {
  capitalGainsSurfaces,
  leg,
  transaction,
} from "./capital-gains-surfaces";

jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn().mockResolvedValue({}),
}));

/**
 * w1/323. Under `"NONE"` booking the engine matches no lot, so a sale
 * written `-5 ABC {100 USD} @ 200 USD` names no lot date and opens a new
 * negative lot beside the long ones. Read by its exact key, it was a short
 * opening: every surface answered no rows, though the ledger booked a
 * 500 USD gain. Each now reports it as the net holding it reduces, as
 * `bea report capital-gains` does. The stub answers the journal with the
 * rows the ledger service produces for the note's repro — the sale's cost
 * date is `""` — and its `time` read for 2026 keeps only the sale, so both
 * lots it runs against opened before the window.
 */
const bought = (hash: string, date: string, number: string) =>
  transaction(hash, date, "Buy", [
    {
      ...leg("Assets:Broker", "10", "ABC"),
      cost: { number, currency: "USD", date, label: null },
    },
    leg("Assets:Cash", `-${Number(number) * 10}`, "USD"),
  ]);
const sale = (cost: string) =>
  transaction("5ac0e7d1", "2026-02-01", "Sell", [
    {
      ...leg("Assets:Broker", "-5", "ABC"),
      cost: { number: cost, currency: "USD", date: "", label: null },
      price: { number: "200", currency: "USD" },
    },
    leg("Assets:Cash", "1000", "USD"),
    leg("Income:Gains", cost === "100" ? "-500" : "-375", "USD"),
  ]);
const lots = [
  bought("b150a3d4", "2025-03-10", "150"),
  bought("b100a3d4", "2025-01-10", "100"),
];

/** The sale's cost the journal answers: the lot's own, or an average. */
let saleCost = "100";

/** Newest first, as the ledger's journal answers. */
function journal(time: string | undefined) {
  if (time === undefined) return [sale(saleCost), ...lots];
  return time === "2026" ? [sale(saleCost)] : [];
}

const row = (fields: Record<string, unknown>) => ({
  account: "Assets:Broker",
  commodity: "ABC",
  sold: "2026-02-01",
  quantity: { number: "5", currency: "ABC" },
  proceeds: { number: "1000", currency: "USD" },
  ...fields,
});

describe("capital gains on a NONE sale that names no lot date", () => {
  // One schema per suite: type-graphql's metadata is process-wide.
  let f: Awaited<ReturnType<typeof capitalGainsSurfaces>>;
  beforeAll(async () => {
    f = await capitalGainsSurfaces(journal);
  });
  afterAll(async () => {
    await f.close();
  });

  it.each([
    ["the whole ledger", {}],
    ["a window after both lots opened", { time: "2026" }],
    ["the sale's own day", { fromDate: "2026-02-01", toDate: "2026-02-01" }],
  ])(
    "report the 500 USD sale of the 100 USD lot on REST, MCP and GraphQL for %s",
    async (_, query: Record<string, string>) => {
      saleCost = "100";
      const expected = {
        rows: [
          row({
            acquired: "2025-01-10",
            held_days: 387,
            long_held: true,
            basis: { number: "500", currency: "USD" },
            gain: { number: "500", currency: "USD" },
          }),
        ],
        totals: {
          one_year_or_less: {},
          more_than_one_year: { USD: "500" },
          holding_unknown: {},
        },
        unpriced_reductions: [],
      };
      const surfaces = await f.gains(query);
      expect(surfaces.rest).toEqual(expected);
      expect(surfaces.mcp).toEqual(expected);
      expect(surfaces.graphql).toEqual(expected);
    },
  );

  it("report a sale at an average cost with its holding unknown on every surface", async () => {
    saleCost = "125";
    const expected = {
      rows: [
        row({
          acquired: null,
          held_days: null,
          long_held: null,
          basis: { number: "625", currency: "USD" },
          gain: { number: "375", currency: "USD" },
        }),
      ],
      totals: {
        one_year_or_less: {},
        more_than_one_year: {},
        holding_unknown: { USD: "375" },
      },
      unpriced_reductions: [],
    };
    const surfaces = await f.gains({});
    expect(surfaces.rest).toEqual(expected);
    expect(surfaces.mcp).toEqual(expected);
    expect(surfaces.graphql).toEqual(expected);
  });
});
