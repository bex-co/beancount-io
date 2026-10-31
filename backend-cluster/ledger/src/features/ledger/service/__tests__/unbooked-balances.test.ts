import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import {
  markUnbookedDirective,
  parseLedgerFiles,
} from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";
import { LedgerJournalService } from "../ledger-journal-service";

/**
 * w21/678: a sale that matches no lot is reported ("No matching lot"), but the
 * engine keeps it half booked and every balance counted it: cash +600, broker
 * -5 VTI, no gains, so the trial balance did not sum to zero. Beancount drops
 * such an entry. The parse is scripted (WASM-free); the engine's own marking is
 * checked against the real engine by `unbookedTransactions`' cases and the
 * milestone's live probe.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Tree = SerializableTreeNodePublic;
type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/qa", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2026-01-01",
  account,
  currencies: [],
});
const txn = (
  date: string,
  narration: string,
  postings: Posting[],
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration,
  tags: [],
  links: [],
  postings,
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});

function fixture(): DirectiveJson[] {
  const sell = txn("2026-03-01", "QA Sell", [
    {
      ...units("Assets:Broker", "-5", "VTI"),
      cost: { number: { kind: "per_unit", value: "101.00" }, currency: "USD" },
      price: { number: "120.00", currency: "USD" },
    },
    units("Assets:BrCash", "600.00", "USD"),
    { account: "Income:Gains" },
  ]);
  markUnbookedDirective(sell);
  return [
    ...["Assets:Broker", "Assets:BrCash", "Equity:Opening", "Income:Gains"].map(
      open,
    ),
    txn("2026-01-02", "QA Fund", [
      units("Assets:BrCash", "5000.00", "USD"),
      units("Equity:Opening", "-5000.00", "USD"),
    ]),
    txn("2026-02-01", "QA Buy", [
      {
        ...units("Assets:Broker", "10", "VTI"),
        cost: {
          number: { kind: "per_unit", value: "100.00" },
          currency: "USD",
          date: "2026-02-01",
        },
      },
      units("Assets:BrCash", "-1000.00", "USD"),
    ]),
    sell,
  ];
}

function configure(directives: DirectiveJson[]) {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": 'option "operating_currency" "USD"\n' },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  jest.mocked(parseLedgerFiles).mockResolvedValue({
    valid: false,
    errors: [],
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
}

function find(node: Tree, account: string): Tree | undefined {
  if (node.account === account) return node;
  for (const child of node.children) {
    const found = find(child, account);
    if (found) return found;
  }
  return undefined;
}

const finance = () => new LedgerFinanceService(factory as never, {} as never);

describe("a ledger with a sale that failed booking", () => {
  beforeEach(() => configure(fixture()));

  it("leaves the sale out of the trial balance, as Beancount does", async () => {
    const report = await finance().getTrialBalance({
      ...params,
      conversion: "at_cost",
    });
    const cash = find(report.assets_hierarchy_data, "Assets:BrCash");
    const broker = find(report.assets_hierarchy_data, "Assets:Broker");
    expect(cash?.balance).toEqual({ USD: "4000.00" });
    // 10 VTI at cost 100, none sold.
    expect(broker?.balance).toEqual({ USD: "1000" });
    // Nothing realized: the interpolated gains leg never existed.
    expect(find(report.income_hierarchy_data, "Income:Gains")?.balance).toEqual(
      {},
    );
  });

  it("still holds the 10 VTI in units", async () => {
    const report = await finance().getTrialBalance({
      ...params,
      conversion: "units",
    });
    expect(
      find(report.assets_hierarchy_data, "Assets:Broker")?.balance,
    ).toEqual({ VTI: "10" });
  });

  it("still counts nothing from it before a time window", async () => {
    const report = await finance().getTrialBalance({
      ...params,
      time: "2026-04",
      conversion: "at_cost",
    });
    expect(
      find(report.assets_hierarchy_data, "Assets:BrCash")?.balance,
    ).toEqual({ USD: "4000.00" });
  });
});

describe("the account journal of a ledger with a sale that failed booking", () => {
  beforeEach(() => configure(fixture()));
  const journal = () => new LedgerJournalService(factory as never, {} as never);

  it("lists the sale but moves no running balance", async () => {
    const result = await journal().getAccountJournal({
      ...params,
      query: { account: "Assets:BrCash", conversion: "units" },
    });
    const rows = result.items.map((row) => ({
      narration: (row.entry as { narration?: string }).narration,
      balance: row.balance,
    }));
    expect(rows.map((row) => row.narration)).toEqual([
      "QA Sell",
      "QA Buy",
      "QA Fund",
    ]);
    // Newest first: the sale shows the balance as it stood, 4000.
    expect(rows[0].balance).toEqual({ USD: "4000.00" });
    expect(rows[1].balance).toEqual({ USD: "4000.00" });
  });
});
