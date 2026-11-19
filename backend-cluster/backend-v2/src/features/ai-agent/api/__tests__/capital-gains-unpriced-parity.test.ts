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
 * w1/308. A sale to cash written without `@` books its gain through the
 * income leg, but the capital-gains report skipped every reduction without
 * a price, so its total no longer tied to the booked gains and a ledger
 * with only that sale read as no sales at all. Every hosted surface now
 * lists it in `unpriced_reductions`, as `bea report capital-gains` does;
 * the own-account transfer, which takes the shares back in within its
 * transaction, stays unlisted. The stub answers the journal with the
 * note's repro: buy 10 AAPL at 150 USD, move 2 to another account, sell 3
 * at 170 USD, then sell 5 for 900 USD with no price.
 */
const lot = { number: "150.00", currency: "USD", date: "2024-01-10" };
const unpricedSale = transaction("9f1c0d2e", "2024-03-11", "Sell", [
  { ...leg("Assets:Broker", "-5", "AAPL"), cost: lot },
  leg("Assets:Bank", "900.00", "USD"),
  leg("Income:Gains", "-150.00", "USD"),
]);
const pricedSale = transaction("51aa7b03", "2024-03-10", "Sell", [
  {
    ...leg("Assets:Broker", "-3", "AAPL"),
    cost: lot,
    price: { number: "170.00", currency: "USD" },
  },
  leg("Assets:Bank", "510.00", "USD"),
  leg("Income:Gains", "-60.00", "USD"),
]);
const ownTransfer = transaction("0c3d4e5f", "2024-02-01", "Transfer", [
  { ...leg("Assets:Broker", "-2", "AAPL"), cost: lot },
  { ...leg("Assets:Broker2", "2", "AAPL"), cost: lot },
]);
const buy = transaction("7e8f9a0b", "2024-01-10", "Buy", [
  { ...leg("Assets:Broker", "10", "AAPL"), cost: lot },
  leg("Assets:Bank", "-1500.00", "USD"),
]);

/** Newest first, as the ledger's journal answers; `2024-03` keeps both sales. */
function journal(time: string | undefined) {
  if (time === undefined) return [unpricedSale, pricedSale, ownTransfer, buy];
  return time === "2024-03" ? [unpricedSale, pricedSale] : [];
}

const PRICED_ROW = {
  account: "Assets:Broker",
  commodity: "AAPL",
  acquired: "2024-01-10",
  sold: "2024-03-10",
  held_days: 60,
  long_held: false,
  quantity: { number: "3", currency: "AAPL" },
  proceeds: { number: "510", currency: "USD" },
  basis: { number: "450", currency: "USD" },
  gain: { number: "60", currency: "USD" },
};
const UNPRICED = {
  date: "2024-03-11",
  entry_hash: "9f1c0d2e",
  account: "Assets:Broker",
  commodity: "AAPL",
  acquired: "2024-01-10",
  quantity: { number: "5", currency: "AAPL" },
  cost: { number: "150", currency: "USD" },
};
const NO_TOTALS = {
  one_year_or_less: {},
  more_than_one_year: {},
  holding_unknown: {},
};

describe("capital gains with a sale written without a price", () => {
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
    ["the month of both sales", { time: "2024-03" }],
  ])(
    "list the unpriced sale beside the priced row on REST, MCP and GraphQL for %s",
    async (_, query: Record<string, string>) => {
      const expected = {
        rows: [PRICED_ROW],
        totals: { ...NO_TOTALS, one_year_or_less: { USD: "60" } },
        unpriced_reductions: [UNPRICED],
      };
      const surfaces = await f.gains(query);
      expect(surfaces.rest).toEqual(expected);
      expect(surfaces.mcp).toEqual(expected);
      expect(surfaces.graphql).toEqual(expected);
    },
  );

  it("list it on every surface when it is the only sale in range", async () => {
    const expected = {
      rows: [],
      totals: NO_TOTALS,
      unpriced_reductions: [UNPRICED],
    };
    const surfaces = await f.gains({
      fromDate: "2024-03-11",
      toDate: "2024-03-11",
    });
    expect(surfaces.rest).toEqual(expected);
    expect(surfaces.mcp).toEqual(expected);
    expect(surfaces.graphql).toEqual(expected);
  });

  it("list nothing for the account the transfer moved shares into", async () => {
    const expected = { rows: [], totals: NO_TOTALS, unpriced_reductions: [] };
    const surfaces = await f.gains({ account: "Assets:Broker2" });
    expect(surfaces.rest).toEqual(expected);
    expect(surfaces.mcp).toEqual(expected);
    expect(surfaces.graphql).toEqual(expected);
  });
});
