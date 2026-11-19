import BigNumber from "bignumber.js";
import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import type {
  SerializableTreeNodePublic,
  TrialBalanceDataPublic,
} from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";

/**
 * w1/291: valued at market, the hosted trial balance's five trees did not net
 * (Assets 1,109.00 USD against Equity -1,000.00 USD), and with a time filter
 * the clamp's conversion booking split equity another way (-1,009.00). It now
 * carries `bea`'s `valuation_adjustment` line and folds that booking into it,
 * so every valued form nets and splits equity alike with and without `time`.
 * The fixture is w1/287's repro, scripted (WASM-free).
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
const params = { ledgerId: "synthetic/trial", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: [],
});
const txn = (date: string, postings: Posting[], flag = "*"): DirectiveJson => ({
  type: "transaction",
  date,
  flag,
  narration: "synthetic",
  tags: [],
  links: [],
  postings,
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});
const price = (currency: string, number: string): DirectiveJson => ({
  type: "price",
  date: "2024-01-31",
  currency,
  amount: { number, currency: "USD" },
});

/** w1/287's repro: a lot bought at 100, quoted at 120; EUR bought at 1.10, quoted at 1.20. */
const HOLDINGS: DirectiveJson[] = [
  ...[
    "Assets:Wallet",
    "Assets:Euro",
    "Assets:Broker",
    "Equity:Opening-Balances",
  ].map(open),
  txn("2024-01-02", [
    units("Assets:Wallet", "1000.00", "USD"),
    units("Equity:Opening-Balances", "-1000.00", "USD"),
  ]),
  txn("2024-01-10", [
    {
      ...units("Assets:Broker", "5", "AAPL"),
      cost: { number: { kind: "per_unit", value: "100.00" }, currency: "USD" },
    },
    units("Assets:Wallet", "-500.00", "USD"),
  ]),
  txn("2024-01-20", [
    {
      ...units("Assets:Euro", "90.00", "EUR"),
      price: { number: "1.10", currency: "USD" },
    },
    units("Assets:Wallet", "-99.00", "USD"),
  ]),
  price("AAPL", "120.00"),
  price("EUR", "1.20"),
];

/** A ledger with no holdings and no priced exchange: a working control. */
const PLAIN: DirectiveJson[] = [
  ...["Assets:Bank", "Equity:Opening-Balances", "Expenses:Food"].map(open),
  txn("2024-01-02", [
    units("Assets:Bank", "1000.00", "USD"),
    units("Equity:Opening-Balances", "-1000.00", "USD"),
  ]),
  txn("2024-01-05", [
    units("Expenses:Food", "12.00", "USD"),
    units("Assets:Bank", "-12.00", "USD"),
  ]),
];

function configure(directives: DirectiveJson[], errors: BeancountError[] = []) {
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
    valid: errors.length === 0,
    errors,
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
}

const finance = () => new LedgerFinanceService(factory as never, {} as never);

const ROOTS = [
  "assets_hierarchy_data",
  "liabilities_hierarchy_data",
  "equity_hierarchy_data",
  "income_hierarchy_data",
  "expenses_hierarchy_data",
] as const;

/** Per-currency sum of balance maps, exact, zeros dropped. */
function sum(...balances: Array<Record<string, string> | null>) {
  const total = new Map<string, BigNumber>();
  for (const balance of balances) {
    for (const [currency, value] of Object.entries(balance ?? {})) {
      total.set(
        currency,
        (total.get(currency) ?? new BigNumber(0)).plus(value),
      );
    }
  }
  return Object.fromEntries(
    [...total]
      .filter(([, value]) => !value.isZero())
      .map(([currency, value]) => [currency, value.toFixed()]),
  );
}

/** The five roots plus the adjustment line. */
const net = (report: TrialBalanceDataPublic) =>
  sum(
    ...ROOTS.map((root) => report[root].balance_children),
    report.valuation_adjustment,
  );

function accounts(node: Tree): string[] {
  return [node.account, ...node.children.flatMap(accounts)];
}

function find(node: Tree, account: string): Tree | undefined {
  if (node.account === account) return node;
  for (const child of node.children) {
    const found = find(child, account);
    if (found) return found;
  }
  return undefined;
}

const FORMS = [
  { form: "market", conversion: undefined, time: undefined },
  { form: "market, time", conversion: undefined, time: "2024-01" },
  { form: "at cost", conversion: "at_cost", time: undefined },
  { form: "at cost, time", conversion: "at_cost", time: "2024-01" },
];
const LINE: Record<string, Record<string, string>> = {
  market: { USD: "-109.0000" },
  "at cost": { EUR: "-90.00", USD: "99.00" },
};

