import "reflect-metadata";

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
 * w1/307. The hosted capital-gains report read only negative postings, so
 * a short opening was listed as a two-unit sale at zero gain and the cover
 * that realized 20 USD was never read. `bea report capital-gains` reports
 * the cover alone (w5/1035); every hosted surface now does too. The stub
 * answers the journal with the rows the ledger produced for the repro: a
 * NONE-booked account opens `-2 HOOL {100 USD} @ 100 USD`, then covers one
 * unit at 80 USD. Its `time` read keeps only the cover, as `2026-01-05`'s
 * window does, so the lot it closes opened before the window.
 */
const lot = { number: "100", currency: "USD", date: "2026-01-02", label: null };
const cover = transaction("864bbced", "2026-01-05", "Cover one", [
  {
    ...leg("Assets:Broker", "1", "HOOL"),
    cost: lot,
    price: { number: "80", currency: "USD" },
  },
  leg("Assets:Cash", "-80", "USD"),
  leg("Income:Gains", "-20", "USD"),
]);
const openShort = transaction("44ff72a9", "2026-01-02", "Open short", [
  {
    ...leg("Assets:Broker", "-2", "HOOL"),
    cost: lot,
    price: { number: "100", currency: "USD" },
  },
  leg("Assets:Cash", "200", "USD"),
]);

/** Newest first, as the ledger's journal answers. */
function journal(time: string | undefined) {
  if (time === undefined) return [cover, openShort];
  return time === "2026-01-05" ? [cover] : [];
}

const COVER_ROW = {
  account: "Assets:Broker",
  commodity: "HOOL",
  acquired: "2026-01-02",
  sold: "2026-01-05",
  held_days: 3,
  long_held: false,
  quantity: { number: "1", currency: "HOOL" },
  proceeds: { number: "100", currency: "USD" },
  basis: { number: "80", currency: "USD" },
  gain: { number: "20", currency: "USD" },
};

describe("capital gains on a short position", () => {
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
    ["a window after the short opened", { time: "2026-01-05" }],
    ["the cover's own day", { fromDate: "2026-01-05", toDate: "2026-01-05" }],
  ])(
    "report only the cover's 20 USD on REST, MCP and GraphQL for %s",
    async (_, query: Record<string, string>) => {
      const expected = {
        rows: [COVER_ROW],
        totals: {
          one_year_or_less: { USD: "20" },
          more_than_one_year: {},
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

  it("realize nothing on any surface while the short only opens", async () => {
    const empty = {
      rows: [],
      totals: {
        one_year_or_less: {},
        more_than_one_year: {},
        holding_unknown: {},
      },
      unpriced_reductions: [],
    };
    const surfaces = await f.gains({ toDate: "2026-01-04" });
    expect(surfaces.rest).toEqual(empty);
    expect(surfaces.mcp).toEqual(empty);
    expect(surfaces.graphql).toEqual(empty);
  });
});
