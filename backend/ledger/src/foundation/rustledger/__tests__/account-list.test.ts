import type { DirectiveJson } from "@rustledger/wasm";
import { collectLedgerAccounts } from "@/foundation/rustledger/account-list";
import golden from "./account-list.golden.json";

/**
 * GOLDEN VALUES (account-list.golden.json) were produced by the REAL fava-slim +
 * beancount via the in-repo venv, replicating `AccountsModule.load_file`
 * (fava/modules/accounts.py) — the exact map `getLedgerAccounts` returns:
 *
 *   cd backend-cluster/beancount-ledger
 *   ./.venv/bin/python -c "
 *     from beancount import loader
 *     from fava.beans.abc import Open, Close
 *     entries, _e, _o = loader.load_string(SOURCE)
 *     accounts = {}
 *     for e in entries:
 *       if isinstance(e, Open):  accounts.setdefault(e.account, {'close_date': None})
 *     for e in entries:
 *       if isinstance(e, Close):
 *         accounts.setdefault(e.account, {'close_date': None})
 *         accounts[e.account]['close_date'] = e.date.isoformat()"
 *
 * DIRECTIVE FIXTURES below mirror the REAL rustledger WASM parse of the same
 * sources — captured live from `Ledger.fromFiles(...).getDirectives()` (which,
 * like fava, runs beancount's plugins first, so the `auto_accounts` ledger's
 * synthesised `Open`s are present). Both halves are hard-coded so the pure
 * primitive is asserted against a Fava-exact target without loading WASM under
 * jest.
 *
 * Only the account SET + `close_date` are golden-validated (the load-bearing
 * outputs); `meta`/`last_entry`/`uptodate_status`/`balance_string` are best-effort
 * per account-list.ts's ACCEPTED GAP note and are checked structurally below.
 */

function open(account: string, currencies: string[] = []): DirectiveJson {
  return { type: "open", date: "2020-01-01", account, currencies };
}

function close(account: string, date: string): DirectiveJson {
  return { type: "close", date, account };
}

/** Project the primitive's output onto the `{ close_date }`-only golden shape. */
function toCloseDateMap(
  result: Record<string, { close_date: string | null }>,
): Record<string, { close_date: string | null }> {
  const out: Record<string, { close_date: string | null }> = {};
  Object.entries(result).forEach(([account, data]) => {
    out[account] = { close_date: data.close_date };
  });
  return out;
}

describe("collectLedgerAccounts", () => {
  it("returns {} for an empty directive list", () => {
    expect(collectLedgerAccounts([])).toEqual({});
  });

  it("matches fava for explicit opens/closes (account set + close_date golden)", () => {
    // WASM getDirectives() for the EXPLICIT source (verified live): four opens in
    // source order, then Income:Salary + Assets:Savings closes.
    const directives: DirectiveJson[] = [
      open("Assets:Checking", ["USD"]),
      open("Expenses:Food"),
      open("Income:Salary"),
      open("Assets:Savings"),
      {
        type: "transaction",
        date: "2020-02-01",
        flag: "*",
        payee: "Grocery",
        narration: "Food",
        tags: [],
        links: [],
        postings: [
          {
            account: "Expenses:Food",
            units: { number: "50.00", currency: "USD" },
          },
          {
            account: "Assets:Checking",
            units: { number: "-50.00", currency: "USD" },
          },
        ],
      },
      close("Income:Salary", "2020-03-01"),
      close("Assets:Savings", "2021-01-01"),
    ];
    expect(toCloseDateMap(collectLedgerAccounts(directives))).toEqual(
      golden.explicit,
    );
  });

  it("matches fava for an auto_accounts ledger (plugin-synthesised opens)", () => {
    // WASM getDirectives() for the AUTO_ACCOUNTS source (verified live): the
    // auto_accounts plugin synthesises opens for Assets:Checking + Expenses:Food;
    // Assets:Checking is then closed.
    const directives: DirectiveJson[] = [
      open("Assets:Checking"),
      open("Expenses:Food"),
      {
        type: "transaction",
        date: "2020-02-01",
        flag: "*",
        narration: "Grocery",
        tags: [],
        links: [],
        postings: [
          {
            account: "Expenses:Food",
            units: { number: "50.00", currency: "USD" },
          },
          {
            account: "Assets:Checking",
            units: { number: "-50.00", currency: "USD" },
          },
        ],
      },
      close("Assets:Checking", "2020-03-01"),
    ];
    expect(toCloseDateMap(collectLedgerAccounts(directives))).toEqual(
      golden.auto_accounts,
    );
  });

  it("matches fava for a close with no matching open (setdefault path)", () => {
    // WASM getDirectives() for the CLOSE_NO_OPEN source (verified live).
    const directives: DirectiveJson[] = [
      open("Assets:Checking"),
      close("Assets:NeverOpened", "2020-05-01"),
    ];
    expect(toCloseDateMap(collectLedgerAccounts(directives))).toEqual(
      golden.close_no_open,
    );
  });

  it("produces the full AccountDataPublic shape with best-effort fields", () => {
    const directives: DirectiveJson[] = [
      {
        type: "open",
        date: "2020-01-01",
        account: "Assets:Checking",
        currencies: ["USD"],
        meta: { note: "primary" },
      },
      {
        type: "transaction",
        date: "2020-04-01",
        flag: "*",
        narration: "Deposit",
        tags: [],
        links: [],
        postings: [
          {
            account: "Assets:Checking",
            units: { number: "100.00", currency: "USD" },
          },
        ],
      },
    ];
    const result = collectLedgerAccounts(directives);
    expect(result["Assets:Checking"]).toEqual({
      close_date: null,
      meta: { note: "primary" },
      uptodate_status: null,
      balance_string: null,
      // date is byte-exact; entry_hash is the documented non-load-bearing gap.
      last_entry: { date: "2020-04-01", entry_hash: "" },
    });
  });

  it("strips beancount's automatic meta keys from the Open metadata", () => {
    const directives: DirectiveJson[] = [
      {
        type: "open",
        date: "2020-01-01",
        account: "Assets:Checking",
        currencies: [],
        meta: {
          filename: "/repo/main.bean",
          lineno: 3,
          keep: "yes",
        } as never,
      },
    ];
    expect(collectLedgerAccounts(directives)["Assets:Checking"].meta).toEqual({
      keep: "yes",
    });
  });

  it("does not attach last_entry to a close-only account", () => {
    const directives: DirectiveJson[] = [close("Assets:Gone", "2020-05-01")];
    expect(
      collectLedgerAccounts(directives)["Assets:Gone"].last_entry,
    ).toBeNull();
  });

  it("skips U-flagged unrealized transactions when choosing last_entry", () => {
    const directives: DirectiveJson[] = [
      {
        type: "open",
        date: "2020-01-01",
        account: "Assets:Broker",
        currencies: [],
      },
      {
        type: "transaction",
        date: "2020-04-01",
        flag: "*",
        narration: "Buy",
        tags: [],
        links: [],
        postings: [{ account: "Assets:Broker" }],
      },
      {
        type: "transaction",
        date: "2020-05-01",
        flag: "U",
        narration: "Unrealized gain",
        tags: [],
        links: [],
        postings: [{ account: "Assets:Broker" }],
      },
    ];

    expect(
      collectLedgerAccounts(directives)["Assets:Broker"].last_entry?.date,
    ).toBe("2020-04-01");
  });
});