describe("a valued trial balance of holdings and a priced exchange (w1/291)", () => {
  beforeEach(() => configure(HOLDINGS));

  it.each(FORMS)(
    "nets through the adjustment line, which takes the clamp's conversion ($form)",
    async ({ form, conversion, time }) => {
      const report = await finance().getTrialBalance({
        ...params,
        conversion,
        time,
      });

      expect(report.valuation_adjustment).toEqual(
        LINE[form.replace(", time", "")],
      );
      expect(net(report)).toEqual({});
      expect(report.equity_hierarchy_data.balance_children).toEqual({
        USD: "-1000.00",
      });
      expect(accounts(report.equity_hierarchy_data)).not.toContain(
        "Equity:Conversions:Current",
      );
    },
  );

  it.each([undefined, "at_cost", "at_value"])(
    "splits equity the same with and without a time filter (%s)",
    async (conversion) => {
      const plain = await finance().getTrialBalance({ ...params, conversion });
      const ranged = await finance().getTrialBalance({
        ...params,
        conversion,
        time: "2024-01",
      });

      expect(ranged.equity_hierarchy_data).toEqual(plain.equity_hierarchy_data);
      expect(ranged.valuation_adjustment).toEqual(plain.valuation_adjustment);
      expect(net(ranged)).toEqual({});
    },
  );

  it.each(FORMS)(
    "is what the balance sheet's equity holds beyond booked equity and earnings ($form)",
    async ({ conversion, time }) => {
      const trial = await finance().getTrialBalance({
        ...params,
        conversion,
        time,
      });
      const sheet = await finance().getBalanceSheet({
        ...params,
        conversion,
        time,
      });

      expect(sum(sheet.equity_hierarchy_data.balance_children)).toEqual(
        sum(
          trial.equity_hierarchy_data.balance_children,
          trial.income_hierarchy_data.balance_children,
          trial.expenses_hierarchy_data.balance_children,
          trial.valuation_adjustment,
        ),
      );
    },
  );

  it.each(["units", "units_by_cost"])(
    "derives no line under %s and keeps the conversions row",
    async (conversion) => {
      const report = await finance().getTrialBalance({
        ...params,
        conversion,
        time: "2024-01",
      });

      expect(report.valuation_adjustment).toBeNull();
      expect(accounts(report.equity_hierarchy_data)).toContain(
        "Equity:Conversions:Current",
      );
    },
  );

  it("withholds the line while the ledger has an error", async () => {
    configure(HOLDINGS, [
      {
        message: "Transaction does not balance",
        severity: "error",
      } as BeancountError,
    ]);

    const report = await finance().getTrialBalance(params);

    expect(report.valuation_adjustment).toBeNull();
  });

  it("keeps the line when the ledger has only warnings", async () => {
    configure(HOLDINGS, [
      {
        message: "Single-posting entry",
        severity: "warning",
      } as BeancountError,
    ]);

    const report = await finance().getTrialBalance(params);

    expect(report.valuation_adjustment).toEqual({ USD: "-109.0000" });
  });
});

describe("the adjustment line elsewhere (w1/291)", () => {
  it("is empty for books that already net", async () => {
    configure(PLAIN);

    for (const time of [undefined, "2024-01"]) {
      const report = await finance().getTrialBalance({ ...params, time });
      expect(report.valuation_adjustment).toEqual({});
      expect(net(report)).toEqual({});
    }
  });

  it("is withheld while a root holds a commodity the currency cannot value", async () => {
    configure([
      ...HOLDINGS,
      open("Assets:Points"),
      txn("2024-01-25", [
        units("Assets:Points", "50", "PTS"),
        units("Equity:Opening-Balances", "-50", "PTS"),
      ]),
    ]);

    const report = await finance().getTrialBalance(params);

    expect(report.assets_hierarchy_data.balance_children).toHaveProperty("PTS");
    expect(report.valuation_adjustment).toBeNull();
  });

  it("leaves a conversion the ledger wrote itself in equity", async () => {
    configure([
      ...HOLDINGS,
      open("Equity:Conversions:Current"),
      txn(
        "2024-01-25",
        [
          units("Assets:Wallet", "1.00", "USD"),
          units("Equity:Conversions:Current", "-1.00", "USD"),
        ],
        "C",
      ),
    ]);

    for (const time of [undefined, "2024-01"]) {
      const report = await finance().getTrialBalance({ ...params, time });
      expect(
        find(report.equity_hierarchy_data, "Equity:Conversions:Current")
          ?.balance_children,
      ).toEqual({ USD: "-1.00" });
      expect(net(report)).toEqual({});
    }
  });
});
