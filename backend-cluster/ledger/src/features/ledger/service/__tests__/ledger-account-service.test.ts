import type { DirectiveJson } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerAccountService } from "../ledger-account-service";
import { LedgerDataService } from "../ledger-data-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

function fixture(directives: DirectiveJson[], source = "") {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": source },
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
  const client = { getPublicApiClient: jest.fn().mockResolvedValue({}) };
  return {
    accounts: new LedgerAccountService(client as never, {} as never),
    statistics: new LedgerDataService(client as never, {} as never),
  };
}

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: ["USD"],
});
const close = (account: string): DirectiveJson => ({
  type: "close",
  date: "2024-05-01",
  account,
});
const transfer = (
  date: string,
  from: string,
  to: string,
  amount: string,
): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "Transfer",
  tags: [],
  links: [],
  postings: [
    { account: from, units: { number: `-${amount}`, currency: "USD" } },
    { account: to, units: { number: amount, currency: "USD" } },
  ],
});

it("counts each directive that uses an account while preserving posting counts", async () => {
  const names = {
    posting: "Assets:Posted",
    balance: "Assets:Asserted",
    note: "Assets:Noted",
    document: "Assets:Documented",
    target: "Assets:Padded",
    source: "Equity:PadSource",
    custom: "Expenses:Budgeted",
    unused: "Assets:Unused",
  };
  const date = "2024-04-01";
  const usd = { number: "0", currency: "USD" };
  const { accounts } = fixture([
    ...Object.values(names).map(open),
    transfer(date, names.posting, names.posting, "2"),
    { type: "balance", date, account: names.balance, amount: usd },
    { type: "note", date, account: names.note, comment: "Still used" },
    { type: "document", date, account: names.document, path: "evidence.pdf" },
    { type: "pad", date, account: names.target, source_account: names.source },
    {
      type: "custom",
      date,
      custom_type: "budget",
      values: [
        { type: "account", value: names.custom },
        { type: "account", value: names.custom },
        { type: "string", value: names.unused },
      ],
    },
    close(names.unused),
  ]);
  const rows = await accounts.getAccountDirectives("owner", "book");
  expect(
    rows.map(({ account, entryCount, referenceCount }) => ({
      account,
      entryCount,
      referenceCount,
    })),
  ).toEqual(
    Object.values(names).map((account) => ({
      account,
      entryCount: account === names.posting ? 2 : 0,
      referenceCount: account === names.unused ? 0 : 1,
    })),
  );
});

describe("account directive balances", () => {
  const cash = "Assets:Cash";
  const frozen = "Assets:Qa:Frozen";
  const retired = "Assets:Qa:Retired";
  const equity = "Equity:Opening";
  const income = "Income:Salary";
  const expenses = "Expenses:Other";
  const ledger = [
    ...[cash, frozen, retired, equity, income, expenses].map(open),
    transfer("2024-01-02", equity, cash, "100.00"),
    transfer("2024-04-01", cash, retired, "10.00"),
    transfer("2024-04-02", cash, frozen, "10.00"),
    transfer("2024-04-15", retired, cash, "10.00"),
    close(frozen),
    close(retired),
  ];

  it("keeps funded and emptied closed accounts alongside open balances", async () => {
    const { accounts } = fixture(ledger);
    const result = await accounts.getAccountDirectives("owner", "book");
    const byAccount = Object.fromEntries(
      result.map((row) => [row.account, row]),
    );

    expect(byAccount[frozen]).toMatchObject({
      closedAt: "2024-05-01",
      entryCount: 1,
      balance: { USD: "10.00" },
    });
    expect(byAccount[retired]).toMatchObject({
      closedAt: "2024-05-01",
      entryCount: 2,
      balance: {},
    });
    expect(byAccount[cash]).toMatchObject({ balance: { USD: "90.00" } });
    for (const account of [equity, income, expenses]) {
      expect(byAccount[account]?.balance).toBeUndefined();
    }
  });

  it("computes a closed liability under the ledger's own root name", async () => {
    const liability = "Passif:Card";
    const asset = "Actif:Cash";
    const { accounts } = fixture(
      [
        open(liability),
        open(asset),
        transfer("2024-03-01", liability, asset, "12.00"),
        close(liability),
      ],
      'option "name_assets" "Actif"\noption "name_liabilities" "Passif"\n',
    );
    const result = await accounts.getAccountDirectives("owner", "book");
    expect(result.find((row) => row.account === liability)?.balance).toEqual({
      USD: "-12.00",
    });
  });

  it("leaves accounts ending in a close out of Statistics", async () => {
    const { statistics } = fixture(ledger);
    await expect(
      statistics.getAccountLastEntries({
        ledgerId: "owner/book",
        userId: undefined,
      }),
    ).resolves.toEqual([
      { account: cash, date: "2024-04-15", balance: { USD: "90.00" } },
    ]);
  });
});
