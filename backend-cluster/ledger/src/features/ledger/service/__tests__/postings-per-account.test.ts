import type { DirectiveJson } from "@rustledger/wasm";
import { filterDirectives } from "@/foundation/rustledger/directive-filter";
import { accountEntryCounts } from "@/features/ledger/utils/account-entries";
import { toPostingsPerAccountPublic } from "../ledger-data-mappers";

/**
 * Domain contract for Statistics postings-per-account: after account/filter
 * selection (and the service's clamp for time), count every posting on the
 * retained entries — including counterpart accounts — sort by account, omit
 * zeros.
 */
const MARGIN = "Liabilities:Crypto:Binance:Margin";
const BTC = "Assets:Crypto:Binance:BTC";
const USD = "Assets:Crypto:Binance:USD";
const CHECKING = "Assets:Bank:Checking";
const STAKING = "Income:Crypto:Staking";

function txn(
  date: string,
  postings: Array<{ account: string; number: string; currency?: string }>,
): DirectiveJson {
  return {
    type: "transaction",
    date,
    flag: "*",
    payee: "",
    narration: "",
    tags: [],
    links: [],
    postings: postings.map((p) => ({
      account: p.account,
      units: { number: p.number, currency: p.currency ?? "USD" },
    })),
  };
}

const LEDGER: DirectiveJson[] = [
  { type: "open", date: "2024-01-01", account: MARGIN, currencies: [] },
  { type: "open", date: "2024-01-01", account: BTC, currencies: [] },
  { type: "open", date: "2024-01-01", account: USD, currencies: [] },
  { type: "open", date: "2024-01-01", account: CHECKING, currencies: [] },
  { type: "open", date: "2024-01-01", account: STAKING, currencies: [] },
  // Two Margin transactions (the journal-page reproducer): each touches Margin
  // plus one counterpart.
  txn("2025-03-01", [
    { account: MARGIN, number: "-1" },
    { account: BTC, number: "1", currency: "BTC" },
  ]),
  txn("2025-03-02", [
    { account: MARGIN, number: "-100" },
    { account: USD, number: "100" },
  ]),
  // Unrelated activity that must disappear under the Margin account filter.
  txn("2025-01-10", [
    { account: CHECKING, number: "-50" },
    { account: STAKING, number: "50" },
  ]),
  txn("2025-02-01", [
    { account: CHECKING, number: "-10" },
    { account: STAKING, number: "10" },
  ]),
];

function countsFor(directives: DirectiveJson[]) {
  return toPostingsPerAccountPublic(accountEntryCounts(directives));
}

describe("postings-per-account filtered counts", () => {
  it("counts every posting including counterparts for the Margin selection", () => {
    const filtered = filterDirectives(LEDGER, { account: MARGIN });
    expect(countsFor(filtered)).toEqual([
      { account: BTC, count: 1 },
      { account: USD, count: 1 },
      { account: MARGIN, count: 2 },
    ]);
  });

  it("omits unrelated accounts when the account filter is set", () => {
    const accounts = countsFor(
      filterDirectives(LEDGER, { account: MARGIN }),
    ).map((row) => row.account);
    expect(accounts).not.toContain(CHECKING);
    expect(accounts).not.toContain(STAKING);
  });

  it("counts repeated postings to the same account across entries", () => {
    const filtered = filterDirectives(LEDGER, { account: CHECKING });
    expect(countsFor(filtered)).toEqual([
      { account: CHECKING, count: 2 },
      { account: STAKING, count: 2 },
    ]);
  });

  it("returns whole-ledger nonzero counts with empty/default filters", () => {
    expect(countsFor(filterDirectives(LEDGER, {}))).toEqual([
      { account: CHECKING, count: 2 },
      { account: BTC, count: 1 },
      { account: USD, count: 1 },
      { account: STAKING, count: 2 },
      { account: MARGIN, count: 2 },
    ]);
  });

  it("omits opened-but-never-posted accounts", () => {
    const withOrphan: DirectiveJson[] = [
      ...LEDGER,
      {
        type: "open",
        date: "2024-01-01",
        account: "Assets:Orphan",
        currencies: [],
      },
    ];
    const accounts = countsFor(withOrphan).map((row) => row.account);
    expect(accounts).not.toContain("Assets:Orphan");
  });

  it("sorts rows by account name", () => {
    const accounts = countsFor(LEDGER).map((row) => row.account);
    expect(accounts).toEqual([...accounts].sort());
  });
});
