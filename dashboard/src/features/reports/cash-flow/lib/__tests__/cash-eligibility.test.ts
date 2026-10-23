import { describe, expect, it } from "vitest";
import { cashActivityFilter } from "../cash-eligibility";
import {
  type AccountMetaMap,
  cashAccountMembership,
  toAccountMetaMap,
} from "../model";
import { ledgerAccountRoots } from "../account-roots";

/** The meta map the page builds from these accounts' `open` directives. */
const meta = (
  accounts: string[],
  declared: Record<string, Record<string, unknown>> = {},
): AccountMetaMap =>
  toAccountMetaMap(
    accounts.map((account) => ({ account, meta: declared[account] ?? null })),
  );

/**
 * Only a transaction with a cash posting is cash activity (w4/m56). Cash
 * membership comes from the ledger's own account list — a filtered report's
 * closing hierarchy can hold no cash account — and narrows the reader's
 * filter for the activity reads.
 */
describe("cashAccountMembership", () => {
  // The public example ledger's accounts, abridged.
  const EXAMPLE = [
    "Assets:US:BofA:Checking",
    "Assets:US:ETrade:Cash",
    "Assets:US:ETrade:ITOT",
    "Assets:US:Vanguard:Cash",
    "Assets:US:Vanguard:VBMPX",
    "Expenses:Food:Restaurant",
    "Liabilities:US:Chase:Slate",
  ];

  it("resolves the cash accounts a filter leaves out of the closing hierarchy", () => {
    expect(cashAccountMembership(meta(EXAMPLE))).toEqual([
      "Assets:US:BofA:Checking",
      "Assets:US:ETrade:Cash",
      "Assets:US:Vanguard:Cash",
    ]);
  });

  it("lets a declared role decide, and a cash parent carry down", () => {
    const accounts = meta(
      [...EXAMPLE, "Assets:Wallet", "Assets:Wallet:Coins"],
      {
        "Assets:US:ETrade:Cash": { "cash-flow-role": "investing" },
        "Assets:Wallet": { "cash-flow-role": "cash" },
      },
    );
    expect(cashAccountMembership(accounts)).toEqual([
      "Assets:US:BofA:Checking",
      "Assets:US:Vanguard:Cash",
      "Assets:Wallet",
      "Assets:Wallet:Coins",
    ]);
  });

  it("reads a renamed asset root as Assets and ignores other roots", () => {
    const roots = ledgerAccountRoots({ nameAssets: "Actifs" });
    expect(
      cashAccountMembership(
        meta(["Actifs:Bank:Checking", "Actifs:Fund", "Expenses:Cash"]),
        roots,
      ),
    ).toEqual(["Actifs:Bank:Checking"]);
  });

  it("is empty for a ledger with no cash account", () => {
    expect(
      cashAccountMembership(meta(["Assets:House", "Equity:Opening"])),
    ).toEqual([]);
  });
});

describe("cashActivityFilter", () => {
  it("selects transactions posting to any cash account, one exact pattern each", () => {
    expect(
      cashActivityFilter("", ["Assets:Bank:Checking", "Assets:Cash"]),
    ).toBe('any(account:"^Assets:Bank:Checking$", account:"^Assets:Cash$")');
  });

  it("keeps the reader's filter, parenthesized so its OR stays inside", () => {
    expect(
      cashActivityFilter(" #trip-los-angeles-2016, #home ", ["Assets:Cash"]),
    ).toBe('(#trip-los-angeles-2016, #home) any(account:"^Assets:Cash$")');
  });

  it("escapes pattern syntax so a name matches only itself", () => {
    expect(cashActivityFilter(undefined, ["Assets:Cash.Box"])).toBe(
      'any(account:"^Assets:Cash\\.Box$")',
    );
  });

  it("matches no transaction, rather than every one, without cash accounts", () => {
    expect(cashActivityFilter("#trip", [])).toBe('(#trip) any(account:"^$")');
  });
});
