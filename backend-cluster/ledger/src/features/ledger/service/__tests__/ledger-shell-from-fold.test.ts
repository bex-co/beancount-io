import type { QueryResult } from "@rustledger/wasm";
import { LedgerShellService } from "../ledger-shell-service";

const queryLedgerFilesResult = jest.fn();

jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  queryLedgerFilesResult: (...args: unknown[]) =>
    queryLedgerFilesResult(...args),
}));

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(async () => ({
    files: { "main.beancount": "" },
    entryPoint: "main.beancount",
  })),
}));

const SUCCESS: QueryResult = {
  columns: ["count(*)"],
  rows: [[2]],
  errors: [],
} as unknown as QueryResult;

// w23/153: `id` stays out of the wrap's inner list (the id guard would
// trip on every wrapped query, and outer `id` refuses before running).
const INNER =
  "date, flag, payee, narration, account, position, accounts, balance, cost, cost_currency, cost_date, cost_label, cost_number, currency, day, description, entry, filename, lineno, links, location, meta, month, number, other_accounts, posting_flag, price, tags, type, units, weight, year";

function makeService() {
  const giteaClientFactory = { getPublicApiClient: jest.fn(async () => ({})) };
  const cacheHelper = {} as never;
  return new LedgerShellService(
    giteaClientFactory as never,
    cacheHelper,
  ) as {
    queryShell(p: {
      ledgerId: string;
      userId: undefined;
      query: string;
    }): Promise<unknown>;
    queryShellText(p: {
      ledgerId: string;
      userId: undefined;
      query: string;
    }): Promise<unknown>;
  };
}

// w23/116: the full normalizer pipeline runs comments → unquote → terminator
// → fold, in that order. The fold must see the unquoted, unterminated query:
// unquoting first lets quoted columns classify, and the terminator first
// lets bare columns re-earn their folding `;` — the other order would strip
// a fold the terminator must not touch.
describe("LedgerShellService column-fold normalization", () => {
  beforeEach(() => {
    queryLedgerFilesResult.mockReset();
    queryLedgerFilesResult.mockResolvedValue(SUCCESS);
  });

  it("unquotes, strips, then wraps in queryShell", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: 'SELECT count(*) FROM "payee" LIMIT 1;',
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      `SELECT count(*) FROM (SELECT ${INNER} FROM payee)  LIMIT 1 `,
    );
  });

  it("unquotes, strips, then wraps in queryShellText", async () => {
    await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: 'SELECT count(*) FROM "payee" LIMIT 1;',
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      `SELECT count(*) FROM (SELECT ${INNER} FROM payee)  LIMIT 1 `,
    );
  });

  it("re-inserts the folding terminator for a bare column", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT count(*) FROM payee;",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM payee; ",
    );
  });

  it("leaves the dual accounts on the table path", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT account FROM accounts ORDER BY account LIMIT 2",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT account FROM accounts ORDER BY account LIMIT 2",
    );
  });
});
