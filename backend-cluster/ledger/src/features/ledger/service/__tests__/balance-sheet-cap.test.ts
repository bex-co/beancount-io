import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";

/**
 * w21/710: Fava's `Tree.cap` gives the balance sheet a Conversions line (the
 * negated residual at cost) and an Unrealized line (gains at value). Without a
 * time filter the service had neither, so a multi-currency ledger's assets,
 * liabilities and equity did not net to zero, and at value no path showed the
 * gain. The parse is scripted (WASM-free).
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
const params = { ledgerId: "synthetic/company", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: [],
});
const txn = (date: string, postings: Posting[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "QA",
  tags: [],
  links: [],
  postings,
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});

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
    valid: true,
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

/** Assets + liabilities + equity, per currency, without zeros. */
function net(
  report: Awaited<ReturnType<LedgerFinanceService["getBalanceSheet"]>>,
) {
  const sum: Record<string, number> = {};
  for (const tree of [
    report.assets_hierarchy_data,
    report.liabilities_hierarchy_data,
    report.equity_hierarchy_data,
  ]) {
    for (const [currency, value] of Object.entries(tree.balance_children)) {
      sum[currency] = Number(((sum[currency] ?? 0) + Number(value)).toFixed(8));
    }
  }
  return Object.fromEntries(Object.entries(sum).filter(([, v]) => v !== 0));
}

const finance = () => new LedgerFinanceService(factory as never, {} as never);

describe("the balance sheet of a ledger that exchanged currencies", () => {
  beforeEach(() =>
    configure([
      ...["Assets:Usd", "Assets:Eur", "Expenses:Travel", "Equity:Open"].map(
        open,
      ),
      txn("2024-01-02", [
        units("Assets:Usd", "1000", "USD"),
        units("Equity:Open", "-1000", "USD"),
      ]),
      txn("2024-01-03", [
        {
          ...units("Assets:Eur", "100", "EUR"),
          price: { number: "1.1", currency: "USD" },
        },
        units("Assets:Usd", "-110", "USD"),
      ]),
      txn("2024-01-04", [
        units("Expenses:Travel", "50", "EUR"),
        units("Assets:Eur", "-50", "EUR"),
      ]),
    ]),
  );

  it.each([undefined, "2024"])(
    "nets to zero per currency and lists Conversions (time %s)",
    async (time) => {
      const report = await finance().getBalanceSheet({
        ...params,
        time,
        conversion: "at_cost",
      });
      expect(net(report)).toEqual({});
      expect(
        find(report.equity_hierarchy_data, "Equity:Conversions:Current")
          ?.balance_children,
      ).toEqual({ EUR: "-100", USD: "110" });
    },
  );
});

describe("the balance sheet of a lot worth more than it cost", () => {
  beforeEach(() =>
    configure([
      ...["Assets:Cash", "Assets:Broker", "Equity:Open"].map(open),
      txn("2024-01-02", [
        units("Assets:Cash", "1500", "USD"),
        units("Equity:Open", "-1500", "USD"),
      ]),
      txn("2024-01-03", [
        {
          ...units("Assets:Broker", "10", "VTI"),
          cost: { number: { kind: "per_unit", value: "150" }, currency: "USD" },
        },
        units("Assets:Cash", "-1500", "USD"),
      ]),
      {
        type: "price",
        date: "2024-02-01",
        currency: "VTI",
        amount: { number: "300", currency: "USD" },
      },
    ]),
  );

  it.each([undefined, "2024"])(
    "shows the gain as Unrealized at value (time %s)",
    async (time) => {
      const report = await finance().getBalanceSheet({
        ...params,
        time,
        conversion: "at_value",
      });
      expect(report.assets_hierarchy_data.balance_children).toEqual({
        USD: "3000",
      });
      expect(
        Number(
          find(report.equity_hierarchy_data, "Equity:Unrealized")
            ?.balance_children.USD,
        ),
      ).toBe(-1500);
      expect(net(report)).toEqual({});
    },
  );

  it("shows no gain at cost", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "at_cost",
    });
    expect(net(report)).toEqual({});
    expect(
      Number(
        find(report.equity_hierarchy_data, "Equity:Unrealized")
          ?.balance_children.USD ?? 0,
      ),
    ).toBe(0);
  });
});
