import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";
import { LedgerJournalService } from "../ledger-journal-service";

/**
 * w1/337: the account journal valued an income or expenses account's whole
 * running inventory at each entry's date, so two 100 EUR trips at 1.00 and
 * 2.00 USD ran to 400 USD while the trial balance, which values flows on
 * their own date since w1/m49, read 300. The register (REST, GraphQL and the
 * MCP `ledgerRegister` resource) reads this journal. A flow's running balance
 * is now the sum of each entry's change, valued on that entry's date.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/travel", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2026-01-01",
  account,
  currencies: [],
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});
const txn = (date: string, postings: Posting[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "synthetic",
  tags: [],
  links: [],
  postings,
});
const price = (date: string, number: string): DirectiveJson => ({
  type: "price",
  date,
  currency: "EUR",
  amount: { number, currency: "USD" },
});
const trip = (date: string): DirectiveJson =>
  txn(date, [
    units("Expenses:Travel", "100.00", "EUR"),
    units("Assets:Euro", "-100.00", "EUR"),
  ]);

/** w1/m49's repro, with a 3.00 quote after the last posting. */
const TRAVEL: DirectiveJson[] = [
  ...["Assets:Euro", "Expenses:Travel", "Equity:Opening"].map(open),
  price("2026-01-01", "1.00"),
  txn("2026-01-02", [
    units("Assets:Euro", "1000.00", "EUR"),
    units("Equity:Opening", "-1000.00", "EUR"),
  ]),
  trip("2026-01-15"),
  price("2026-02-01", "2.00"),
  trip("2026-02-15"),
  price("2026-03-01", "3.00"),
];

function configure(directives: DirectiveJson[]) {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": 'option "operating_currency" "USD"\n' },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
    ref: "HEAD",
  });
  jest.mocked(parseLedgerFiles).mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
}

/** The account journal's running balances after each transaction, oldest first. */
async function balances(
  account: string,
  conversion: string,
  time?: string,
): Promise<Array<Record<string, string>>> {
  const journal = await new LedgerJournalService(
    factory as never,
    {} as never,
  ).getAccountJournal({
    ...params,
    query: { account, conversion, ...(time === undefined ? {} : { time }) },
  });
  return journal.items
    .filter((item) => item.entry.directive_type === "Transaction")
    .map((item) => item.balance)
    .reverse();
}

async function trialTotal(
  account: string,
  time?: string,
): Promise<Record<string, string>> {
  const report = await new LedgerFinanceService(
    factory as never,
    {} as never,
  ).getTrialBalance({ ...params, ...(time === undefined ? {} : { time }) });
  const find = (
    node: SerializableTreeNodePublic,
  ): SerializableTreeNodePublic | undefined =>
    node.account === account
      ? node
      : node.children.map(find).find((found) => found !== undefined);
  const tree = account.startsWith("Expenses")
    ? report.expenses_hierarchy_data
    : report.assets_hierarchy_data;
  return find(tree)?.balance_children ?? {};
}

beforeEach(() => jest.clearAllMocks());

describe("the account journal values a flow on its own date (w1/337)", () => {
  it.each(["Expenses:Travel", "Expenses"])(
    "runs %s to the trial balance's 300, not 400 or 600",
    async (account) => {
      configure(TRAVEL);
      const rows = await balances(account, "USD");

      expect(rows).toEqual([{ USD: "100.0000" }, { USD: "300.0000" }]);
      expect(rows.at(-1)).toEqual(await trialTotal(account));
    },
  );

  it("ends a window at the window's trial balance", async () => {
    configure(TRAVEL);
    const rows = await balances("Expenses:Travel", "USD", "2026-02");

    expect(rows).toEqual([{ USD: "200.0000" }]);
    expect(rows.at(-1)).toEqual(await trialTotal("Expenses:Travel", "2026-02"));
  });

  it("keeps a flow with no quote on its day in its own commodity", async () => {
    configure(TRAVEL.filter((directive) => directive.date !== "2026-01-01"));
    const rows = await balances("Expenses:Travel", "USD");

    expect(rows).toEqual([
      { EUR: "100.00" },
      { EUR: "100.00", USD: "200.0000" },
    ]);
  });

  it("keeps the units of a flow under units and at_cost", async () => {
    configure(TRAVEL);
    for (const conversion of ["units", "at_cost"]) {
      expect(await balances("Expenses:Travel", conversion)).toEqual([
        { EUR: "100.00" },
        { EUR: "200.00" },
      ]);
    }
  });

  it("still values a balance's whole holding at each entry's date", async () => {
    configure(TRAVEL);

    expect(await balances("Assets:Euro", "USD")).toEqual([
      { USD: "1000.0000" },
      { USD: "900.0000" },
      { USD: "1600.0000" },
    ]);
  });
});
