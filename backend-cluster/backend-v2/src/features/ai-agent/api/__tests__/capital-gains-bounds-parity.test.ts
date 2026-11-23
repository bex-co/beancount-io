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
 * w31/060. `parseBound` validated `fromDate` / `toDate` via `Date.UTC`, which
 * maps years 0–99 to 1900–1999 and therefore refused every valid Beancount
 * calendar date in years `0001`–`0099` across REST, MCP, and GraphQL.
 */
const earlyLot = {
  number: "100",
  currency: "USD",
  date: "0050-01-10",
  label: null,
};
const earlyBuy = transaction("a0050buy", "0050-01-10", "Buy early", [
  { ...leg("Assets:Broker", "10", "HOOL"), cost: earlyLot },
  leg("Assets:Cash", "-1000", "USD"),
]);
const earlySaleShort = transaction("b0050sal", "0050-06-15", "Sell in 0050", [
  {
    ...leg("Assets:Broker", "-4", "HOOL"),
    cost: earlyLot,
    price: { number: "120", currency: "USD" },
  },
  leg("Assets:Cash", "480", "USD"),
  leg("Income:Gains", "-80", "USD"),
]);
const earlySaleLong = transaction("c0051sal", "0051-03-15", "Sell in 0051", [
  {
    ...leg("Assets:Broker", "-6", "HOOL"),
    cost: earlyLot,
    price: { number: "150", currency: "USD" },
  },
  leg("Assets:Cash", "900", "USD"),
  leg("Income:Gains", "-300", "USD"),
]);

function journal(time: string | undefined) {
  if (time === undefined) return [earlySaleLong, earlySaleShort, earlyBuy];
  return [];
}

const SHORT_ROW = {
  account: "Assets:Broker",
  commodity: "HOOL",
  acquired: "0050-01-10",
  sold: "0050-06-15",
  held_days: 156,
  long_held: false,
  quantity: { number: "4", currency: "HOOL" },
  proceeds: { number: "480", currency: "USD" },
  basis: { number: "400", currency: "USD" },
  gain: { number: "80", currency: "USD" },
};

const LONG_ROW = {
  account: "Assets:Broker",
  commodity: "HOOL",
  acquired: "0050-01-10",
  sold: "0051-03-15",
  held_days: 429,
  long_held: true,
  quantity: { number: "6", currency: "HOOL" },
  proceeds: { number: "900", currency: "USD" },
  basis: { number: "600", currency: "USD" },
  gain: { number: "300", currency: "USD" },
};

describe("capital gains date bounds in years 0001-0099 (w31/060)", () => {
  let f: Awaited<ReturnType<typeof capitalGainsSurfaces>>;
  beforeAll(async () => {
    f = await capitalGainsSurfaces(journal);
  });
  afterAll(async () => {
    await f.close();
  });

  it("accepts 0050-01-01..0050-12-31 bounds on REST, MCP, and GraphQL", async () => {
    const expected = {
      rows: [SHORT_ROW],
      totals: {
        one_year_or_less: { USD: "80" },
        more_than_one_year: {},
        holding_unknown: {},
      },
      unpriced_reductions: [],
    };
    const surfaces = await f.gains({
      fromDate: "0050-01-01",
      toDate: "0050-12-31",
    });
    expect(surfaces.rest).toEqual(expected);
    expect(surfaces.mcp).toEqual(expected);
    expect(surfaces.graphql).toEqual(expected);
  });

  it.each([
    [
      "0001-01-01 to 0099-12-31",
      { fromDate: "0001-01-01", toDate: "0099-12-31" },
    ],
    ["leap day 0004-02-29", { fromDate: "0004-02-29" }],
  ])(
    "accepts early-year bounds (%s) on REST, MCP, and GraphQL",
    async (_, query: Record<string, string>) => {
      const expected = {
        rows: [SHORT_ROW, LONG_ROW],
        totals: {
          one_year_or_less: { USD: "80" },
          more_than_one_year: { USD: "300" },
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

  it.each([
    ["year 0000 fromDate", { fromDate: "0000-01-01" }],
    ["year 0000 toDate", { toDate: "0000-01-01" }],
    ["impossible 0050-02-30", { fromDate: "0050-02-30" }],
    ["non-leap century 0100-02-29", { toDate: "0100-02-29" }],
    ["reversed early bounds", { fromDate: "0099-06-01", toDate: "0050-01-01" }],
  ])(
    "still refuses %s with BAD_USER_INPUT across REST, MCP, and GraphQL",
    async (_, query: Record<string, string>) => {
      const { rest, mcp, graphql } = await f.gainsError(query);
      expect(rest.status).toBe(400);
      expect(rest.body).toMatchObject({
        ok: false,
        error: { code: "BAD_USER_INPUT" },
      });
      expect(mcp).toMatchObject({
        code: -32602,
        data: { code: "BAD_USER_INPUT" },
      });
      expect(graphql.data).toBeNull();
      expect(graphql.formatted?.extensions).toMatchObject({
        code: "BAD_USER_INPUT",
      });
    },
  );
});
