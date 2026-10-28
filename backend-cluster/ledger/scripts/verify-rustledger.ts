/**
 * Live verification of the `@rustledger/wasm` engine through the real runtime
 * loader (the same path production uses). Run with:
 *
 *   yarn ts-node -r tsconfig-paths/register --transpile-only scripts/verify-rustledger.ts
 *
 * Prints each check and exits non-zero on the first failed assertion. This is
 * NOT a jest test — the live WASM path needs `--experimental-vm-modules` under
 * jest, so the fast unit tests cover only the pure mappers and this script
 * covers the end-to-end engine.
 */
import { deepStrictEqual } from "node:assert";
import type { BeancountError, CellValue, FileMap } from "@rustledger/wasm";
import {
  buildEntryIdMap,
  collectAttributes,
  closeRustledgerWorkerPool,
  collectDocuments,
  countDirectives,
  countLedgerDirectives,
  countLedgerDirectivesInProcess,
  createBookedBlockParser,
  entriesCountPerType,
  findEntrySlice,
  findEntrySliceWithFullLedger,
  formatSource,
  getDirectiveSourceId,
  getRustledgerVersion,
  hashEntry,
  parseLedgerFiles,
  parseLedgerFilesInProcess,
  queryLedgerFiles,
  queryLedgerFilesResult,
  withLedger,
} from "@/foundation/rustledger";
import {
  queryResultToShellResult,
  queryResultToText,
} from "@/features/ledger/service/ledger-shell-mappers";
import { stripBqlBlockComments } from "@/features/ledger/service/bql-comments";
import { foldBqlWhitespace } from "@/features/ledger/service/bql-whitespace";
import { extractSelectAliases } from "@/features/ledger/service/bql-select-aliases";
import { stripBqlStatementTerminator } from "@/features/ledger/service/bql-terminator";
import { unquoteBqlFromTables } from "@/features/ledger/service/bql-from-quotes";
import { normalizeBqlQueryForEngine } from "@/features/ledger/service/ledger-shell-service";
import { UNDECODABLE_SOURCE } from "@/foundation/rustledger/file-map-loader";
import { filterDirectives } from "@/foundation/rustledger/directive-filter";
import { assertEntryTokens } from "@/features/ledger/utils/entry-tokens";
import {
  checkTransactionBalance,
  scanInferredToleranceDefaults,
} from "@/features/ledger/utils/transaction-balance";
import { formatCellValue } from "@/foundation/rustledger/mappers";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import {
  accountBalanceSeries,
  accountHierarchy,
  buildPriceMap,
} from "@/foundation/rustledger";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
}

function singleFileRepoFactory(source: string) {
  return {
    getPublicApiClient: async () => ({
      repos: {
        repoGetAllCommits: async () => ({ data: [] }),
        getTree: async () => ({
          data: {
            tree: [{ path: "main.bean", type: "blob" }],
            truncated: false,
          },
        }),
        repoGetContents: async (
          _owner: string,
          _repo: string,
          path: string,
        ) => {
          if (path !== "main.bean")
            throw new Error(`Unexpected verification fixture path: ${path}`);
          return {
            data: {
              type: "file",
              encoding: "base64",
              content: Buffer.from(source).toString("base64"),
            },
          };
        },
      },
    }),
  };
}

/**
 * RAW WASM validity — deliberately BYPASSES the sanitization pre-pass
 * (`neutralizeIncludedOptionsAndPlugins` + fava-plugin stripping) that the
 * production `parseLedgerFiles` pipeline applies. Used below to CONTRAST raw
 * engine behavior with the sanitized report path; production code must derive
 * validity from `parseLedgerFiles(...)` instead.
 */
function rawValidate(
  files: FileMap,
  entryPoint: string,
): Promise<{ valid: boolean; errors: BeancountError[] }> {
  return withLedger(files, entryPoint, (ledger) => ({
    valid: ledger.isValid(),
    errors: ledger.getErrors(),
  }));
}

const FILES = {
  "main.beancount": `option "operating_currency" "USD"
include "accounts.beancount"

2024-01-15 * "Employer" "Salary" #income ^ref-1
  Assets:Checking   3000.00 USD
  Income:Salary    -3000.00 USD

2024-01-20 * "Store" "Groceries"
  Assets:Checking    -50.00 USD
  Expenses:Food       50.00 USD
`,
  "accounts.beancount": `2024-01-01 open Assets:Checking USD
2024-01-01 open Income:Salary USD
2024-01-01 open Expenses:Food USD
`,
};

const PAD_FILES = {
  "main.beancount": `option "operating_currency" "USD"

2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 pad Assets:Cash Equity:Opening
2024-01-03 balance Assets:Cash 100 USD
`,
};

const PAD_PLUGIN_FILES = {
  "main.beancount": `${PAD_FILES["main.beancount"]}
plugin "fava.plugins.forecast"
`,
};

async function verifyTransactionLookups(): Promise<void> {
  const source = `option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Shares HOOL
2024-01-01 open Expenses:Fees USD
2024-01-01 open Expenses:Food USD
2024-02-01 * "Earlier blank" ""
  Assets:Cash -5 USD
  Expenses:Fees 5 USD
2024-03-01 * "Cable" ""
  Assets:Cash -80.08 USD
  Expenses:Fees 80.08 USD
2024-03-01 * "Broker" ""
  Assets:Shares 2 HOOL @ 30 USD
  Assets:Cash -60 USD
2024-04-01 * "Store" "Buying groceries"
  Assets:Cash -10 USD
  Expenses:Food 10 USD
2024-04-01 * "Store" "Buying groceries"
  Assets:Cash -12 USD
  Expenses:Food 12 USD
2024-05-01 * "Narration only"
  Assets:Cash -1 USD
  Expenses:Fees 1 USD
`;
  const native = await withLedger(
    { "main.bean": source },
    "main.bean",
    (ledger) => ({
      valid: ledger.isValid(),
      errors: ledger.getErrors(),
      directives: ledger.getDirectives(),
    }),
  );
  assert(
    native.valid && native.errors.length === 0,
    "transaction lookup fixture is valid in the installed WASM",
  );
  const omitted = native.directives.find(
    (directive) =>
      directive.type === "transaction" && directive.payee === "Broker",
  );
  assert(
    omitted !== undefined && !Object.hasOwn(omitted, "narration"),
    "installed WASM omits the explicit empty narration property",
  );

  // Only repository reads are synthetic: loadSnapshot, parsing, latest-match
  // selection and serialization all run through the actual service.
  const service = new LedgerDataService(
    singleFileRepoFactory(source) as never,
    {} as never,
  );
  const params = { ledgerId: "synthetic/lookup", userId: undefined };
  const expectedBlank = {
    date: "2024-03-01",
    payee: "Broker",
    narration: "",
    postings: [
      { account: "Assets:Shares", amount: "2", commodity: "HOOL", price: "30" },
      { account: "Assets:Cash", amount: "-60", commodity: "USD", price: null },
    ],
  };
  const blank = await service.getNarrationTransactions({
    ...params,
    narration: "",
  });
  deepStrictEqual(blank, expectedBlank);
  assert(
    blank?.narration === "",
    "empty narration lookup keeps latest-date/source order and signed amounts, commodities and prices",
  );
  const payee = await service.getPayeeTransactions({
    ...params,
    payee: "Broker",
  });
  deepStrictEqual(payee, expectedBlank);
  assert(
    payee?.narration === "",
    "payee lookup returns canonical empty narration from the real WASM parse",
  );
  const groceries = await service.getNarrationTransactions({
    ...params,
    narration: "Buying groceries",
  });
  deepStrictEqual(groceries, {
    date: "2024-04-01",
    payee: "Store",
    narration: "Buying groceries",
    postings: [
      { account: "Assets:Cash", amount: "-12", commodity: "USD", price: null },
      { account: "Expenses:Food", amount: "12", commodity: "USD", price: null },
    ],
  });
  assert(
    groceries?.narration === "Buying groceries",
    "nonempty narration lookup retains same-date later-source ordering",
  );
  const noPayee = await service.getNarrationTransactions({
    ...params,
    narration: "Narration only",
  });
  assert(
    noPayee !== null && noPayee.payee === null,
    "narration lookup preserves an absent payee as null",
  );
  assert(
    (await service.getPayeeTransactions({ ...params, payee: "" })) === null,
    "empty payee lookup does not match an absent payee",
  );
  assert(
    (await service.getNarrationTransactions({
      ...params,
      narration: "No such narration",
    })) === null,
    "unknown narration stays null despite existing empty narrations",
  );
  assert(
    (await service.getPayeeTransactions({
      ...params,
      payee: "No such payee",
    })) === null,
    "unknown payee stays null",
  );
}

async function verifyBalanceSheetCurrentEarnings(): Promise<void> {
  const companySource = (expenses = "17000", custom = false): string => {
    const equity = custom ? "Capital" : "Equity";
    const income = custom ? "Revenue" : "Income";
    const costs = custom ? "Costs" : "Expenses";
    return `option "operating_currency" "MUSD"
${custom ? 'option "name_equity" "Capital"\noption "name_income" "Revenue"\noption "name_expenses" "Costs"\noption "account_current_earnings" "Retained:Now"\n' : ""}2024-01-01 open Assets:Cash MUSD
2024-01-01 open Liabilities:Debt MUSD
2024-01-01 open ${equity}:Capital MUSD
2024-01-01 open ${income}:Sales MUSD
2024-01-01 open ${costs}:Operations MUSD
2024-12-31 * "Opening"
  Assets:Cash 20000 MUSD
  Liabilities:Debt -10000 MUSD
  ${equity}:Capital -10000 MUSD
2025-02-01 * "Operations"
  Assets:Cash ${20000 - Number(expenses)} MUSD
  ${income}:Sales -20000 MUSD
  ${costs}:Operations ${expenses} MUSD
`;
  };
  const services = (source: string) => {
    const factory = singleFileRepoFactory(source);
    return {
      finance: new LedgerFinanceService(factory as never, {} as never),
      journal: new LedgerJournalService(factory as never, {} as never),
    };
  };
  const find = (
    node: SerializableTreeNodePublic,
    account: string,
  ): SerializableTreeNodePublic | undefined => {
    if (node.account === account) return node;
    for (const child of node.children) {
      const found = find(child, account);
      if (found) return found;
    }
    return undefined;
  };
  const value = (node: SerializableTreeNodePublic | undefined): number =>
    Number(node?.balance_children.MUSD ?? "0");
  const params = {
    ledgerId: "synthetic/earnings",
    userId: undefined,
    conversion: "at_cost",
  };
  const source = companySource();
  const files = { "main.bean": source };
  const native = await parseLedgerFiles(files, "main.bean", {
    repoPaths: ["main.bean"],
  });
  assert(
    native.valid && native.errors.length === 0,
    "current-earnings company fixture is valid in the installed WASM",
  );
  const original = JSON.stringify(native);
  const { finance, journal } = services(source);
  const incomeBefore = await finance.getIncomeStatement({
    ...params,
    time: "2025",
  });
  const trialBefore = await finance.getTrialBalance({
    ...params,
    time: "2025",
  });
  const journalBefore = await journal.getJournal({
    ...params,
    query: { time: "2025", limit: 100 },
  });
  const current = await finance.getBalanceSheet({ ...params, time: "2025" });
  deepStrictEqual(current.equity_data.slice(0, 2), [
    { date: "2025-01-31", balance: { MUSD: "-10000" } },
    { date: "2025-02-28", balance: { MUSD: "-13000" } },
  ]);
  assert(
    Number(current.equity_data.at(-1)?.balance.MUSD) ===
      value(current.equity_hierarchy_data),
    "active-year equity points close earnings as earned and end at the hierarchy total",
  );
  assert(
    value(current.assets_hierarchy_data) === 23000 &&
      value(current.liabilities_hierarchy_data) === -10000 &&
      value(current.equity_hierarchy_data) === -13000,
    "active-year company hierarchy reconciles 23000/-10000/-13000 MUSD",
  );
  assert(
    value(find(current.equity_hierarchy_data, "Equity:Earnings:Current")) ===
      -3000,
    "active-year equity includes -3000 MUSD current earnings",
  );
  const previous = await finance.getBalanceSheet({ ...params, time: "2026" });
  assert(
    previous.equity_data.length === 12 &&
      previous.equity_data.every((point) => point.balance.MUSD === "-13000"),
    "following-year equity points retain previous earnings once throughout the year",
  );
  assert(
    value(previous.equity_hierarchy_data) === -13000 &&
      value(
        find(previous.equity_hierarchy_data, "Equity:Earnings:Previous"),
      ) === -3000 &&
      value(find(previous.equity_hierarchy_data, "Equity:Earnings:Current")) ===
        0,
    "following year retains previous earnings once without duplicate current earnings",
  );
  const allTime = await finance.getBalanceSheet(params);
  assert(
    value(allTime.equity_hierarchy_data) === -13000,
    "balance-sheet hierarchy closes current earnings without a time filter",
  );
  deepStrictEqual(
    await finance.getIncomeStatement({ ...params, time: "2025" }),
    incomeBefore,
  );
  deepStrictEqual(
    await finance.getTrialBalance({ ...params, time: "2025" }),
    trialBefore,
  );
  deepStrictEqual(
    await journal.getJournal({
      ...params,
      query: { time: "2025", limit: 100 },
    }),
    journalBefore,
  );
  assert(
    value(incomeBefore.income_hierarchy_data) === -20000 &&
      value(incomeBefore.expenses_hierarchy_data) === 17000 &&
      value(trialBefore.equity_hierarchy_data) === -10000 &&
      journalBefore.data.filter(
        (entry) => entry.directive_type === "Transaction",
      ).length === 1,
    "income, trial balance and journal retain their original unclosed semantics",
  );
  assert(
    JSON.stringify(
      await parseLedgerFiles(files, "main.bean", { repoPaths: ["main.bean"] }),
    ) === original && files["main.bean"] === source,
    "report reads leave the original source and parsed directives unchanged",
  );

  const customSource = companySource("17000", true);
  const customNative = await parseLedgerFiles(
    { "main.bean": customSource },
    "main.bean",
  );
  assert(
    customNative.valid && customNative.errors.length === 0,
    "custom-root current-earnings fixture is valid in the installed WASM",
  );
  const custom = await services(customSource).finance.getBalanceSheet({
    ...params,
    time: "2025",
  });
  assert(
    custom.equity_data[0]?.balance.MUSD === "-10000" &&
      Number(custom.equity_data.at(-1)?.balance.MUSD) ===
        value(custom.equity_hierarchy_data),
    "custom-root equity points close into the configured current-earnings account",
  );
  assert(
    custom.equity_hierarchy_data.account === "Capital" &&
      value(custom.equity_hierarchy_data) === -13000 &&
      value(find(custom.equity_hierarchy_data, "Capital:Retained:Now")) ===
        -3000,
    "actual service honors custom equity, income, expense and current-earnings names",
  );
  for (const [label, expenses, assets, equity, earnings] of [
    ["loss", "23000", 17000, -7000, 3000],
    ["zero profit", "20000", 20000, -10000, 0],
  ] as const) {
    const caseSource = companySource(expenses);
    const parsed = await parseLedgerFiles(
      { "main.bean": caseSource },
      "main.bean",
    );
    assert(
      parsed.valid && parsed.errors.length === 0,
      `${label} company fixture is valid in the installed WASM`,
    );
    const report = await services(caseSource).finance.getBalanceSheet({
      ...params,
      time: "2025",
    });
    assert(
      value(report.assets_hierarchy_data) === assets &&
        value(report.liabilities_hierarchy_data) === -10000 &&
        value(report.equity_hierarchy_data) === equity &&
        value(find(report.equity_hierarchy_data, "Equity:Earnings:Current")) ===
          earnings,
      `${label} closes the actual income and expense amounts into signed equity`,
    );
    deepStrictEqual(report.equity_data.slice(0, 2), [
      { date: "2025-01-31", balance: { MUSD: "-10000" } },
      { date: "2025-02-28", balance: { MUSD: String(equity) } },
    ]);
    assert(
      Number(report.equity_data.at(-1)?.balance.MUSD) ===
        value(report.equity_hierarchy_data),
      `${label} equity series changes when earned and ends at the hierarchy total`,
    );
  }

  const costSource = `option "operating_currency" "MUSD"
2024-01-01 open Assets:Shares HOOL
2024-01-01 open Equity:Capital MUSD
2024-01-01 open Expenses:Bonus HOOL
2024-12-31 * "Opening stock"
  Assets:Shares 10 HOOL {3 MUSD}
  Equity:Capital -30 MUSD
2025-02-01 ! "Stock bonus" #bonus ^lot
  Assets:Shares -2 HOOL {3 MUSD} @ 7 MUSD
  Expenses:Bonus 2 HOOL {3 MUSD} @ 7 MUSD
`;
  const costNative = await parseLedgerFiles(
    { "main.bean": costSource },
    "main.bean",
  );
  assert(
    costNative.valid && costNative.errors.length === 0,
    "held-at-cost earnings fixture is valid in the installed WASM",
  );
  const costOriginal = JSON.stringify(costNative);
  const costServices = services(costSource);
  const costJournalBefore = await costServices.journal.getJournal({
    ...params,
    query: { time: "2025" },
  });
  const costReport = await costServices.finance.getBalanceSheet({
    ...params,
    time: "2025",
  });
  deepStrictEqual(costReport.equity_data.slice(0, 2), [
    { date: "2025-01-31", balance: { MUSD: "-30" } },
    { date: "2025-02-28", balance: { MUSD: "-24" } },
  ]);
  assert(
    Number(costReport.equity_data.at(-1)?.balance.MUSD) ===
      value(costReport.equity_hierarchy_data),
    "held-at-cost equity points retain lot costs and match the closing hierarchy",
  );
  assert(
    value(costReport.assets_hierarchy_data) === 24 &&
      value(costReport.equity_hierarchy_data) === -24 &&
      value(
        find(costReport.equity_hierarchy_data, "Equity:Earnings:Current"),
      ) === 6,
    "held-at-cost current earnings retain lot value rather than flattening to units or price",
  );
  deepStrictEqual(
    await costServices.journal.getJournal({
      ...params,
      query: { time: "2025" },
    }),
    costJournalBefore,
  );
  assert(
    JSON.stringify(costNative) === costOriginal,
    "held-at-cost report reads preserve raw units, costs, prices, flags and dates",
  );
}

/**
 * A date-windowed plaintext export must load on its own: the window's opening
 * summaries carry a pre-window cost lot that an in-window sale reduces, and
 * the pad directives back the assertions that follow them.
 */
async function verifyWindowedPlaintextExport(): Promise<void> {
  const source = `option "operating_currency" "USD"
2015-01-01 open Assets:Cash USD
2015-01-01 open Assets:Brokerage
2015-01-01 open Equity:Opening
2015-01-01 open Income:Gains USD
2015-06-01 * "Buy pre-window lot"
  Assets:Brokerage   10 VHT {100 USD}
  Assets:Cash      -1000 USD
2015-12-01 pad Assets:Cash Equity:Opening
2016-01-02 balance Assets:Cash 500 USD
2016-03-01 pad Assets:Cash Equity:Opening
2016-03-02 balance Assets:Cash 800 USD
2016-04-01 * "Sell part of the pre-window lot"
  Assets:Brokerage   -4 VHT {100 USD} @ 120 USD
  Assets:Cash        480 USD
  Income:Gains       -80 USD
2016-05-02 balance Assets:Cash 1280 USD
2016-05-02 balance Assets:Brokerage 6 VHT
`;
  const journal = new LedgerJournalService(
    singleFileRepoFactory(source) as never,
    {} as never,
  );
  const { content } = await journal.plaintextJournal({
    ledgerId: "synthetic/export",
    userId: undefined,
    query: { time: "2016" },
  });
  const reloaded = await parseLedgerFiles(
    { "main.beancount": content },
    "main.beancount",
  );
  assert(
    reloaded.valid && reloaded.errors.length === 0,
    `a time-windowed journal export reloads without errors (got ${JSON.stringify(
      reloaded.errors.map((error) => error.message),
    )})`,
  );
  assert(
    content.includes(' S "Opening balance for \'Assets:Brokerage\'') &&
      content.includes("2016-03-01 pad Assets:Cash Equity:Opening"),
    "the export carries the window's opening lots and its pad directives",
  );
}

/**
 * A quoted string may span physical lines — unindented, blank and date-like
 * lines inside it are content (w4/m34). Each such entry must resolve its
 * complete source block, and the source-details marker probe must not land
 * inside the literal.
 */
/**
 * w4/301: a Document's relative path names a file beside its declaring source,
 * through the production worker clone and snapshot cache. The report used to
 * hand `books/documents.bean`'s `"receipt.txt"` out as a root `receipt.txt`.
 */
async function verifyDocumentSourcePaths(): Promise<void> {
  const files: FileMap = {
    "main.bean": [
      "2026-01-01 open Assets:Cash USD",
      'include "books/documents.bean"',
      'include "other/documents.bean"',
      '2026-10-19 document Assets:Cash "books/receipt.txt"',
      "",
    ].join("\n"),
    "books/documents.bean": '2026-10-21 document Assets:Cash "receipt.txt"\n',
    "other/documents.bean": '2026-10-22 document Assets:Cash "receipt.txt"\n',
    "books/receipt.txt": "qa root and included\n",
    "other/receipt.txt": "qa other include\n",
  };
  const repoPaths = Object.keys(files);
  for (const round of ["parsed", "cached"]) {
    const snapshot = await parseLedgerFiles(files, "main.bean", { repoPaths });
    assert(
      snapshot.valid && snapshot.errors.length === 0,
      `document source fixture is valid (${round})`,
    );
    const byDate = Object.fromEntries(
      collectDocuments(snapshot.directives).map((doc) => [doc.date, doc.path]),
    );
    deepStrictEqual(byDate, {
      "2026-10-19": "books/receipt.txt",
      "2026-10-21": "books/receipt.txt",
      "2026-10-22": "other/receipt.txt",
    });
    assert(
      Object.values(byDate).every((path) => path in files),
      `every reported document path names a committed file (${round})`,
    );
  }
}

/**
 * w21/738: `option "documents"` discovery never ran, so a statement in the
 * documents folder never reached the account's journal. The repository's tree
 * lists the file; only the ledger is read.
 */
async function verifyDocumentDiscovery(): Promise<void> {
  const source = [
    'option "documents" "documents"',
    'plugin "fava.plugins.tag_discovered_documents"',
    "2024-01-01 open Assets:Bank:Checking",
    '2024-02-01 document Assets:Bank:Checking "receipt.pdf"',
    "",
  ].join("\n");
  const statement = "documents/Assets/Bank/Checking/2024-02-01.statement.pdf";
  const factory = singleFileRepoFactory(source);
  const repo = factory.getPublicApiClient;
  factory.getPublicApiClient = async () => {
    const client = await repo();
    client.repos.getTree = async () => ({
      data: {
        tree: [
          { path: "main.bean", type: "blob" },
          { path: "receipt.pdf", type: "blob" },
          { path: statement, type: "blob" },
        ],
        truncated: false,
      },
    });
    return client;
  };
  const journal = new LedgerJournalService(factory as never, {} as never);
  for (const round of ["parsed", "cached"]) {
    const { items } = (await journal.getAccountJournal({
      ledgerId: "synthetic/documents",
      userId: undefined,
      query: { account: "Assets:Bank:Checking" },
    })) as unknown as { items: { entry: Record<string, unknown> }[] };
    const documents = items
      .filter((item) => item.entry.directive_type === "Document")
      .map((item) => [item.entry.filename, item.entry.tags]);
    // fava's tag_discovered_documents marks only the one found in the folder.
    deepStrictEqual(
      documents.sort(),
      [
        [statement, ["discovered"]],
        ["receipt.pdf", []],
      ].sort(),
      `the account journal lists the discovered statement beside the written document (${round})`,
    );
  }
  console.log(
    "✓ option documents discovery reaches the account journal (parsed, cached)",
  );
  // w21/758: a statement dated before its account opened raised nothing, and
  // with a fava plugin an unlocated "unknown account".
  for (const plugin of ["", 'plugin "fava.plugins.tag_discovered_documents"\n']) {
    const early = await parseLedgerFiles(
      {
        "main.beancount": `option "documents" "documents"\n${plugin}2026-03-01 open Assets:Docs\n`,
      },
      "main.beancount",
      {
        today: "2099-01-01",
        repoPaths: [
          "main.beancount",
          "documents/Assets/Docs/2026-02-01.statement.pdf",
        ],
      },
    );
    const shown = early.errors.map((e) => `${e.file}:${e.line} ${e.message}`);
    assert(
      JSON.stringify(shown) ===
        JSON.stringify([
          `main.beancount:1 Invalid reference to inactive account 'Assets:Docs' (document "documents/Assets/Docs/2026-02-01.statement.pdf")`,
        ]),
      `a statement before its account's open is refused once, located (got ${JSON.stringify(shown)})`,
    );
  }
}

/**
 * w21/745: an entry written with flag S was missing from the journal, and R
 * or S ones from the export: both told synthetic entries by their flag.
 */
async function verifyWrittenReservedFlags(): Promise<void> {
  const journal = new LedgerJournalService(
    singleFileRepoFactory(
      [
        "2026-01-01 open Assets:Cash USD",
        "2026-01-01 open Expenses:Misc USD",
        "2026-01-01 open Equity:Opening USD",
        "2026-10-01 pad Assets:Cash Equity:Opening",
        "2026-10-02 balance Assets:Cash 100 USD",
        '2026-10-20 R "Refund flag R"',
        "  Expenses:Misc  -7.00 USD",
        "  Assets:Cash",
        '2026-10-20 S "Settled flag S"',
        "  Expenses:Misc  9.00 USD",
        "  Assets:Cash",
        "",
      ].join("\n"),
    ) as never,
    {} as never,
  );
  const params = { ledgerId: "synthetic/flags", userId: undefined };
  const listed = (await journal.getJournal(params)).data.map(
    (item) => `${item.flag} ${item.narration}`,
  );
  assert(
    listed.includes("S Settled flag S") && listed.includes("R Refund flag R"),
    `the journal lists entries written with flags S and R (got ${JSON.stringify(listed)})`,
  );
  const windowed = (
    await journal.getJournal({ ...params, query: { time: "2026-10-15 - 2026-11-01" } })
  ).data.map((item) => `${item.flag} ${item.narration}`);
  assert(
    windowed.includes("S Settled flag S") &&
      !windowed.some((row) => row.includes("Summarization")),
    `a time window still hides the clamp's own summaries (got ${JSON.stringify(windowed)})`,
  );
  const { content } = await journal.plaintextJournal(params);
  assert(
    content.includes('2026-10-20 R "Refund flag R"') &&
      content.includes('2026-10-20 S "Settled flag S"') &&
      content.includes("2026-10-01 pad Assets:Cash Equity:Opening") &&
      !content.includes("Padding inserted"),
    `the export writes the R and S entries and the pad, not its padding:\n${content}`,
  );
  const reloaded = await parseLedgerFiles(
    { "main.beancount": content },
    "main.beancount",
  );
  assert(
    reloaded.valid,
    `the export reloads without errors (got ${JSON.stringify(reloaded.errors.map((e) => e.message))})`,
  );
  console.log(
    "✓ entries written with reserved flags are listed and exported (w21/745)",
  );
}

async function verifyMultilineSources(): Promise<void> {
  const notes = [
    'qa "quoted" C:\\qa\\receipts\nsecond line\nthird line',
    "first\n\nafter a blank line",
    "first\n2024-03-02 open Assets:Phantom",
    "indented\n  second line",
  ];
  const noteBlocks = notes.map(
    (comment, index) =>
      `2024-03-0${index + 1} note Assets:Cash "${comment.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  const txnBlock = [
    '2024-03-09 * "Payee" "two-line',
    'narration"',
    "  Expenses:Food   1.25 USD",
    "  Assets:Cash",
  ].join("\n");
  const tail = "2024-03-10 note Assets:Cash \"after\"";
  const source = [
    "2024-01-01 open Assets:Cash",
    "2024-01-01 open Expenses:Food",
    "",
    ...noteBlocks.flatMap((block) => [block, ""]),
    txnBlock,
    "",
    tail,
    "",
  ].join("\n");
  const files: FileMap = { "main.beancount": source };

  const plain = await parseLedgerFiles(files, "main.beancount");
  assert(plain.valid, "multiline-string ledger is valid");
  const probed = await parseLedgerFilesInProcess(files, "main.beancount", {
    includeSourceDetails: true,
  });
  const comments = probed.directives
    .filter((directive) => directive.type === "note")
    .map((directive) => (directive as { comment: string }).comment);
  deepStrictEqual(comments, [...notes, "after"]);
  console.log("✓ multiline literals parse exactly as written");
  assert(
    probed.directives.length === plain.directives.length,
    "source-details probe adds no phantom directive",
  );

  const ids = buildEntryIdMap(plain.directives);
  const expected = [...noteBlocks, txnBlock, tail];
  const resolvable = plain.directives.filter(
    (directive) => directive.type === "note" || directive.type === "transaction",
  );
  for (const [index, directive] of resolvable.entries()) {
    const id = ids.get(directive);
    assert(id !== undefined, `multiline entry ${index} has an entry ID`);
    // The probe's marker must follow the whole header, outside the literal,
    // or the entry gets no source details at all.
    const startLine = source.split("\n").indexOf(expected[index].split("\n")[0]);
    assert(
      probed.sourceDetails?.[id]?.lineno === startLine + 1,
      `multiline entry ${index} carries probe source details at its line`,
    );
    const found = await findEntrySliceWithFullLedger(
      files,
      "main.beancount",
      id,
    );
    assert(
      found?.slice === expected[index] &&
        source.split("\n")[found.startLine] === expected[index].split("\n")[0],
      `multiline entry ${index} resolves its complete source block`,
    );
  }
}

async function main(): Promise<void> {
  const version = await getRustledgerVersion();
  assert(
    typeof version === "string" && version.length > 0,
    `version resolved: ${version}`,
  );

  const snapshot = await parseLedgerFiles(FILES, "main.beancount");
  assert(snapshot.valid, "multi-file ledger with include is valid");
  assert(
    snapshot.directiveCount === 5,
    `directiveCount is 5 (got ${snapshot.directiveCount})`,
  );
  assert(
    snapshot.options.operating_currencies.includes("USD"),
    "operating currency USD parsed from options",
  );
  const types = snapshot.directives.map((directive) => directive.type);
  assert(
    types.filter((type) => type === "transaction").length === 2,
    "two transactions parsed",
  );

  await verifyTransactionLookups();
  await verifyBalanceSheetCurrentEarnings();
  await verifyWindowedPlaintextExport();

  const paddedSnapshot = await parseLedgerFiles(
    PAD_FILES,
    "main.beancount",
  );
  const paddingTransactions = paddedSnapshot.directives.filter(
    (directive) =>
      directive.type === "transaction" && directive.flag === "P",
  );
  assert(
    paddingTransactions.length === 1,
    "pad expansion adds one synthetic transaction to the report stream",
  );
  const paddedPrices = buildPriceMap(paddedSnapshot.directives);
  const assets = accountHierarchy(
    paddedSnapshot.directives,
    "Assets",
    "USD",
    paddedPrices,
  );
  assert(
    assets.balance_children.USD === "100",
    "pad-generated postings populate the asset hierarchy",
  );
  const netWorth = accountBalanceSeries(
    paddedSnapshot.directives,
    "month",
    ["Assets", "Liabilities"],
    "USD",
    paddedPrices,
  );
  assert(
    netWorth.at(-1)?.balance.USD === "100",
    "pad-generated postings populate the net-worth series",
  );
  const paddedPluginQuery = await queryLedgerFilesResult(
    PAD_PLUGIN_FILES,
    "main.beancount",
    "BALANCES",
  );
  const paddedCashRow = paddedPluginQuery.rows.find(
    (row) => row[0] === "Assets:Cash",
  );
  const paddedCashBalance = paddedCashRow?.[1] as
    | { positions?: Array<{ units?: { number?: string } }> }
    | undefined;
  assert(
    paddedCashBalance?.positions?.[0]?.units?.number === "100",
    "BQL materializes a transformed pad stream exactly once",
  );

  // Non-.bean include: beancount permits `include "accounts.txt"`. The loader
  // fetches such files into the FileMap; confirm the WASM actually resolves the
  // include from a non-.bean key (relative to the including file) end-to-end.
  const nonBeanInclude = await parseLedgerFiles(
    {
      "main.beancount":
        'include "accounts.txt"\n\n2024-02-01 * "x"\n  Assets:Checking 1 USD\n  Income:Salary -1 USD\n',
      "accounts.txt":
        "2024-01-01 open Assets:Checking USD\n2024-01-01 open Income:Salary USD\n",
    },
    "main.beancount",
  );
  assert(nonBeanInclude.valid, "ledger with a non-.bean include is valid");
  assert(
    nonBeanInclude.directives.some(
      (d) => d.type === "open" && d.account === "Assets:Checking",
    ),
    "open directive from the included accounts.txt is present",
  );

  // Glob include (#7): the engine expands `include "accounts/*.txt"` against the
  // FileMap, so the loader loading the matching blobs is sufficient.
  const globInclude = await parseLedgerFiles(
    {
      "main.beancount":
        'include "accounts/*.txt"\n\n2024-02-01 * "x"\n  Assets:A 1 USD\n  Assets:B -1 USD\n',
      "accounts/a.txt": "2024-01-01 open Assets:A USD\n",
      "accounts/b.txt": "2024-01-01 open Assets:B USD\n",
    },
    "main.beancount",
  );
  assert(
    globInclude.valid &&
      globInclude.directives.filter((d) => d.type === "open").length === 2,
    "glob include expands to all matching files in the FileMap",
  );

  // Duplicate-entry disambiguation: two byte-identical transactions share one
  // content hash, so buildEntryIdMap must give them distinct IDs (base, base:1).
  const dupLedger = await parseLedgerFiles(
    {
      "main.beancount":
        '2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Coffee USD\n\n2024-02-01 * "coffee"\n  Expenses:Coffee   5.00 USD\n  Assets:Cash      -5.00 USD\n\n2024-02-01 * "coffee"\n  Expenses:Coffee   5.00 USD\n  Assets:Cash      -5.00 USD\n',
    },
    "main.beancount",
  );
  const dupTxns = dupLedger.directives.filter((d) => d.type === "transaction");
  assert(dupTxns.length === 2, "two identical transactions parsed");
  assert(
    hashEntry(dupTxns[0]) === hashEntry(dupTxns[1]),
    "identical transactions share one content hash",
  );
  const dupIds = buildEntryIdMap(dupLedger.directives);
  const idA = dupIds.get(dupTxns[0]);
  const idB = dupIds.get(dupTxns[1]);
  assert(
    idA !== idB && idB === `${idA}:1`,
    `duplicate entries get distinct IDs (${idA} vs ${idB})`,
  );

  // Source edits locate a transaction by hashing isolated source blocks. The
  // isolated parser must run booking too: raw CostSpecs for total/compound
  // costs hash differently from the full ledger's booked per-unit cost.
  const parseBookedBlock = await createBookedBlockParser();
  for (const [label, cost] of [
    ["total", "{{1000.00 USD}}"],
    ["compound", "{10 # 900.00 USD}"],
  ] as const) {
    const source = [
      "2024-01-01 open Assets:Broker HOOL,USD",
      "2024-01-01 open Assets:Cash USD",
      "",
      `2024-02-01 * "${label} cost"`,
      `  Assets:Broker 10 HOOL ${cost}`,
      "  Assets:Cash -1000.00 USD",
      "",
    ].join("\n");
    const costFiles = { "main.beancount": source };
    const costLedger = await parseLedgerFiles(costFiles, "main.beancount");
    const costTxn = costLedger.directives.find(
      (directive) => directive.type === "transaction",
    );
    assert(costTxn !== undefined, `${label}-cost transaction parsed`);
    const found = findEntrySlice(
      costFiles,
      "main.beancount",
      hashEntry(costTxn),
      parseBookedBlock,
    );
    assert(
      found?.slice.includes(cost) === true,
      `${label}-cost transaction source slice is recoverable`,
    );
  }

  // A lot reduction's booked cost date comes from inventory accumulated in a
  // different included file. An isolated block/file parse substitutes the sell
  // date and hashes differently; the marker-annotated full-ledger resolver must
  // still recover the exact source slice used by context/edit/delete.
  const reductionSlice = [
    '2024-02-01 * "Sell"',
    "  Assets:Broker  -5 HOOL {}",
    "  Assets:Cash    600 USD",
    "  Income:Gains",
  ].join("\n");
  const reductionFiles: FileMap = {
    "main.beancount": [
      'option "operating_currency" "USD"',
      'include "accounts.beancount"',
      'include "buy.beancount"',
      'include "sell.beancount"',
    ].join("\n"),
    "accounts.beancount": [
      "2024-01-01 open Assets:Broker",
      "2024-01-01 open Assets:Cash USD",
      "2024-01-01 open Income:Gains USD",
    ].join("\n"),
    "buy.beancount": [
      '2024-01-02 * "Buy"',
      "  Assets:Broker  10 HOOL {100 USD}",
      "  Assets:Cash  -1000 USD",
    ].join("\n"),
    "sell.beancount": reductionSlice,
  };
  const reductionSnapshot = await parseLedgerFiles(
    reductionFiles,
    "main.beancount",
  );
  assert(reductionSnapshot.valid, "cross-file lot-reduction ledger is valid");
  const reductionTxn = reductionSnapshot.directives.find(
    (directive) =>
      directive.type === "transaction" && directive.narration === "Sell",
  );
  assert(reductionTxn !== undefined, "lot-reduction transaction parsed");
  const reductionId = buildEntryIdMap(reductionSnapshot.directives).get(
    reductionTxn,
  );
  assert(reductionId !== undefined, "lot-reduction transaction has an entry ID");
  const reductionFound = await findEntrySliceWithFullLedger(
    reductionFiles,
    "main.beancount",
    reductionId,
  );
  assert(
    reductionFound?.file === "sell.beancount" &&
      reductionFound.slice === reductionSlice,
    "lot-reduction source slice resolves with full-ledger inventory",
  );

  const validation = await rawValidate(
    {
      "bad.beancount":
        '2024-01-15 * "Unbalanced"\n  Assets:Cash 100 USD\n  Expenses:X -90 USD\n',
    },
    "bad.beancount",
  );
  assert(!validation.valid, "unbalanced ledger is invalid");
  assert(
    validation.errors.some((error) => error.code === "E3001"),
    "unbalanced transaction reported as E3001",
  );

  // Number-only postings must keep the authored amount (upstream interpolate
  // fix in @rustledger/wasm >= 0.24). 0.21 replaced -4 with the residual -10.
  const partialCurrencySnapshot = await parseLedgerFiles(
    {
      "partial.beancount": [
        'option "operating_currency" "MUSD"',
        "2024-01-01 open Expenses:Cost MUSD",
        "2024-01-01 open Assets:Cash MUSD",
        '2024-01-15 * "Partial currency"',
        "  Expenses:Cost  10 MUSD",
        "  Assets:Cash    -4",
      ].join("\n"),
    },
    "partial.beancount",
  );
  assert(
    !partialCurrencySnapshot.valid,
    "number-only cash posting leaves a 6 MUSD imbalance",
  );
  const partialTxn = partialCurrencySnapshot.directives.find(
    (directive) =>
      directive.type === "transaction" &&
      directive.narration === "Partial currency",
  );
  assert(
    partialTxn !== undefined && partialTxn.type === "transaction",
    "partial-currency transaction parsed",
  );
  const cashPosting = partialTxn.postings.find(
    (posting) => posting.account === "Assets:Cash",
  );
  assert(cashPosting !== undefined, "Assets:Cash posting present");
  assert(
    cashPosting.units !== undefined &&
      cashPosting.units.number === "-4" &&
      cashPosting.units.currency === "MUSD",
    "number-only posting retains authored -4 MUSD",
  );

  const partialZeroSnapshot = await parseLedgerFiles(
    {
      "partial-zero.beancount": [
        'option "operating_currency" "MUSD"',
        "2024-01-01 open Expenses:Cost MUSD",
        "2024-01-01 open Assets:Cash MUSD",
        '2024-01-15 * "Partial zero"',
        "  Expenses:Cost  10 MUSD",
        "  Assets:Cash    0",
      ].join("\n"),
    },
    "partial-zero.beancount",
  );
  assert(
    !partialZeroSnapshot.valid,
    "explicit zero number-only posting leaves a 10 MUSD imbalance",
  );
  const zeroTxn = partialZeroSnapshot.directives.find(
    (directive) =>
      directive.type === "transaction" && directive.narration === "Partial zero",
  );
  assert(
    zeroTxn !== undefined && zeroTxn.type === "transaction",
    "partial-zero transaction parsed",
  );
  const zeroCash = zeroTxn.postings.find(
    (posting) => posting.account === "Assets:Cash",
  );
  assert(zeroCash !== undefined, "Assets:Cash zero posting present");
  assert(
    zeroCash.units !== undefined &&
      (zeroCash.units.number === "0" || zeroCash.units.number === "0.0") &&
      zeroCash.units.currency === "MUSD",
    "explicit zero number-only posting retains 0 MUSD",
  );

  const balancedNumberOnly = await parseLedgerFiles(
    {
      "balanced-number-only.beancount": [
        'option "operating_currency" "MUSD"',
        "2024-01-01 open Expenses:Cost MUSD",
        "2024-01-01 open Assets:Cash MUSD",
        '2024-01-15 * "Balanced number only"',
        "  Expenses:Cost  10 MUSD",
        "  Assets:Cash    -10",
      ].join("\n"),
    },
    "balanced-number-only.beancount",
  );
  assert(
    balancedNumberOnly.valid,
    "balanced number-only cash posting remains valid",
  );

  const query = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT account, sum(position) AS total WHERE account ~ 'Expenses' GROUP BY account",
  );
  assert(query.rows.length === 1, "expenses query returns one grouped row");
  assert(
    query.rows[0].account === "Expenses:Food",
    "grouped account is Expenses:Food",
  );

  // Block comments: the engine's own parser only skips whitespace, so the
  // shell service normalizes them away first. Verify against the LIVE engine
  // that (a) the raw annotated query really does still fail there, and (b) the
  // normalized query returns exactly the uncommented query's rows.
  const COMMENTED_QUERY =
    "/* qa */ SELECT account, sum(position) AS total /* pick */ WHERE account ~ 'Expenses' GROUP BY account";
  const rawCommented = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    COMMENTED_QUERY,
  );
  assert(
    rawCommented.errors.some((e) => e.severity === "error"),
    "engine still rejects a raw block-commented query (normalization is load-bearing)",
  );
  const normalizedCommented = await queryLedgerFiles(
    FILES,
    "main.beancount",
    stripBqlBlockComments(COMMENTED_QUERY),
  );
  assert(
    normalizedCommented.rows.length === query.rows.length &&
      normalizedCommented.rows[0].account === query.rows[0].account,
    "normalized block-commented query returns the uncommented query's rows",
  );
  const quotedComment = await queryLedgerFiles(
    FILES,
    "main.beancount",
    stripBqlBlockComments("SELECT '/* literal */' AS kept LIMIT 1"),
  );
  assert(
    quotedComment.rows[0].kept === "/* literal */",
    "comment syntax inside a string literal survives normalization byte-for-byte",
  );

  // Statement terminator (w23/109): the engine resolves `FROM <table>;` —
  // a bare table name with no further clause, `;`-terminated — as a column
  // reference while the unterminated form resolves the table, so the shell
  // service neutralizes a trailing `;` first. Verify against the LIVE engine
  // that (a) the raw terminated query really does still fail there, and (b)
  // the normalized query returns exactly the unterminated query's rows.
  const rawTerminated = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings;",
  );
  assert(
    rawTerminated.errors.some(
      (e) =>
        e.severity === "error" && /column 'postings' not found/.test(e.message),
    ),
    "engine still mis-resolves a bare ;-terminated FROM as a column (normalization is load-bearing)",
  );
  const unterminatedCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings",
  );
  const normalizedTerminated = await queryLedgerFiles(
    FILES,
    "main.beancount",
    stripBqlStatementTerminator("SELECT count(*) FROM postings;"),
  );
  assert(
    JSON.stringify(normalizedTerminated.rows) ===
      JSON.stringify(unterminatedCount.rows),
    "normalized ;-terminated query returns the unterminated query's rows",
  );

  // Trailing comments (w23/151): the normalizer accepts whitespace plus
  // comments past the final `;`, so verify against the LIVE engine that
  // the normalized comment-tailed query returns the unterminated rows.
  const normalizedCommentTail = await queryLedgerFiles(
    FILES,
    "main.beancount",
    stripBqlStatementTerminator("SELECT count(*) FROM postings; -- total"),
  );
  assert(
    JSON.stringify(normalizedCommentTail.rows) ===
      JSON.stringify(unterminatedCount.rows),
    "normalized ;-terminated query with a trailing comment returns the unterminated query's rows",
  );

  // Unicode whitespace (w23/162): stock beanquery separates tokens on Python
  // `\s` while the engine only skips ASCII space/tab/CR/LF, so the shell
  // service folds the rest to spaces first. Verify against the LIVE engine
  // that (a) the raw NBSP/VTAB/EM SP queries really do still fail there, and
  // (b) the folded queries return exactly the ASCII query's rows.
  const SPACED_COUNT = "SELECT count(*) AS n FROM postings";
  const spacedCount = await queryLedgerFiles(FILES, "main.beancount", SPACED_COUNT);
  for (const [name, ch] of [
    ["NBSP", "\xa0"],
    ["VTAB", "\x0b"],
    ["EM SP", "\u2003"],
  ] as Array<[string, string]>) {
    const raw = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      `SELECT${ch}count(*)${ch}AS${ch}n${ch}FROM${ch}postings`,
    );
    assert(
      raw.errors.some((e) => e.severity === "error"),
      `engine still rejects a raw ${name}-separated query (normalization is load-bearing)`,
    );
    const folded = await queryLedgerFiles(
      FILES,
      "main.beancount",
      foldBqlWhitespace(`SELECT${ch}count(*)${ch}AS${ch}n${ch}FROM${ch}postings`),
    );
    assert(
      JSON.stringify(folded.rows) === JSON.stringify(spacedCount.rows),
      `folded ${name}-separated query returns the ASCII query's rows`,
    );
  }
  const foldedKept = await queryLedgerFiles(
    FILES,
    "main.beancount",
    foldBqlWhitespace('SELECT "a\xa0b" AS kept LIMIT 1'),
  );
  assert(
    (foldedKept.rows[0] as { kept: string }).kept === "a\xa0b",
    "NBSP inside a string literal survives folding byte-for-byte",
  );

  // Quoted FROM (w23/115): the engine silently ignores a quoted FROM name and
  // runs in default postings scope, so the shell service unquotes
  // valid-identifier FROM names first. Verify against the LIVE engine that (a)
  // the raw quoted query really does still return postings rows (the entries
  // count differs, so the confusion is observable), and (b) the normalized
  // query returns exactly the unquoted query's rows.
  const rawQuoted = await queryLedgerFiles(
    FILES,
    "main.beancount",
    'SELECT count(*) FROM "entries" LIMIT 1',
  );
  const postingsCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings LIMIT 1",
  );
  assert(
    JSON.stringify(rawQuoted.rows) === JSON.stringify(postingsCount.rows),
    "engine still runs a raw quoted FROM in postings scope (normalization is load-bearing)",
  );
  const unquotedEntries = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM entries LIMIT 1",
  );
  assert(
    JSON.stringify(rawQuoted.rows) !== JSON.stringify(unquotedEntries.rows),
    "entries and postings counts differ, so the quoted/unquoted confusion is observable",
  );
  const normalizedQuoted = await queryLedgerFiles(
    FILES,
    "main.beancount",
    unquoteBqlFromTables('SELECT count(*) FROM "entries" LIMIT 1'),
  );
  assert(
    JSON.stringify(normalizedQuoted.rows) ===
      JSON.stringify(unquotedEntries.rows),
    "normalized quoted FROM returns the unquoted query's rows",
  );

  // Column fold (w23/116): the engine folds a column FROM only in the bare-`;`
  // and `)`-terminated forms, while stock folds it in every form and tables
  // the dual `accounts` in every form — so the shell pipeline re-earns the
  // fold for bare-EOF columns, wraps with-clause columns in a folding
  // subquery, and leaves duals and non-columns on the table/error path.
  // Verify against the LIVE engine that (a) the split really is still there,
  // and (b) the pipeline unifies each form with its native-fold rows.
  const rawFoldWithClause = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM payee LIMIT 1",
  );
  assert(
    rawFoldWithClause.errors.some(
      (e) =>
        e.severity === "error" &&
        /table 'payee' does not exist/.test(e.message),
    ),
    "engine still table-errors a with-clause column FROM (normalization is load-bearing)",
  );
  const nativeFold = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM payee;",
  );
  const pipelineFold = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT count(*) FROM payee LIMIT 1;"),
  );
  assert(
    JSON.stringify(pipelineFold.rows) === JSON.stringify(nativeFold.rows),
    "pipelined with-clause column FROM returns the native-fold rows",
  );
  const pipelineBareEof = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT count(*) FROM payee"),
  );
  assert(
    JSON.stringify(pipelineBareEof.rows) === JSON.stringify(nativeFold.rows),
    "pipelined bare-EOF column FROM returns the native-fold rows",
  );
  // A hidden-column projection resolves through the wrap's explicit inner.
  const nativeHidden = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT balance FROM narration;",
  );
  const pipelineHidden = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT balance FROM narration LIMIT 5"),
  );
  assert(
    JSON.stringify(pipelineHidden.rows) === JSON.stringify(nativeHidden.rows),
    "pipelined hidden-column projection returns the native-fold rows",
  );
  // A star outer keeps the native star shape through the wrap.
  const nativeStar = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT * FROM narration;",
  );
  const pipelineStar = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT * FROM narration LIMIT 5"),
  );
  assert(
    JSON.stringify(pipelineStar.rows) === JSON.stringify(nativeStar.rows),
    "pipelined star over a column FROM returns the native-fold rows",
  );
  // Per-member fold pin (w23/125): every FOLD_COLUMNS member's pipelined
  // with-clause form returns its native-fold rows, and the native count
  // matches the stock beanquery 0.2.0 oracle on this fixture (4 postings;
  // oracle run 2026-10-28, see the note). The six "empty" members count
  // [[0]] where stock returns no rows (known [0]-vs-[] shape, 022 class);
  // the pin asserts the divergence explicitly so either side moving trips
  // it with direction instead of silently agreeing.
  const FOLD_ORACLE: Record<string, number | "empty"> = {
    account: 4,
    cost_currency: "empty",
    cost_date: "empty",
    cost_label: "empty",
    cost_number: "empty",
    currency: 4,
    date: 4,
    day: 4,
    description: 4,
    entry: 4,
    flag: 4,
    links: 2,
    month: 4,
    narration: 4,
    number: 4,
    other_accounts: 4,
    payee: 4,
    position: 4,
    posting_flag: "empty",
    price: "empty",
    tags: 2,
    type: 4,
    weight: 4,
    year: 4,
  };
  for (const [name, expected] of Object.entries(FOLD_ORACLE)) {
    const nativeMember = await queryLedgerFiles(
      FILES,
      "main.beancount",
      `SELECT count(*) FROM ${name};`,
    );
    const pipelinedMember = await queryLedgerFiles(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(`SELECT count(*) FROM ${name} LIMIT 1;`),
    );
    assert(
      JSON.stringify(pipelinedMember.rows) ===
        JSON.stringify(nativeMember.rows),
      `pipelined ${name} returns the native-fold rows`,
    );
    // Rows here are records ({ "count(*)": n }); the [0]-vs-[] comment
    // above uses the raw [[0]] spelling for the engine shape.
    const expectedRows = [{ "count(*)": expected === "empty" ? 0 : expected }];
    assert(
      JSON.stringify(nativeMember.rows) === JSON.stringify(expectedRows),
      expected === "empty"
        ? `native ${name} still counts the empty fold as [[0]] (stock: no rows)`
        : `native ${name} matches the stock count ${expected}`,
    );
  }
  // The dual stays table-shaped: the pipeline must not fold it.
  const pipelineDual = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT * FROM accounts LIMIT 1"),
  );
  assert(
    pipelineDual.rows.length === 1 && "open" in pipelineDual.rows[0],
    "pipelined dual FROM stays on the AccountsTable path",
  );
  // The excluded names error loudly on every pipelined form — including
  // filename/lineno/meta, which the engine folds to a silent 0 natively
  // (w23/125), and location/id, which share the native-zero gap.
  for (const name of [
    "balance",
    "cost",
    "units",
    "filename",
    "lineno",
    "meta",
    "location",
    "id",
  ]) {
    const pipelinedExcluded = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(`SELECT count(*) FROM ${name} LIMIT 1;`),
    );
    assert(
      pipelinedExcluded.errors.some((e) => e.severity === "error"),
      `pipelined ${name} still errors (excluded from the fold set)`,
    );
  }

  // Inner bare tables (w23/130): the raw engine resolves a `)`-terminated
  // inner FROM column-first — real tables error, unknown names misdiagnose
  // — while bare-EOF and with-clause names take the table path, so the
  // pipeline rescues the inner form with an identity WHERE true. Fold
  // columns and the dual keep their native `)` resolution.
  const rawInnerTable = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM (SELECT * FROM postings)",
  );
  assert(
    rawInnerTable.errors.some(
      (e) =>
        e.severity === "error" &&
        /column 'postings' not found/.test(e.message),
    ),
    "engine still resolves inner bare FROM column-first (normalization is load-bearing)",
  );
  const nativeWhereTrue = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings WHERE true",
  );
  const nativeTableCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings LIMIT 1",
  );
  assert(
    JSON.stringify(nativeWhereTrue.rows) ===
      JSON.stringify(nativeTableCount.rows),
    "WHERE true is an identity on the native table path",
  );
  for (const table of ["postings", "entries"]) {
    const nativeTop = await queryLedgerFiles(
      FILES,
      "main.beancount",
      `SELECT count(*) FROM ${table} LIMIT 1`,
    );
    const pipelinedInner = await queryLedgerFiles(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(
        `SELECT count(*) FROM (SELECT * FROM ${table})`,
      ),
    );
    assert(
      JSON.stringify(pipelinedInner.rows) === JSON.stringify(nativeTop.rows),
      `pipelined inner bare ${table} returns the top-level table rows`,
    );
  }
  const pipelinedDepth2 = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine(
      "SELECT count(*) FROM (SELECT * FROM (SELECT * FROM postings))",
    ),
  );
  assert(
    JSON.stringify(pipelinedDepth2.rows) ===
      JSON.stringify(nativeTableCount.rows),
    "pipelined depth-2 inner table returns the top-level table rows",
  );
  // Quoted inner names join the same rescue: raw, the engine runs them in
  // default postings scope (the w23/115 accident in inner position).
  const rawQuotedInner = await queryLedgerFiles(
    FILES,
    "main.beancount",
    'SELECT count(*) FROM (SELECT * FROM "entries")',
  );
  const nativeEntriesCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM entries LIMIT 1",
  );
  assert(
    JSON.stringify(rawQuotedInner.rows) ===
      JSON.stringify(nativeTableCount.rows) &&
      JSON.stringify(rawQuotedInner.rows) !==
        JSON.stringify(nativeEntriesCount.rows),
    "raw quoted inner table still runs in postings scope (unquoting past `)` is load-bearing)",
  );
  const pipelinedQuotedInner = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine('SELECT count(*) FROM (SELECT * FROM "entries")'),
  );
  assert(
    JSON.stringify(pipelinedQuotedInner.rows) ===
      JSON.stringify(nativeEntriesCount.rows),
    "pipelined quoted inner table returns the entries rows",
  );
  // The rescue must not disturb the names the `)` path resolves correctly.
  const nativePayeeFold = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM payee;",
  );
  const pipelinedInnerFold = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT count(*) FROM (SELECT * FROM payee)"),
  );
  assert(
    JSON.stringify(pipelinedInnerFold.rows) ===
      JSON.stringify(nativePayeeFold.rows),
    "pipelined inner fold column keeps the native fold rows",
  );
  const pipelinedInnerDual = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT count(*) FROM (SELECT * FROM accounts)"),
  );
  assert(
    JSON.stringify(pipelinedInnerDual.rows) ===
      JSON.stringify(nativeTableCount.rows),
    "pipelined inner dual keeps the fold rows (revisit if w23/124 lands table-first)",
  );
  const pipelinedInnerUnknown = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT count(*) FROM (SELECT * FROM nosuch)"),
  );
  assert(
    pipelinedInnerUnknown.errors.some(
      (e) =>
        e.severity === "error" &&
        /table 'nosuch' does not exist/.test(e.message),
    ),
    "pipelined inner unknown table names the table problem, not a column",
  );

  // Star alias (w23/127): the raw engine accepts `SELECT * AS x` and answers
  // it mismatched — one declared column over star-width rows — while stock
  // ParseErrors, so the query path refuses it before it runs.
  const rawStarAlias = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT * AS x FROM postings LIMIT 2"),
  );
  assert(
    rawStarAlias.columns.length === 1 &&
      rawStarAlias.rows.every((row) => row.length > 1) &&
      !rawStarAlias.errors.some((e) => e.severity === "error"),
    "raw engine still answers SELECT * AS x mismatched (the guard is load-bearing)",
  );
  const guardedStarAlias = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT * AS x FROM postings LIMIT 2",
  );
  assert(
    guardedStarAlias.rows.length === 0 &&
      guardedStarAlias.errors.some(
        (e) =>
          e.severity === "error" &&
          e.message.includes("SELECT * AS <alias>"),
      ),
    "the query path refuses SELECT * AS x and names the alias",
  );
  const bareStarAlias = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT * x FROM postings LIMIT 1",
  );
  assert(
    bareStarAlias.errors.some((e) => e.severity === "error"),
    "the bare SELECT * x form stays loud",
  );

  // Composite equality (w23/128): the raw engine answers composite `=` / `!=`
  // constant-False / constant-True while stock refuses, so the query path
  // refuses before it runs — and scalar comparisons still answer.
  const rawCompositeEq = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT tags = tags AS e FROM postings LIMIT 1"),
  );
  assert(
    JSON.stringify(rawCompositeEq.rows) === "[[false]]" &&
      !rawCompositeEq.errors.some((e) => e.severity === "error"),
    "raw engine still answers tags = tags constant-False (the guard is load-bearing)",
  );
  for (const comparison of [
    "tags = tags",
    "tags != tags",
    "position = position",
    "balance = balance",
    "cost(position) = cost(position)",
    "meta = meta",
    "entry = entry",
    // Bare amount/set columns (w23/152): same silent-False root.
    "weight = weight",
    "weight != weight",
    "price = price",
    "other_accounts = other_accounts",
    "accounts = accounts",
  ]) {
    const guardedComposite = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      `SELECT ${comparison} AS e FROM postings LIMIT 1`,
    );
    assert(
      guardedComposite.rows.length === 0 &&
        guardedComposite.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("composite BQL values"),
        ),
      `the query path refuses ${comparison}`,
    );
  }
  const guardedEntriesAccounts = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT accounts = accounts AS e FROM entries LIMIT 1",
  );
  assert(
    guardedEntriesAccounts.rows.length === 0 &&
      guardedEntriesAccounts.errors.some(
        (e) =>
          e.severity === "error" && e.message.includes("composite BQL values"),
      ),
    "the query path refuses accounts = accounts on entries (w23/152)",
  );
  const scalarEq = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT payee = payee AS e FROM postings LIMIT 1",
  );
  assert(
    JSON.stringify(scalarEq.rows) === `[{"e":true}]`,
    "scalar self-equality still answers through the guard",
  );

  // Bare amount equality (w23/152): `amount` lives on balances/prices,
  // which FILES leaves empty, so these pins carry local fixtures. The
  // raw engine answers constant-False while stock refuses
  // (`equal(amount, amount)` not supported), and the query path refuses.
  const balanceFiles = {
    "main.beancount": `2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 pad Assets:Cash Equity:Opening
2024-01-03 balance Assets:Cash 100 USD
`,
  };
  const rawBalanceAmount = await withLedger(
    balanceFiles,
    "main.beancount",
    (ledger) => ledger.query("SELECT amount = amount AS e FROM balances LIMIT 1"),
  );
  assert(
    JSON.stringify(rawBalanceAmount.rows) === "[[false]]" &&
      !rawBalanceAmount.errors.some((e) => e.severity === "error"),
    "raw engine still answers amount = amount on balances constant-False (the guard is load-bearing)",
  );
  const guardedBalanceAmount = await queryLedgerFilesResult(
    balanceFiles,
    "main.beancount",
    "SELECT amount = amount AS e FROM balances LIMIT 1",
  );
  assert(
    guardedBalanceAmount.rows.length === 0 &&
      guardedBalanceAmount.errors.some(
        (e) =>
          e.severity === "error" && e.message.includes("composite BQL values"),
      ),
    "the query path refuses amount = amount on balances",
  );
  const priceFiles = {
    "main.beancount": `2024-01-01 open Assets:Cash USD
2024-02-01 price USD 1.10 EUR
`,
  };
  const rawPriceAmount = await withLedger(priceFiles, "main.beancount", (ledger) =>
    ledger.query("SELECT amount = amount AS e FROM prices LIMIT 1"),
  );
  assert(
    JSON.stringify(rawPriceAmount.rows) === "[[false]]" &&
      !rawPriceAmount.errors.some((e) => e.severity === "error"),
    "raw engine still answers amount = amount on prices constant-False (the guard is load-bearing)",
  );
  const guardedPriceAmount = await queryLedgerFilesResult(
    priceFiles,
    "main.beancount",
    "SELECT amount = amount AS e FROM prices LIMIT 1",
  );
  assert(
    guardedPriceAmount.rows.length === 0 &&
      guardedPriceAmount.errors.some(
        (e) =>
          e.severity === "error" && e.message.includes("composite BQL values"),
      ),
    "the query path refuses amount = amount on prices",
  );

  // Ordinal ids (w23/153): the raw engine projects positional ordinals
  // for `id` while stock projects stable content hashes, so the query
  // path refuses any `id` mention before it runs.
  const rawId = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT id FROM postings LIMIT 1"),
  );
  assert(
    JSON.stringify(rawId.rows) === "[[3]]" &&
      typeof rawId.rows[0]?.[0] === "number" &&
      !rawId.errors.some((e) => e.severity === "error"),
    "raw engine still projects a numeric ordinal for id (the guard is load-bearing)",
  );
  for (const query of [
    "SELECT id FROM postings LIMIT 1",
    "SELECT id FROM entries LIMIT 1",
    "SELECT count(*) FROM postings WHERE id = 'abc'",
    "SELECT count(*) FROM postings WHERE id = 3",
    "SELECT id = id AS e FROM postings LIMIT 1",
  ]) {
    const guardedId = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedId.rows.length === 0 &&
        guardedId.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("positional ordinals"),
        ),
      `the query path refuses ${query}`,
    );
  }
  const idFreeWhere = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings WHERE payee = 'Store'",
  );
  assert(
    JSON.stringify(idFreeWhere.rows) === `[{"count(*)":2}]`,
    "id-free filtered queries still answer through the guard",
  );

  // String concatenation (w23/154): stock concatenates str + str while
  // the raw engine refuses with a generic numeric error and offers no
  // concat-capable spelling, so the query path refuses with a message
  // naming the limitation — and numeric addition still answers.
  const rawConcat = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT 'a' + 'b' AS s LIMIT 1"),
  );
  assert(
    rawConcat.rows.length === 0 &&
      rawConcat.errors.some(
        (e) =>
          e.severity === "error" &&
          /arithmetic requires numeric values/.test(e.message),
      ),
    "raw engine still refuses str + str with the generic numeric error (the guard renames it)",
  );
  for (const query of [
    "SELECT 'a' + 'b' AS s LIMIT 1",
    "SELECT payee + '!' AS s FROM postings LIMIT 1",
  ]) {
    const guardedConcat = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedConcat.rows.length === 0 &&
        guardedConcat.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("String concatenation with +"),
        ),
      `the query path refuses with the concat message: ${query}`,
    );
  }
  const stillAdds = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT 1 + 2 AS s LIMIT 1",
  );
  assert(
    JSON.stringify(stillAdds.rows) === `[{"s":"3"}]`,
    "numeric addition still answers through the guard",
  );

  // Date arithmetic (w23/165): stock shifts dates by day counts while the
  // raw engine refuses with the generic numeric error and offers no
  // operator spelling, so the query path refuses with a message naming
  // the limitation and the date_add/date_diff workaround — and the
  // workaround itself answers. `+date + 7` would otherwise die in the
  // engine's missing-unary-plus syntax error (it.3730); `-date + 7`
  // keeps the generic refusal (stock refuses neg too).
  const rawDateArith = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT date + 7 LIMIT 1"),
  );
  assert(
    rawDateArith.rows.length === 0 &&
      rawDateArith.errors.some(
        (e) =>
          e.severity === "error" &&
          /arithmetic requires numeric values/.test(e.message),
      ),
    "raw engine still refuses date + int with the generic numeric error (the guard renames it)",
  );
  for (const query of [
    "SELECT date + 7 LIMIT 1",
    "SELECT 7 + date LIMIT 1",
    "SELECT date - date LIMIT 1",
    "SELECT +date + 7 LIMIT 1",
    "SELECT date + /* inline */ 7 LIMIT 1",
  ]) {
    const guardedDateArith = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedDateArith.rows.length === 0 &&
        guardedDateArith.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("Date arithmetic with + and -"),
        ),
      `the query path refuses with the date-arithmetic message: ${query}`,
    );
  }
  const negDateKept = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT -date + 7 LIMIT 1",
  );
  assert(
    negDateKept.rows.length === 0 &&
      negDateKept.errors.some((e) => e.severity === "error") &&
      !negDateKept.errors.some((e) =>
        e.message.includes("Date arithmetic with + and -"),
      ),
    "neg(date) keeps the generic refusal instead of the date-arithmetic message",
  );
  const workaroundAnswers = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT date_diff(date, date) AS s LIMIT 1",
  );
  assert(
    JSON.stringify(workaroundAnswers.rows) === `[{"s":0}]`,
    "the date_diff workaround answers through the guard",
  );

  // OPEN-scope summarization (w23/166, doc-minimum pins): stock's
  // `FROM OPEN ON <date>` leads with a synthetic opening-balances entry
  // dated `<date>−1`, while the engine evaluates a plain suffix filter.
  // On this fixture (`OPEN ON 2024-01-18`) that is 2 suffix rows vs
  // stock's 6 (4 summary postings dated 2024-01-17); grouped sums miss
  // the summary legs while the ungrouped total still nets to zero, and
  // the CLOSE ON mirror agrees. These pins keep the README's
  // suffix-only claim honest; when the engine synthesizes the entry,
  // delete them and update the doc.
  const openCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) AS n FROM OPEN ON 2024-01-18",
  );
  assert(
    JSON.stringify(openCount.rows) === `[{"n":2}]`,
    "OPEN ON mid-period counts suffix rows only (stock adds 4 summary postings)",
  );
  const openFirstRow = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT date FROM OPEN ON 2024-01-18 ORDER BY date LIMIT 1",
  );
  assert(
    JSON.stringify(openFirstRow.rows) === `[{"date":"2024-01-20"}]`,
    "no summary block leads OPEN ON rows (stock's first row is 2024-01-17)",
  );
  const openFull = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) AS n FROM OPEN ON 2024-01-01",
  );
  assert(
    JSON.stringify(openFull.rows) === `[{"n":4}]`,
    "OPEN ON at the period start agrees (no pre-activity to summarize)",
  );
  const closeCount = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) AS n FROM CLOSE ON 2024-01-18",
  );
  assert(
    JSON.stringify(closeCount.rows) === `[{"n":2}]`,
    "CLOSE ON agrees with stock (the gap is OPEN-summarization only)",
  );
  const openGrouped = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query(
      "SELECT account, sum(position) AS s FROM OPEN ON 2024-01-18 GROUP BY account ORDER BY account",
    ),
  );
  const openAccounts = openGrouped.rows.map(
    (row) => (row as [string, unknown])[0],
  );
  assert(
    JSON.stringify(openAccounts) ===
      JSON.stringify(["Assets:Checking", "Expenses:Food"]),
    "grouped OPEN sums miss the summary-only groups (stock adds Equity:Earnings:Previous and Equity:Opening-Balances)",
  );
  assert(
    JSON.stringify(
      ((openGrouped.rows[0] as [string, unknown])[1] as { positions: Array<{ units: { number: string } }> }).positions[0]
        ?.units.number,
    ) === `"-50.00"`,
    "grouped OPEN Checking sums the suffix only (stock 2950.00 with the summary leg)",
  );
  const openTotal = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT sum(position) AS s FROM OPEN ON 2024-01-18"),
  );
  assert(
    JSON.stringify(
      ((openTotal.rows[0] as [unknown])[0] as { positions: Array<{ units: { number: string } }> }).positions[0]
        ?.units.number,
    ) === `"0.00"`,
    "ungrouped OPEN sum still nets to zero (stock renders the same total blank)",
  );

  // str() input domain (w23/155, doc-minimum pins): stock stringifies
  // positions, inventories, and sets while the engine refuses with its
  // whitelist error — and scalar inputs still stringify. These pins
  // keep the README's no-rewrite claim honest; when the engine grows
  // the overloads, delete them and update the doc.
  for (const query of [
    "SELECT str(position) AS s LIMIT 1",
    "SELECT str(balance) AS s LIMIT 1",
    "SELECT str(tags) AS s LIMIT 1",
  ]) {
    const refused = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      refused.rows.length === 0 &&
        refused.errors.some(
          (e) =>
            e.severity === "error" && /STR expects /.test(e.message),
        ),
      `the engine still refuses composite str() input: ${query}`,
    );
  }
  const strScalar = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT str(number) AS s LIMIT 1",
  );
  assert(
    JSON.stringify(strScalar.rows) === `[{"s":"3000.00"}]`,
    "scalar str() still stringifies",
  );

  // Quoted identifiers (w23/157): stock resolves `"name"` to the column
  // while the raw engine reads a string literal, so the query path
  // refuses quoted known-columns before the query runs — and unknown
  // quoted names still fall back to literals on both sides.
  const rawQuotedColumn = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query('SELECT "narration" LIMIT 1'),
  );
  assert(
    JSON.stringify(rawQuotedColumn.rows) === `[["narration"]]` &&
      !rawQuotedColumn.errors.some((e) => e.severity === "error"),
    "raw engine still reads a quoted column as a literal (the guard is load-bearing)",
  );
  for (const query of [
    'SELECT "narration" LIMIT 1',
    'SELECT "date" FROM entries LIMIT 1',
    'SELECT count(*) AS n WHERE "account" = \'Assets:Cash\'',
  ]) {
    const guardedQuoted = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedQuoted.rows.length === 0 &&
        guardedQuoted.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("Quoted identifiers are not supported"),
        ),
      `the query path refuses ${query}`,
    );
  }
  const quotedFallback = await queryLedgerFiles(
    FILES,
    "main.beancount",
    'SELECT "nonexistent" LIMIT 1',
  );
  assert(
    JSON.stringify(quotedFallback.rows) === `[{"\\"nonexistent\\"":"nonexistent"}]`,
    "unknown quoted names still fall back to literals through the guard",
  );

  // Inventory GROUP BY (w23/129): the raw engine collapses GROUP BY balance
  // into one group while DISTINCT finds each value, so the query path
  // refuses the named and ordinal forms — and scalar grouping still answers.
  const rawInventoryGroup = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT balance, count(*) FROM postings GROUP BY balance"),
  );
  const distinctBalances = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT DISTINCT balance FROM postings"),
  );
  assert(
    rawInventoryGroup.rows.length === 1 &&
      distinctBalances.rows.length > 1 &&
      !rawInventoryGroup.errors.some((e) => e.severity === "error"),
    "raw engine still collapses GROUP BY balance (the guard is load-bearing)",
  );
  for (const query of [
    "SELECT balance, count(*) FROM postings GROUP BY balance",
    "SELECT balance, count(*) FROM postings GROUP BY 1",
  ]) {
    const guardedGroup = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedGroup.rows.length === 0 &&
        guardedGroup.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("inventory column balance"),
        ),
      `the query path refuses ${query.slice(query.indexOf("GROUP"))}`,
    );
  }
  const scalarGroup = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT payee, count(*) FROM postings GROUP BY payee",
  );
  assert(
    scalarGroup.rows.length === 2,
    "scalar grouping still answers through the guard",
  );

  // GROUP-BY coverage (w23/131): the raw engine reports each group's
  // first-row value for bare non-grouped columns while stock refuses, so
  // the query path refuses — and covered grouping still answers.
  const rawUncovered = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT account, date, count(*) FROM postings GROUP BY account"),
  );
  const checkingDates = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query(
      "SELECT DISTINCT date FROM postings WHERE account = 'Assets:Checking'",
    ),
  );
  assert(
    rawUncovered.rows.length === 3 &&
      checkingDates.rows.length === 2 &&
      !rawUncovered.errors.some((e) => e.severity === "error"),
    "raw engine still reports first-row dates for bare grouped columns (the guard is load-bearing)",
  );
  const guardedUncovered = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT account, date, count(*) FROM postings GROUP BY account",
  );
  assert(
    guardedUncovered.rows.length === 0 &&
      guardedUncovered.errors.some(
        (e) =>
          e.severity === "error" && e.message.includes('Bare column "date"'),
      ),
    "the query path refuses the uncovered bare column and names it",
  );
  const coveredGroup = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT account, count(*) FROM postings GROUP BY account",
  );
  assert(
    coveredGroup.rows.length === 3,
    "covered grouping still answers through the guard",
  );

  // Mixed-type comparison (w23/132): the raw engine filters everything out
  // instead of coercing, while the typed form matches and stock refuses,
  // so the query path refuses the mixed =/!=/IN forms — and same-typed
  // comparisons still answer.
  const rawMixedEq = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT count(*) FROM postings WHERE date = '2024-01-15'"),
  );
  const rawTypedEq = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT count(*) FROM postings WHERE date = 2024-01-15"),
  );
  assert(
    JSON.stringify(rawMixedEq.rows) === "[[0]]" &&
      JSON.stringify(rawTypedEq.rows) === "[[2]]" &&
      !rawMixedEq.errors.some((e) => e.severity === "error"),
    "raw engine still filters out mixed-type equality (the guard is load-bearing)",
  );
  for (const [query, marker] of [
    ["SELECT count(*) FROM postings WHERE date = '2024-01-15'", "Mixed-type comparison"],
    ["SELECT count(*) FROM postings WHERE number = '3000'", "Mixed-type comparison"],
    ["SELECT count(*) FROM postings WHERE date IN ('2024-01-15')", "IN compares"],
  ]) {
    const guardedMixed = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      guardedMixed.rows.length === 0 &&
        guardedMixed.errors.some(
          (e) => e.severity === "error" && e.message.includes(marker),
        ),
      `the query path refuses ${query.slice(query.indexOf("WHERE"))}`,
    );
  }
  const typedEq = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings WHERE number = 3000",
  );
  assert(
    JSON.stringify(typedEq.rows) === `[{"count(*)":1}]`,
    "same-typed numeric comparison still answers through the guard",
  );

  // Integer magnitudes (w23/133): the raw engine throws on dead-zone
  // literals, silently truncates LIMIT past 2^32 to its low 32 bits,
  // misreports past-MAX literals as a position-0 syntax error, and
  // NULLs constant overflow — so the pipeline routes the dead zone
  // through decimal() and caps huge LIMITs, and the query path refuses
  // the rest. Stock oracle (beanquery 0.2.0, run 2026-10-28): dead-zone
  // and MAX literals exact, MAX+5-5 exact, LIMIT 2^32 returns all rows.
  let deadZoneThrew = "";
  try {
    await withLedger(FILES, "main.beancount", (ledger) =>
      ledger.query("SELECT 9007199254740992"),
    );
  } catch (error) {
    deadZoneThrew = String(error);
  }
  assert(
    deadZoneThrew.includes("can't be represented as a JavaScript number"),
    "raw engine still throws serializing a dead-zone literal (the rewrite is load-bearing)",
  );
  let intCallThrew = "";
  try {
    await withLedger(FILES, "main.beancount", (ledger) =>
      ledger.query("SELECT int('9007199254740992')"),
    );
  } catch (error) {
    intCallThrew = String(error);
  }
  assert(
    intCallThrew.includes("can't be represented as a JavaScript number"),
    "raw engine still throws serializing a dead-zone int() (the call rule is load-bearing)",
  );
  const rawTruncatedLimit = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT * FROM postings LIMIT 4294967296"),
  );
  const rawPlusOneLimit = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT * FROM postings LIMIT 4294967297"),
  );
  assert(
    rawTruncatedLimit.rows.length === 0 &&
      rawPlusOneLimit.rows.length === 1 &&
      !rawTruncatedLimit.errors.some((e) => e.severity === "error"),
    "raw engine still keeps only the low 32 LIMIT bits, silently (the cap is load-bearing)",
  );
  const rawPastMax = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT 79228162514264337593543950336"),
  );
  assert(
    rawPastMax.rows.length === 0 &&
      rawPastMax.errors.some(
        (e) =>
          e.severity === "error" &&
          e.message.includes("syntax error at position 0"),
      ),
    "raw engine still misreports a past-MAX literal as a position-0 syntax error (the refusal is load-bearing)",
  );
  const rawOverflowNull = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT 79228162514264337593543950335 + 5 - 5"),
  );
  assert(
    JSON.stringify(rawOverflowNull.rows) === "[[null],[null],[null],[null]]" &&
      !rawOverflowNull.errors.some((e) => e.severity === "error"),
    "raw engine still NULLs transient constant overflow (the refusal is load-bearing)",
  );
  const rescuedDeadZone = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT 9007199254740992"),
  );
  assert(
    JSON.stringify(rescuedDeadZone.rows) ===
      `[{"decimal('9007199254740992')":"9007199254740992"},{"decimal('9007199254740992')":"9007199254740992"},{"decimal('9007199254740992')":"9007199254740992"},{"decimal('9007199254740992')":"9007199254740992"}]`,
    "pipelined dead-zone literal answers its exact digits",
  );
  const rescuedIntCall = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT int('9007199254740992')"),
  );
  assert(
    JSON.stringify(rescuedIntCall.rows) ===
      JSON.stringify(rescuedDeadZone.rows),
    "pipelined dead-zone int() answers the same exact digits",
  );
  const rewrittenPredicate = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine(
      "SELECT count(*) FROM postings WHERE number = 9007199254740992",
    ),
  );
  assert(
    JSON.stringify(rewrittenPredicate.rows) === `[{"count(*)":0}]`,
    "rewritten dead-zone predicate still counts zero like the raw form",
  );
  const maxLiteral = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT 79228162514264337593543950335"),
  );
  assert(
    JSON.stringify(maxLiteral.rows) ===
      `[{"79228162514264337593543950335":"79228162514264337593543950335"},{"79228162514264337593543950335":"79228162514264337593543950335"},{"79228162514264337593543950335":"79228162514264337593543950335"},{"79228162514264337593543950335":"79228162514264337593543950335"}]`,
    "MAX literal still renders exactly through the pipeline",
  );
  const cappedLimit = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT * FROM postings LIMIT 4294967296"),
  );
  const uncappedLimit = await queryLedgerFiles(
    FILES,
    "main.beancount",
    "SELECT * FROM postings",
  );
  assert(
    cappedLimit.rows.length === 4 &&
      JSON.stringify(cappedLimit.rows) === JSON.stringify(uncappedLimit.rows),
    "pipelined LIMIT 2^32 answers every row like stock",
  );
  for (const [query, marker] of [
    ["SELECT 79228162514264337593543950336", "79228162514264337593543950335"],
    [
      "SELECT 79228162514264337593543950335 + 5 - 5",
      "overflows the maximum",
    ],
  ]) {
    const refused = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(query),
    );
    assert(
      refused.rows.length === 0 &&
        refused.errors.some(
          (e) => e.severity === "error" && e.message.includes(marker),
        ),
      `the query path refuses ${query} naming ${marker}`,
    );
  }

  // Decimal precision (w23/160): the raw engine silently half-up rounds
  // literals whose mantissa exceeds MAX, and zeroes fractions past the
  // 28-place scale — stock renders both exactly — so the query path
  // refuses them. Trailing-zero mantissas that fit still answer exactly.
  const rawRoundedDecimal = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT 79228162514264337593543950334.9 LIMIT 1"),
  );
  assert(
    JSON.stringify(rawRoundedDecimal.rows) ===
      `[["79228162514264337593543950335"]]` &&
      !rawRoundedDecimal.errors.some((e) => e.severity === "error"),
    "raw engine still rounds an over-precision decimal to MAX, silently (the refusal is load-bearing)",
  );
  const rawZeroedScale = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT 0.00000000000000000000000000001 LIMIT 1"),
  );
  assert(
    JSON.stringify(rawZeroedScale.rows) ===
      `[["0.0000000000000000000000000000"]]` &&
      !rawZeroedScale.errors.some((e) => e.severity === "error"),
    "raw engine still zeroes a 29-place fraction, silently (the refusal is load-bearing)",
  );
  for (const query of [
    "SELECT 79228162514264337593543950334.9",
    "SELECT 0.00000000000000000000000000001",
    "SELECT count(*) FROM postings WHERE number = 79228162514264337593543950334.9",
  ]) {
    const refusedPrecision = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(query),
    );
    assert(
      refusedPrecision.rows.length === 0 &&
        refusedPrecision.errors.some(
          (e) =>
            e.severity === "error" &&
            e.message.includes("decimal precision"),
        ),
      `the query path refuses ${query} naming decimal precision`,
    );
  }
  const exactMantissa = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT 7922816251426433759354395033.50 LIMIT 1"),
  );
  assert(
    JSON.stringify(exactMantissa.rows) ===
      `[{"7922816251426433759354395033.5":"7922816251426433759354395033.5"}]`,
    "a trailing-zero mantissa that fits still answers exactly",
  );
  const unpipedLimit = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT * FROM postings LIMIT 4294967296",
  );
  assert(
    unpipedLimit.rows.length === 0 &&
      unpipedLimit.errors.some(
        (e) => e.severity === "error" && e.message.includes("32-bit page"),
      ),
    "the guard refuses an unpipelined huge LIMIT (backstop behind the cap)",
  );
  const smallArithmetic = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT 5 - 3"),
  );
  const smallLimit = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine("SELECT * FROM postings LIMIT 1"),
  );
  assert(
    JSON.stringify(smallArithmetic.rows) ===
      `[{"5 - 3":"2"},{"5 - 3":"2"},{"5 - 3":"2"},{"5 - 3":"2"}]` &&
      smallLimit.rows.length === 1,
    "small arithmetic and small LIMITs still answer through the pipeline",
  );

  // Aliased all-NULL dtypes (w23/134): the name fallback reports the
  // alias's lookalike type, so the shell attributes dtypes with the
  // query's own SELECT aliases and reports `unknown` for an alias over
  // another expression. Bare columns keep the name rule.
  for (const [query, name, expected] of [
    ["SELECT payee AS number FROM postings WHERE FALSE", "number", "unknown"],
    ["SELECT cost_currency AS number FROM postings LIMIT 1", "number", "unknown"],
    [
      "SELECT upper(payee) AS number FROM postings WHERE FALSE",
      "number",
      "unknown",
    ],
    ["SELECT NULL AS number LIMIT 1", "number", "unknown"],
    ["SELECT payee AS xyz FROM postings WHERE FALSE", "xyz", "unknown"],
    ["SELECT number FROM postings WHERE FALSE", "number", "Decimal"],
    ["SELECT payee AS payee FROM postings WHERE FALSE", "payee", "str"],
  ]) {
    const shell = queryResultToShellResult(
      await queryLedgerFilesResult(
        FILES,
        "main.beancount",
        normalizeBqlQueryForEngine(query),
      ),
      extractSelectAliases(query),
    );
    assert(
      JSON.stringify(shell.table?.types) ===
        JSON.stringify([{ name, dtype: expected }]),
      `${query} reports dtype ${expected}`,
    );
  }

  // Masked unknown names (w23/135): the raw engine resolves value-clause
  // names lazily, so empty input masks unknown functions/columns with a
  // clean empty result — the query path re-runs empties with every
  // WHERE widened to OR TRUE and adopts name-shaped failures.
  const rawMasked = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT nosuchfn(payee) FROM postings WHERE FALSE LIMIT 1"),
  );
  assert(
    rawMasked.rows.length === 0 &&
      !rawMasked.errors.some((e) => e.severity === "error"),
    "raw engine still masks unknown names over empty input (the probe is load-bearing)",
  );
  for (const [query, marker] of [
    [
      "SELECT nosuchfn(payee) FROM postings WHERE FALSE LIMIT 1",
      "no function matches",
    ],
    [
      "SELECT nosuchcol FROM postings WHERE FALSE LIMIT 1",
      "not found",
    ],
    ["SELECT count(nosuchcol) FROM postings WHERE FALSE", "not found"],
    [
      "SELECT payee FROM postings WHERE FALSE ORDER BY nosuchfn(payee)",
      "no function matches",
    ],
    [
      "SELECT count(*) FROM postings WHERE FALSE GROUP BY nosuchfn(flag)",
      "no function matches",
    ],
    [
      "SELECT flag FROM postings WHERE FALSE GROUP BY flag HAVING nosuchfn(flag) = 1",
      "no function matches",
    ],
    [
      "SELECT * FROM (SELECT payee FROM postings WHERE FALSE LIMIT 5) WHERE nosuchfn(payee)",
      "no function matches",
    ],
  ]) {
    const unmasked = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      query,
    );
    assert(
      unmasked.rows.length === 0 &&
        unmasked.errors.some(
          (e) => e.severity === "error" && e.message.includes(marker),
        ),
      `the query path unmasks ${query}`,
    );
  }
  const goodEmpty = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT payee FROM postings WHERE FALSE LIMIT 1",
  );
  const goodEmptyCount = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT count(*) FROM postings WHERE FALSE",
  );
  assert(
    goodEmpty.rows.length === 0 &&
      !goodEmpty.errors.some((e) => e.severity === "error") &&
      JSON.stringify(goodEmptyCount.rows) === "[[0]]" &&
      !goodEmptyCount.errors.some((e) => e.severity === "error"),
    "genuinely empty results stay clean through the probe",
  );

  // Derived-column dtypes on empty results (w23/136 core): the
  // account-set columns keep their schema dtype with zero rows, like
  // stored columns — while aliases shadowing those names stay `unknown`
  // through the w23/134 layer. Bare `id` left these pins in w23/153:
  // the column now refuses before it runs (ordinals vs stock hashes),
  // so it can no longer carry an empty-result dtype affidavit; the
  // shadowed-`id` pin stays, doubling as the 153 shadow carve-out.
  for (const [query, expected] of [
    [
      "SELECT other_accounts, number FROM postings WHERE FALSE",
      ["set", "Decimal"],
    ],
    ["SELECT accounts FROM entries WHERE FALSE", ["set"]],
    ["SELECT payee AS id FROM postings WHERE FALSE", ["unknown"]],
  ] as Array<[string, string[]]>) {
    const shell = queryResultToShellResult(
      await queryLedgerFilesResult(
        FILES,
        "main.beancount",
        normalizeBqlQueryForEngine(query),
      ),
      extractSelectAliases(query),
    );
    assert(
      JSON.stringify(shell.table?.types.map((type) => type.dtype)) ===
        JSON.stringify(expected),
      `${query} keeps dtypes ${expected}`,
    );
  }

  // Amount-column dtypes without values (w23/167): `price`
  // (postings), `amount` (prices/balances), and `discrepancy`
  // (balances) report `Amount` on zero rows and all-NULL cells, and
  // `tolerance` (balances) reports `Decimal` — per stock's registry.
  // This fixture carries no @ prices, so bare `price` is all-NULL.
  for (const [query, expected] of [
    ["SELECT price FROM postings WHERE FALSE", ["Amount"]],
    ["SELECT price, cost_number FROM postings LIMIT 1", ["Amount", "Decimal"]],
    ["SELECT amount FROM prices WHERE FALSE", ["Amount"]],
    [
      "SELECT amount, tolerance, discrepancy FROM balances WHERE FALSE",
      ["Amount", "Decimal", "Amount"],
    ],
  ] as Array<[string, string[]]>) {
    const shell = queryResultToShellResult(
      await queryLedgerFilesResult(
        FILES,
        "main.beancount",
        normalizeBqlQueryForEngine(query),
      ),
      extractSelectAliases(query),
    );
    assert(
      JSON.stringify(shell.table?.types.map((type) => type.dtype)) ===
        JSON.stringify(expected),
      `${query} keeps dtypes ${expected}`,
    );
  }

  // Expression-typed string dtypes (w23/146): a string literal or
  // string-function call reports `str` whatever the values look like —
  // value sniffing mistyped `'3000.00'` and `str(number)` as Decimal and
  // `str(date)` as date. Bare engine columns keep sniffing.
  for (const [query, expected] of [
    ["SELECT '3000.00', 'abc' LIMIT 1", ["str", "str"]],
    ["SELECT str(number) LIMIT 1", ["str"]],
    ["SELECT upper(str(number)) LIMIT 1", ["str"]],
    ["SELECT str(date) LIMIT 1", ["str"]],
    ["SELECT str(number) AS s LIMIT 1", ["str"]],
    ["SELECT number, date LIMIT 1", ["Decimal", "date"]],
  ] as Array<[string, string[]]>) {
    const shell = queryResultToShellResult(
      await queryLedgerFilesResult(
        FILES,
        "main.beancount",
        normalizeBqlQueryForEngine(query),
      ),
      extractSelectAliases(query),
    );
    assert(
      JSON.stringify(shell.table?.types.map((type) => type.dtype)) ===
        JSON.stringify(expected),
      `${query} reports dtypes ${expected}`,
    );
  }

  // Text header widths (w23/138): columns size to the wider of header
  // and values, so a long name over narrow values renders in full.
  const narrowText = queryResultToText(
    await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(
        "SELECT cost_currency, number FROM postings LIMIT 1",
      ),
    ),
  );
  assert(
    narrowText.split("\n")[0]?.includes("cost_currency") === true,
    "text keeps the full cost_currency header over empty values",
  );
  const emptyText = queryResultToText(
    await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      "SELECT payee FROM postings WHERE FALSE",
    ),
  );
  assert(
    emptyText === "",
    "text still renders zero rows as the empty string",
  );

  // Windows over named FROM (w23/139): the raw engine numbers windows
  // only in its default postings scope, failing named tables with a
  // bogus subquery error — so the pipeline drops `FROM postings` under
  // top-level windows (bare and postings agree row-for-row), and the
  // query path refuses the rest with the actual cause.
  const rawNamedWindow = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT row_number() OVER () FROM postings LIMIT 3"),
  );
  const rawBareWindow = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT row_number() OVER () LIMIT 3"),
  );
  assert(
    rawNamedWindow.rows.length === 0 &&
      rawNamedWindow.errors.some(
        (e) =>
          e.severity === "error" &&
          e.message.includes("not supported in subquery expressions"),
      ) &&
      JSON.stringify(rawBareWindow.rows) === "[[1],[2],[3]]",
    "raw engine still fails named windows as subqueries while bare numbers (the rescue is load-bearing)",
  );
  const rawBareScope = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT payee FROM postings LIMIT 5"),
  );
  const rawNamedScope = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT payee LIMIT 5"),
  );
  assert(
    JSON.stringify(rawBareScope.rows) === JSON.stringify(rawNamedScope.rows),
    "raw bare and postings scopes still agree row-for-row (the rescue's identity)",
  );
  const rawUnimplemented = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("SELECT sum(number) OVER () LIMIT 1"),
  );
  assert(
    rawUnimplemented.errors.some(
      (e) =>
        e.severity === "error" &&
        e.message.includes("Window function 'sum' not yet implemented"),
    ),
    "raw engine still reports unimplemented windows by name (the guard's set is current)",
  );
  const rescuedWindow = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine(
      "SELECT row_number() OVER () FROM postings LIMIT 3",
    ),
  );
  const rescuedOrdered = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine(
      "SELECT payee, row_number() OVER (ORDER BY payee) FROM postings LIMIT 3",
    ),
  );
  const rescuedQuoted = await queryLedgerFiles(
    FILES,
    "main.beancount",
    normalizeBqlQueryForEngine(
      'SELECT row_number() OVER () FROM "postings" LIMIT 2',
    ),
  );
  assert(
    JSON.stringify(rescuedWindow.rows) ===
      `[{"row_number":1},{"row_number":2},{"row_number":3}]` &&
      JSON.stringify(rescuedOrdered.rows) ===
        `[{"payee":"Employer","row_number":1},{"payee":"Employer","row_number":2},{"payee":"Store","row_number":3}]` &&
      rescuedQuoted.rows.length === 2,
    "pipelined postings windows number like the bare form",
  );
  for (const [query, marker] of [
    [
      "SELECT row_number() OVER () FROM entries LIMIT 3",
      "cannot evaluate over FROM entries",
    ],
    [
      "SELECT row_number() OVER () FROM (SELECT payee FROM postings LIMIT 5)",
      "cannot evaluate over a derived table",
    ],
    [
      "SELECT flag, row_number() OVER () FROM postings GROUP BY flag LIMIT 5",
      "not supported with GROUP BY",
    ],
    [
      "SELECT sum(number) OVER () FROM postings LIMIT 1",
      "Window function 'sum' is not implemented",
    ],
  ]) {
    const refused = await queryLedgerFilesResult(
      FILES,
      "main.beancount",
      normalizeBqlQueryForEngine(query),
    );
    assert(
      refused.rows.length === 0 &&
        refused.errors.some(
          (e) => e.severity === "error" && e.message.includes(marker),
        ),
      `the query path refuses ${query} naming the cause`,
    );
  }

  const count = await countDirectives(
    "2024-01-01 open Assets:Cash USD\n2024-01-02 open Income:Z USD\n",
  );
  assert(
    count === 2,
    `countDirectives on a leaf file returns 2 (got ${count})`,
  );

  // The free-tier precheck and the push gate count through the worker pool
  // (w0/m5); it must agree with the in-process count, include graph and all.
  const countFiles: FileMap = {
    "main.bean":
      'include "2024.bean"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n',
    "2024.bean":
      '2024-01-05 * "Lunch"\n  Expenses:Food 10 USD\n  Assets:Cash\n2024-01-06 balance Assets:Cash -10 USD\n',
  };
  const workerCount = await countLedgerDirectives(countFiles, "main.bean");
  const inProcessCount = await countLedgerDirectivesInProcess(
    countFiles,
    "main.bean",
  );
  assert(
    workerCount === 4 && inProcessCount === 4,
    `the worker-pool directive count matches the in-process count across an include (worker ${workerCount}, in-process ${inProcessCount})`,
  );

  const formatted = await formatSource(
    '2024-01-15 * "x" "y"\n  Assets:Cash 100 USD\n  Income:Z -100 USD\n',
  );
  assert(
    formatted.formatted !== null && formatted.formatted.includes("Assets:Cash"),
    "format() returns aligned source",
  );

  // Tier-2 directive-walk reports against REAL parsed WASM directives.
  const directives = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.getDirectives(),
  );
  const counts = entriesCountPerType(directives);
  assert(
    counts.transaction === 2 && counts.open === 3,
    "entriesCountPerType on real parse",
  );
  const attrs = collectAttributes(directives);
  assert(
    attrs.payees.includes("Employer") && attrs.payees.includes("Store"),
    "collectAttributes extracts payees from real directives",
  );
  assert(
    attrs.accounts.includes("Assets:Checking") &&
      attrs.accounts.includes("Expenses:Food"),
    "collectAttributes extracts accounts from real directives",
  );
  assert(
    attrs.currencies.includes("USD"),
    "collectAttributes extracts currencies",
  );
  assert(attrs.tags.includes("income"), "collectAttributes extracts tags");

  // queryShell endpoint mapping against a REAL BQL result (the wired endpoint).
  const rawResult = await withLedger(FILES, "main.beancount", (ledger) =>
    ledger.query("BALANCES"),
  );
  const shell = queryResultToShellResult(rawResult);
  assert(
    shell.resultType === "table" && (shell.table?.types.length ?? 0) >= 2,
    "queryResultToShellResult produces a typed table from a real query",
  );
  assert(
    (shell.table?.rows.length ?? 0) >= 3,
    "shell table has the expected account rows",
  );
  const shellText = queryResultToText(rawResult);
  assert(
    shellText.includes("Assets:Checking"),
    "queryResultToText renders the real query as text",
  );

  // Static expression dtypes on empty input (w23/164): with no values to
  // sniff, the typer reports the static type from the engine's own column
  // names — end to end against the LIVE engine, not mocked columns.
  for (const [query, dtypes] of [
    [
      "SELECT upper(payee), number + 1, year(date) WHERE FALSE",
      ["str", "Decimal", "int"],
    ],
    [
      "SELECT 1, 'a', 1.5, TRUE, NULL WHERE FALSE",
      ["int", "str", "Decimal", "bool", "str"],
    ],
    ["SELECT row_number() OVER () LIMIT 0", ["int"]],
  ] as Array<[string, string[]]>) {
    const empty = await withLedger(FILES, "main.beancount", (ledger) =>
      ledger.query(query),
    );
    const emptyShell = queryResultToShellResult(
      empty,
      extractSelectAliases(query),
    );
    assert(
      JSON.stringify(emptyShell.table?.types.map((type) => type.dtype)) ===
        JSON.stringify(dtypes),
      `empty ${query} reports [${dtypes.join(", ")}]`,
    );
  }

  // Trial-balance account hierarchy (units mode, single-currency USD).
  const assetsTree = accountHierarchy(
    directives,
    "Assets",
    "units",
    buildPriceMap(directives),
  );
  assert(assetsTree.account === "Assets", "accountHierarchy roots at Assets");
  const checking = assetsTree.children.find(
    (c) => c.account === "Assets:Checking",
  );
  assert(
    checking?.balance.USD === "2950.00" || checking?.balance.USD === "2950",
    `Assets:Checking balance is 2950 USD (got ${JSON.stringify(checking?.balance)})`,
  );
  assert(
    assetsTree.balance_children.USD === "2950.00" ||
      assetsTree.balance_children.USD === "2950",
    "Assets subtree rolls up to 2950 USD",
  );

  // Cost-lot valuation (issue #5): a held-at-cost position with NO market price
  // must value at_value to its COST (fava get_market_value fallback), not units.
  const heldSnapshot = await parseLedgerFiles(
    {
      "main.beancount":
        '2024-01-01 open Assets:Investments\n2024-01-01 open Assets:Cash\n\n2024-02-01 * "buy"\n  Assets:Investments  10 HOOL {10.00 USD}\n  Assets:Cash        -100.00 USD\n',
    },
    "main.beancount",
  );
  const heldTree = accountHierarchy(
    heldSnapshot.directives,
    "Assets:Investments",
    "at_value",
    buildPriceMap(heldSnapshot.directives),
  );
  assert(
    heldTree.balance.USD === "100.00" || heldTree.balance.USD === "100",
    `at_value falls back to cost 100 USD (got ${JSON.stringify(heldTree.balance)})`,
  );
  assert(
    heldTree.balance.HOOL === undefined,
    "at_value does not leave the position in raw HOOL units",
  );

  // fava plugin parity: `fava.plugins.*` directives are stripped before parse
  // (so the WASM does not emit E8005 / mark the ledger invalid) and reapplied in
  // the TS post-parse layer.
  const amortizeSource = [
    'plugin "fava.plugins.amortize_over"',
    "2017-01-01 open Assets:Prepaid-Expenses",
    "2017-01-01 open Expenses:Insurance:Auto",
    '2017-06-01 * "Amortize car insurance"',
    "  amortize_months: 3",
    "  Assets:Prepaid-Expenses  -600.00 USD",
    "  Expenses:Insurance:Auto",
    "2017-06-15 balance Assets:Prepaid-Expenses -200.00 USD",
  ].join("\n");
  const amortizeSnap = await parseLedgerFiles(
    { "main.beancount": amortizeSource },
    "main.beancount",
    { today: "2099-01-01" },
  );
  assert(
    amortizeSnap.valid,
    "amortize_over ledger is valid (fava plugin stripped, no E8005)",
  );
  assert(
    !amortizeSnap.errors.some((e) => e.code === "E8005"),
    "no E8005 error surfaces for a handled fava plugin",
  );
  const amortized = amortizeSnap.directives.filter(
    (d) =>
      d.type === "transaction" &&
      (d.narration ?? "").startsWith("Amortize car insurance ("),
  );
  assert(
    amortized.length === 3,
    `amortize_over splits into 3 monthly transactions (got ${amortized.length})`,
  );
  assert(
    amortized.every(
      (directive) => getDirectiveSourceId(directive) !== undefined,
    ),
    "plugin source provenance survives the production worker boundary",
  );
  const amortizeWithSources = await parseLedgerFiles(
    { "main.beancount": amortizeSource },
    "main.beancount",
    { today: "2099-01-01", includeSourceDetails: true },
  );
  const transformedWithSource = amortizeWithSources.directives.find(
    (directive) =>
      directive.type === "transaction" &&
      (directive.narration ?? "").startsWith("Amortize car insurance ("),
  );
  const transformedSourceId =
    transformedWithSource === undefined
      ? undefined
      : getDirectiveSourceId(transformedWithSource);
  assert(
    transformedSourceId !== undefined &&
      amortizeWithSources.sourceDetails?.[transformedSourceId]?.filename ===
        "main.beancount",
    "worker-cached source details resolve a plugin-transformed directive",
  );
  assert(
    !amortizeSnap.errors.some((e) => e.severity === "error"),
    "balance assertions validate against the post-plugin stream",
  );
  // w21/704: an unused pad re-checks the ledger without it (w21/675); that
  // re-check skipped the plugins, so the amortized balance failed at -600.00.
  const unusedPadSource = [
    amortizeSource,
    "2017-01-01 open Assets:Cash",
    "2017-01-01 open Equity:Open",
    '2017-01-02 * "Deposit"',
    "  Assets:Cash  100.00 USD",
    "  Equity:Open",
    "2017-03-01 pad Assets:Cash Equity:Open",
    "2017-03-02 balance Assets:Cash  100.00 USD",
  ].join("\n");
  const unusedPadCodes = (
    await parseLedgerFiles(
      { "main.beancount": unusedPadSource },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors.map((e) => e.code);
  assert(
    JSON.stringify(unusedPadCodes) === JSON.stringify(["E2003"]),
    `an unused pad beside amortize_over reports only itself (got ${unusedPadCodes})`,
  );
  const hiddenUnderPad = await parseLedgerFiles(
    {
      "main.beancount": `${unusedPadSource}\n2017-03-03 balance Assets:Cash  90.00 USD`,
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  assert(
    hiddenUnderPad.errors.some(
      (e) =>
        e.code === "E2001" &&
        e.line === 16 &&
        e.message.includes("Assets:Cash"),
    ) &&
      !hiddenUnderPad.errors.some((e) =>
        e.message.includes("Assets:Prepaid-Expenses"),
      ),
    "the re-check still finds the balance an unused pad hid, with amortize_over",
  );
  // w21/705: a pad that filled USD still covered the account's later EUR
  // balance. Beancount gives a pad only each currency's first balance.
  const otherCurrency = await parseLedgerFiles(
    {
      "main.beancount": [
        "2026-01-01 open Assets:A",
        "2026-01-01 open Equity:Open",
        "2026-01-01 open Expenses:F",
        '2026-01-02 * "dep"',
        "  Assets:A  50.00 EUR",
        "  Equity:Open  -50.00 EUR",
        "2026-02-01 pad Assets:A Equity:Open",
        "2026-02-02 balance Assets:A  100.00 USD",
        "2026-02-02 balance Assets:A  50.00 EUR",
        '2026-02-03 * "spend"',
        "  Assets:A  -10.00 EUR",
        "  Expenses:F  10.00 EUR",
        "2026-02-04 balance Assets:A  50.00 EUR",
      ].join("\n"),
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  assert(
    JSON.stringify(otherCurrency.errors.map((e) => [e.code, e.line])) ===
      JSON.stringify([["E2001", 13]]) &&
      otherCurrency.errors[0].message.includes("got 40.00 EUR"),
    `a pad that filled USD leaves a later EUR balance to its own check (got ${otherCurrency.errors.map((e) => `${e.code}@${e.line}`)})`,
  );
  // w21/720: the first pad filled USD and the second was unused; blanking the
  // first for the re-check dropped its padding, and the 04-02 failure the
  // second hid was dropped with what that caused. bean-check: E2003, then
  // "expected 100 USD != accumulated 70 USD".
  const twoPads = await parseLedgerFiles(
    {
      "main.beancount": [
        "2024-01-01 open Assets:Wallet",
        "2024-01-01 open Equity:Opening",
        "2024-01-01 open Expenses:Food",
        '2024-01-01 * "EUR in"',
        "  Assets:Wallet  50 EUR",
        "  Equity:Opening",
        "2024-01-02 pad Assets:Wallet Equity:Opening",
        "2024-01-03 balance Assets:Wallet 100 USD",
        "2024-01-04 balance Assets:Wallet 50 EUR",
        "2024-03-01 pad Assets:Wallet Equity:Opening",
        "2024-03-02 balance Assets:Wallet 100 USD",
        '2024-04-01 * "Groceries"',
        "  Assets:Wallet  -30 USD",
        "  Expenses:Food  30 USD",
        "2024-04-02 balance Assets:Wallet 100 USD",
      ].join("\n"),
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  assert(
    JSON.stringify(twoPads.errors.map((e) => [e.code, e.line])) ===
      JSON.stringify([
        ["E2003", 10],
        ["E2001", 15],
      ]) && twoPads.errors[1].message.includes("got 70 USD"),
    `a failure an unused pad hid is found beside a pad that filled its currency (got ${twoPads.errors.map((e) => `${e.code}@${e.line}`)})`,
  );
  // w21/706: rustledger reported "Multiple pad directives" on the pad after an
  // unused one; bean-check reports only the unused pad.
  const padAfterUnused = await parseLedgerFiles(
    {
      "main.beancount": [
        "2026-01-01 open Assets:A",
        "2026-01-01 open Equity:Open",
        '2026-01-02 * "dep"',
        "  Assets:A  100.00 USD",
        "  Equity:Open",
        "2026-02-01 pad Assets:A Equity:Open",
        "2026-02-02 balance Assets:A  100.00 USD",
        "2026-03-01 pad Assets:A Equity:Open",
        "2026-03-02 balance Assets:A  120.00 USD",
      ].join("\n"),
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  assert(
    JSON.stringify(padAfterUnused.errors.map((e) => [e.code, e.line])) ===
      JSON.stringify([["E2003", 6]]),
    `the pad after an unused one raises no Multiple pad directives (got ${padAfterUnused.errors.map((e) => `${e.code}@${e.line}`)})`,
  );
  // w21/708: rustledger books a sale from an AVERAGE position at the average
  // cost; Beancount 3.2 refuses it, as the CLI does.
  const averageSource = (booking: string) =>
    [
      `2024-01-01 open Assets:Broker VTI "${booking}"`,
      "2024-01-01 open Assets:Cash USD",
      "2024-01-01 open Income:Gains USD",
      '2024-01-02 * "Buy"',
      "  Assets:Broker  10 VTI {100 USD}",
      "  Assets:Cash  -1000 USD",
      '2024-02-02 * "Buy"',
      "  Assets:Broker  10 VTI {200 USD}",
      "  Assets:Cash  -2000 USD",
      '2024-06-01 * "Sell"',
      "  Assets:Broker  -10 VTI {} @ 300 USD",
      "  Assets:Cash  3000 USD",
      "  Income:Gains",
    ].join("\n");
  const averageErrors = (
    await parseLedgerFiles(
      { "main.beancount": averageSource("AVERAGE") },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors;
  assert(
    averageErrors.length === 1 &&
      averageErrors[0].line === 10 &&
      averageErrors[0].message.startsWith("AVERAGE method is not supported"),
    `a sale from an AVERAGE position is refused on its line (got ${averageErrors.map((e) => `${e.code}@${e.line} ${e.message}`)})`,
  );
  // w21/722: the first booking_method option was read; the last one wins.
  for (const [first, last, refused] of [
    ["AVERAGE", "FIFO", false],
    ["FIFO", "AVERAGE", true],
  ] as const) {
    const twice = await parseLedgerFiles(
      {
        "main.beancount":
          `option "booking_method" "${first}"\noption "booking_method" "${last}"\n` +
          averageSource("").replace(' VTI ""', " VTI"),
      },
      "main.beancount",
      { today: "2099-01-01" },
    );
    assert(
      twice.errors.some((e) => e.message.startsWith("AVERAGE")) === refused,
      `booking_method ${first} then ${last} ${refused ? "refuses" : "books"} the sale`,
    );
  }
  // w21/721: located by date and narration, the error lost its file and line
  // when another entry that day shared the narration, or the sale had none.
  for (const [sale, line] of [
    ['2024-06-01 * "Buy"', 10],
    ["2024-06-01 *", 10],
  ] as const) {
    const located = (
      await parseLedgerFiles(
        {
          "main.beancount": averageSource("AVERAGE")
            .replace('2024-06-01 * "Sell"', sale)
            .concat('\n2024-06-01 * "Buy"\n  Assets:Cash  0 USD'),
        },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors.find((e) => e.message.startsWith("AVERAGE"));
    assert(
      located?.file === "main.beancount" && located.line === line,
      `the AVERAGE error stays on its sale written ${JSON.stringify(sale)} (got ${located?.file}:${located?.line})`,
    );
  }
  // w21/735: rustledger's unique_prices flagged every same-day repeat, equal
  // ones too; Beancount refuses only prices that disagree, once per day.
  const priceErrors = (
    await parseLedgerFiles(
      {
        "main.beancount": [
          'plugin "beancount.plugins.unique_prices"',
          "2024-01-01 commodity VTI",
          "2024-01-08 price VTI 100 USD",
          "2024-01-08 price VTI 100.00 USD",
          "2024-01-09 price VTI 100 USD",
          "2024-01-09 price VTI 101 USD",
          "2024-01-09 price VTI 100 USD",
        ].join("\n"),
      },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors.map((e) => `${e.file}:${e.line} ${e.message}`);
  assert(
    JSON.stringify(priceErrors) ===
      JSON.stringify(["main.beancount:7 Disagreeing price entries"]),
    `unique_prices refuses only disagreeing prices, on bean-check's line (got ${JSON.stringify(priceErrors)})`,
  );
  // w21/736: rustledger's onecommodity honoured none of Beancount's opt-outs
  // and repeated an account once per transaction, without a location.
  const oneCommodity = (
    await parseLedgerFiles(
      {
        "main.beancount": [
          'plugin "beancount.plugins.onecommodity" "Expenses:Travel"',
          "2024-01-01 open Assets:Cash",
          "  onecommodity: FALSE",
          "2024-01-01 open Assets:Multi USD,EUR",
          "2024-01-01 open Expenses:Travel",
          "2024-01-01 open Equity:Opening",
          '2024-01-02 * "Cash"',
          "  Assets:Cash  10 USD",
          "  Assets:Cash  10 EUR",
          "  Assets:Multi  10 USD",
          "  Assets:Multi  10 EUR",
          "  Equity:Opening  -20 USD",
          "  Equity:Opening  -20 EUR",
          '2024-01-04 * "Trip"',
          "  Expenses:Travel  10 USD",
          "  Equity:Opening",
          '2024-01-05 * "Trip abroad"',
          "  Expenses:Travel  10 EUR",
          "  Equity:Opening",
        ].join("\n"),
      },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors.map((e) => `${e.file}:${e.line} ${e.message}`);
  assert(
    JSON.stringify(oneCommodity) ===
      JSON.stringify([
        "main.beancount:17 More than one currency in account 'Expenses:Travel': USD,EUR",
      ]),
    `onecommodity honours its opt-outs and reports an account once (got ${JSON.stringify(oneCommodity)})`,
  );
  // w21/737: close_tree's child closes were added after the engine validated,
  // and its auto_accounts opened no account named only by a close.
  const closeTree = async (source: string[]) =>
    (
      await parseLedgerFiles(
        { "main.beancount": source.join("\n") },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors.map((e) => `${e.code}@${e.line} ${e.message}`);
  const lateChild = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    "2024-01-01 open Assets:Broker",
    "2024-01-01 open Assets:Broker:VTI",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    '2024-05-01 * "Late"',
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
  ]);
  assert(
    JSON.stringify(lateChild) ===
      JSON.stringify([
        "E1003@6 Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ]),
    `a posting after close_tree closes its account is refused (got ${JSON.stringify(lateChild)})`,
  );
  // w21/755: with a fava plugin the transformed stream is revalidated, and it
  // saw the generated close too: the posting was reported twice.
  const withFava = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    'plugin "fava.plugins.tag_discovered_documents"',
    "2024-01-01 open Assets:Broker",
    "2024-01-01 open Assets:Broker:VTI",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    '2024-05-01 * "Late"',
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
  ]);
  assert(
    JSON.stringify(withFava) ===
      JSON.stringify([
        "E1003@7 Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ]),
    `close_tree with a fava plugin reports the posting once (got ${JSON.stringify(withFava)})`,
  );
  // w21/756: a pad after a close (close_tree's or written) raised nothing.
  for (const closed of [
    'plugin "beancount.plugins.close_tree"',
    "2024-04-01 close Assets:Broker:VTI",
  ]) {
    const padded = await closeTree([
      closed,
      "2024-01-01 open Assets:Broker",
      "2024-01-01 open Assets:Broker:VTI",
      "2024-01-01 open Equity:Opening",
      "2024-04-01 close Assets:Broker",
      "2024-05-01 pad Assets:Broker:VTI Equity:Opening",
      "2024-05-02 balance Assets:Broker:VTI 5 USD",
    ]);
    assert(
      padded.includes(
        "E1003@6 Invalid reference to inactive account 'Assets:Broker:VTI'",
      ),
      `a pad into a closed account is refused on its line (got ${JSON.stringify(padded)})`,
    );
  }
  const autoParent = await closeTree([
    'plugin "beancount.plugins.auto_accounts"',
    'plugin "beancount.plugins.close_tree"',
    '2024-01-02 * "Buy"',
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
    "2024-04-01 close Assets:Broker",
  ]);
  assert(
    autoParent.length === 0,
    `auto_accounts opens an account named only by its close (got ${JSON.stringify(autoParent)})`,
  );
  // w21/775: declared before auto_accounts, close_tree sees only the written
  // opens: it closes no child the source does not open, and drops the close
  // of a parent the source does not open, as bean-check 3.2.3 does.
  const buyThenClose = [
    '2024-01-02 * "Buy"',
    "  Assets:Broker:VTI  1 USD",
    "  Assets:Cash",
    "2024-04-01 close Assets:Broker",
  ];
  const lateBuy = ['2024-05-01 * "Late"', "  Assets:Broker:VTI  1 USD", "  Assets:Cash"];
  for (const [plugins, expected] of [
    [["close_tree", "auto_accounts"], []],
    [
      ["auto_accounts", "close_tree"],
      [
        "E1003@7 Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ],
    ],
  ] as const) {
    const ordered = await closeTree([
      ...plugins.map((name) => `plugin "beancount.plugins.${name}"`),
      ...buyThenClose,
      ...lateBuy,
    ]);
    assert(
      JSON.stringify(ordered) === JSON.stringify(expected),
      `close_tree runs at its place in the plugin order (${plugins.join(", ")}: got ${JSON.stringify(ordered)})`,
    );
  }
  const padAfterDroppedClose = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    'plugin "beancount.plugins.auto_accounts"',
    ...buyThenClose,
    "2024-05-01 pad Assets:Broker:VTI Assets:Cash",
    "2024-05-02 balance Assets:Broker:VTI 5 USD",
  ]);
  assert(
    padAfterDroppedClose.length === 0,
    `a pad into a child close_tree did not close passes (got ${JSON.stringify(padAfterDroppedClose)})`,
  );
  const unopenedParent = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    "2024-01-01 open Assets:Broker:VTI",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    ...lateBuy,
  ]);
  assert(
    JSON.stringify(unopenedParent) ===
      JSON.stringify([
        "E1003@5 Posting to inactive account Assets:Broker:VTI on 2024-05-01 (closed on 2024-04-01)",
      ]),
    `close_tree closes the children of a parent never opened, and not the parent (got ${JSON.stringify(unopenedParent)})`,
  );
  const droppedParent = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    'plugin "beancount.plugins.auto_accounts"',
    '2024-01-02 * "Buy"',
    "  Assets:Broker  1 USD",
    "  Assets:Cash",
    "2024-04-01 close Assets:Broker",
    '2024-05-01 * "Late"',
    "  Assets:Broker  1 USD",
    "  Assets:Cash",
  ]);
  assert(
    droppedParent.length === 0,
    `a close close_tree drops refuses nothing (got ${JSON.stringify(droppedParent)})`,
  );
  // w21/778: the engine's meta is a hash map; entries list it as written.
  const metaParsed = await parseLedgerFiles(
    {
      "main.beancount": [
        "2026-01-01 open Assets:Cash",
        "2026-01-01 open Expenses:Office",
        '2026-10-01 * "Supplier" "Paper"',
        '  invoice: "INV-1"',
        '  po: "PO-7"',
        "  due: 2026-11-01",
        "  paid: TRUE",
        '  note: "hello"',
        "  Expenses:Office  42.00 USD",
        '    step1: "a"',
        '    step2: "b"',
        '    step3: "c"',
        "  Assets:Cash",
      ].join("\n"),
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  const metaEntry = metaParsed.directives.find(
    (directive) => directive.type === "transaction",
  );
  const metaKeys =
    metaEntry?.type === "transaction"
      ? [
          Object.keys(metaEntry.meta ?? {}),
          Object.keys(metaEntry.postings[0]?.meta ?? {}),
        ]
      : null;
  assert(
    JSON.stringify(metaKeys) ===
      JSON.stringify([
        ["invoice", "po", "due", "paid", "note"],
        ["step1", "step2", "step3"],
      ]),
    `metadata is listed as written (got ${JSON.stringify(metaKeys)})`,
  );
  // w21/753: a child opened after its parent's close stays active, as
  // Beancount's date-ordered check leaves it, with bean-check's one error for
  // the close close_tree dated before the open.
  const lateChild2 = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    "2024-01-01 open Assets:Broker",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    "2025-01-01 open Assets:Broker:Roth",
    '2025-02-01 * "Contribution"',
    "  Assets:Broker:Roth  100.00 USD",
    "  Assets:Cash  -100.00 USD",
  ]);
  assert(
    JSON.stringify(lateChild2) ===
      JSON.stringify([
        "E1001@4 Unopened account Assets:Broker:Roth is being closed",
      ]),
    `a child opened after its parent's close takes postings (got ${JSON.stringify(lateChild2)})`,
  );
  // w21/776: with a fava plugin the stream is revalidated, and its unlocated
  // "never opened" stood in for this located error.
  const lateChildFava = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    'plugin "fava.plugins.tag_discovered_documents"',
    "2024-01-01 open Assets:Broker",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    "2025-01-01 open Assets:Broker:Roth",
    '2025-02-01 * "Contribution"',
    "  Assets:Broker:Roth  100.00 USD",
    "  Assets:Cash  -100.00 USD",
  ]);
  assert(
    JSON.stringify(lateChildFava) ===
      JSON.stringify([
        "E1001@5 Unopened account Assets:Broker:Roth is being closed",
      ]),
    `a fava plugin keeps the late child's located error (got ${JSON.stringify(lateChildFava)})`,
  );
  // w23/067: an interpolated posting and a balance before the open read
  // "never opened", where the engine dates a posting with an amount.
  const preOpen = await closeTree([
    "2020-01-01 open Assets:Live",
    "2020-01-01 open Equity:Init",
    '2019-01-01 * "early"',
    "  Assets:Live  1 USD",
    "  Equity:Init",
    "2019-06-01 balance Assets:Live 1 USD",
    '2020-02-01 * "unknown"',
    "  Assets:Nope  1 USD",
    "  Equity:Init",
  ]);
  assert(
    JSON.stringify([...preOpen].sort()) ===
      JSON.stringify([
        "E1001@3 Account Assets:Live used on 2019-01-01 but not opened until 2020-01-01",
        "E1001@3 Account Equity:Init used on 2019-01-01 but not opened until 2020-01-01",
        "E1001@6 Account Assets:Live used on 2019-06-01 but not opened until 2020-01-01",
        "E1001@7 Account Assets:Nope was never opened",
      ]),
    `a use before the open names the open date (got ${JSON.stringify(preOpen)})`,
  );
  // And close_tree's place in the plugin order holds on that stream too.
  const orderedFava = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    'plugin "beancount.plugins.auto_accounts"',
    'plugin "fava.plugins.tag_discovered_documents"',
    ...buyThenClose,
    ...lateBuy,
  ]);
  assert(
    orderedFava.length === 0,
    `close_tree before auto_accounts closes no child with a fava plugin (got ${JSON.stringify(orderedFava)})`,
  );
  // The posting adds no error of its own, so a save of it is not refused.
  const beforePosting = await closeTree([
    'plugin "beancount.plugins.close_tree"',
    "2024-01-01 open Assets:Broker",
    "2024-01-01 open Assets:Cash",
    "2024-04-01 close Assets:Broker",
    "2025-01-01 open Assets:Broker:Roth",
  ]);
  assert(
    JSON.stringify(beforePosting) === JSON.stringify(lateChild2),
    `the posting to the late child adds no error (got ${JSON.stringify(beforePosting)} then ${JSON.stringify(lateChild2)})`,
  );
  // w21/739: nounused and check_commodity came back as warnings, which the
  // server drops, and the engine's pedantic ran no nounused.
  for (const plugin of ["nounused", "check_commodity", "pedantic"]) {
    const strict = (
      await parseLedgerFiles(
        {
          "main.beancount": [
            `plugin "beancount.plugins.${plugin}"`,
            "2024-01-01 open Assets:Cash USD",
            "2024-01-01 open Assets:Unused USD",
            "2024-01-01 open Equity:Opening USD",
            '2024-01-02 * "Open"',
            "  Assets:Cash  10 USD",
            "  Equity:Opening",
          ].join("\n"),
        },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors
      .map((e) => `${e.severity} ${e.line} ${e.message}`)
      .sort();
    const expected = {
      nounused: ["error 3 Unused account 'Assets:Unused'"],
      check_commodity: [
        "error null Missing Commodity directive for 'USD' in 'Assets:Cash'",
      ],
      pedantic: [
        "error 3 Unused account 'Assets:Unused'",
        "error null Missing Commodity directive for 'USD' in 'Assets:Cash'",
      ],
    }[plugin]!;
    assert(
      JSON.stringify(strict) === JSON.stringify(expected.sort()),
      `${plugin} reports what bean-check does (got ${JSON.stringify(strict)})`,
    );
  }
  // w21/740: leafonly, noduplicates and coherent_cost errors had no file or
  // line (coherent_cost none at all), and leafonly came once per posting.
  const placedErrors = (
    await parseLedgerFiles(
      {
        "main.beancount": [
          'plugin "beancount.plugins.leafonly"',
          'plugin "beancount.plugins.noduplicates"',
          'plugin "beancount.plugins.coherent_cost"',
          "2024-01-01 open Assets:Cash",
          "2024-01-01 open Assets:Cash:Sub",
          "2024-01-01 open Assets:Broker",
          "2024-01-01 open Equity:Opening",
          '2024-01-02 * "Parent posting"',
          "  Assets:Cash  10 USD",
          "  Assets:Cash  5 USD",
          "  Assets:Cash:Sub  5 USD",
          "  Equity:Opening  -20 USD",
          '2024-01-03 * "Shop" "Dup"',
          "  Assets:Cash:Sub  1 USD",
          "  Equity:Opening  -1 USD",
          '2024-01-03 * "Shop" "Dup"',
          "  Assets:Cash:Sub  1 USD",
          "  Equity:Opening  -1 USD",
          '2024-01-04 * "Buy at cost"',
          "  Assets:Broker  1 VTI {100 USD}",
          "  Equity:Opening",
          '2024-01-05 * "Gift no cost"',
          "  Assets:Broker  1 VTI",
          "  Equity:Opening  -1 VTI",
        ].join("\n"),
      },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors
    .map((e) => `${e.line} ${e.message}`)
    .sort();
  assert(
    JSON.stringify(placedErrors) ===
      JSON.stringify(
        [
          "4 Non-leaf account 'Assets:Cash' has postings on it",
          '16 Duplicate transaction: 2024-01-03 "Dup"',
          "22 Currency 'VTI' is used both with and without cost",
        ].sort(),
      ),
    `built-in plugins' errors land on bean-check's lines (got ${JSON.stringify(placedErrors)})`,
  );
  // w21/754: unique_prices counted implicit_prices' prices whatever the order,
  // so a buy beside a written price was refused under pedantic.
  for (const [first, second, refused] of [
    ["pedantic", "implicit_prices", false],
    ["unique_prices", "implicit_prices", false],
    ["implicit_prices", "unique_prices", true],
  ] as const) {
    const ordered = (
      await parseLedgerFiles(
        {
          "main.beancount": [
            `plugin "beancount.plugins.${first}"`,
            `plugin "beancount.plugins.${second}"`,
            "2024-01-01 commodity USD",
            "2024-01-01 commodity QAVTI",
            "2024-01-01 open Assets:Broker QAVTI",
            "2024-01-01 open Assets:Cash USD",
            "2026-10-20 price QAVTI 101.00 USD",
            '2026-10-20 * "Buy"',
            "  Assets:Broker  1 QAVTI {100.00 USD}",
            "  Assets:Cash  -100.00 USD",
          ].join("\n"),
        },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors.map((e) => `${e.line} ${e.message}`);
    assert(
      JSON.stringify(ordered) ===
        JSON.stringify(refused ? ["7 Disagreeing price entries"] : []),
      `${first} then ${second} matches bean-check (got ${JSON.stringify(ordered)})`,
    );
  }
  // w21/757: nounused counted close_tree's closes as uses whatever the order.
  for (const [first, second, unused] of [
    ["nounused", "close_tree", true],
    ["close_tree", "nounused", false],
  ] as const) {
    const idle = (
      await parseLedgerFiles(
        {
          "main.beancount": [
            `plugin "beancount.plugins.${first}"`,
            `plugin "beancount.plugins.${second}"`,
            "2024-01-01 open Assets:Broker",
            "2024-01-01 open Assets:Broker:Idle",
            "2024-01-01 open Assets:Cash",
            '2024-01-02 * "Move"',
            "  Assets:Broker  1 USD",
            "  Assets:Cash",
            "2024-04-01 close Assets:Broker",
          ].join("\n"),
        },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors
      .filter((e) => e.message.startsWith("Unused account"))
      .map((e) => `${e.line} ${e.message}`);
    assert(
      JSON.stringify(idle) ===
        JSON.stringify(
          unused ? ["4 Unused account 'Assets:Broker:Idle'"] : [],
        ),
      `${first} then ${second} matches bean-check (got ${JSON.stringify(idle)})`,
    );
  }
  // w21/772: a missing file included twice was listed twice at the first
  // include, and a file the ledger does not read could take the blame.
  const missingTwice = (
    await parseLedgerFiles(
      {
        "archive/old.bean": 'include "../qa-missing.bean"\n',
        "main.beancount":
          'include "qa-missing.bean"\ninclude "sub.beancount"\n',
        "sub.beancount":
          '2020-01-01 open Assets:Cash\ninclude "qa-missing.bean"\n',
      },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors
    .filter((e) => e.message.startsWith("Included file not found"))
    .map((e) => `${e.file}:${e.line}`)
    .sort();
  assert(
    JSON.stringify(missingTwice) ===
      JSON.stringify(["main.beancount:1", "sub.beancount:2"]),
    `each include of a missing file gets its own error (got ${JSON.stringify(missingTwice)})`,
  );
  // w21/773: other include and plugin errors had no file or line.
  for (const [name, files, expected] of [
    [
      "an unmatched glob",
      { "main.beancount": 'include "qa20261020/*.bean"\n' },
      "main.beancount:1",
    ],
    [
      "a file included twice",
      {
        "main.beancount": 'include "sub.beancount"\ninclude "sub.beancount"\n',
        "sub.beancount": "2020-01-01 open Assets:Cash\n",
      },
      "main.beancount:2",
    ],
    [
      "a Python plugin",
      { "main.beancount": 'plugin "my_plugins.custom"\n' },
      "main.beancount:1",
    ],
  ] as const) {
    const placed = (
      await parseLedgerFiles(files, "main.beancount", { today: "2099-01-01" })
    ).errors.map((e) => `${e.file}:${e.line}`);
    assert(
      placed.includes(expected),
      `${name} is placed at ${expected} (got ${JSON.stringify(placed)})`,
    );
  }
  // w21/733: a posting flag was read as the sale's account.
  const flagged = (
    await parseLedgerFiles(
      {
        "main.beancount": averageSource("AVERAGE")
          .replace('2024-06-01 * "Sell"', '2024-06-01 * "Vanguard" "Rebalance"')
          .replace("  Assets:Broker  -10", "  ! Assets:Broker  -10")
          .concat('\n2024-06-01 * "Vanguard" "Rebalance"\n  Assets:Cash  0 USD'),
      },
      "main.beancount",
      { today: "2099-01-01" },
    )
  ).errors.find((e) => e.message.startsWith("AVERAGE"));
  assert(
    flagged?.file === "main.beancount" && flagged.line === 10,
    `the AVERAGE error stays on a flagged sale (got ${flagged?.file}:${flagged?.line})`,
  );
  assert(
    (
      await parseLedgerFiles(
        { "main.beancount": averageSource("FIFO") },
        "main.beancount",
        { today: "2099-01-01" },
      )
    ).errors.length === 0,
    "the same sale from a FIFO position books cleanly",
  );

  const firstElidedAmortizeSource = [
    'plugin "fava.plugins.amortize_over"',
    "2017-01-01 open Assets:Prepaid-Expenses",
    "2017-01-01 open Expenses:Insurance:Auto",
    '2017-06-01 * "Amortize with second-leg amount"',
    "  amortize_months: 3.00",
    "  Assets:Prepaid-Expenses",
    "  Expenses:Insurance:Auto  600.00 USD",
  ].join("\n");
  const firstElidedAmortize = await parseLedgerFiles(
    { "main.beancount": firstElidedAmortizeSource },
    "main.beancount",
    { today: "2099-01-01" },
  );
  const firstElidedTransactions = firstElidedAmortize.directives.filter(
    (directive) => directive.type === "transaction",
  );
  assert(
    firstElidedAmortize.valid && firstElidedTransactions.length === 3,
    "amortize_over derives an elided first leg and accepts integral decimals",
  );
  assert(
    firstElidedTransactions.every(
      (directive) =>
        directive.type === "transaction" &&
        directive.postings[0].units?.number === "-200.00" &&
        directive.postings[1].units?.number === "200.00",
    ),
    "amortize_over keeps both derived legs balanced",
  );

  const failingAmortize = await parseLedgerFiles(
    {
      "main.beancount": amortizeSource.replace(
        "-200.00 USD",
        "-999.00 USD",
      ),
    },
    "main.beancount",
    { today: "2099-01-01" },
  );
  const postPluginValidationError = failingAmortize.errors.find(
    (error) => error.phase === "validate" && error.severity === "error",
  );
  assert(
    postPluginValidationError !== undefined &&
      postPluginValidationError.file !== "__plugin_transformed__.bean",
    "post-plugin validation never exposes a phantom materialized filename",
  );

  // BQL path parity: querying the SAME fava-plugin ledger must run over the
  // materialized post-plugin stream (raw parse would E8005 and a merely stripped
  // stream would expose only the original unsplit transaction).
  const amortizeQuery = await queryLedgerFilesResult(
    { "main.beancount": amortizeSource },
    "main.beancount",
    "SELECT narration WHERE account ~ 'Expenses'",
  );
  assert(
    !amortizeQuery.errors.some((e) => e.severity === "error"),
    "BQL over a fava-plugin ledger sanitizes the source (no E8005 on the query path)",
  );
  const queriedNarrations = new Set(
    amortizeQuery.rows.map((row) => String(row[0])),
  );
  assert(
    queriedNarrations.size === 3 &&
      queriedNarrations.has("Amortize car insurance (1/3)") &&
      queriedNarrations.has("Amortize car insurance (3/3)"),
    `BQL observes all 3 amortized transactions (got ${queriedNarrations.size})`,
  );

  // forecast parity: keep the existing `fava.plugins.forecast` declaration and
  // reproduce the old Fava/dateutil month-end behavior. Rustledger's native
  // forecast clamps Jan 31 to Feb 28 then Mar 28, so this fixture deliberately
  // distinguishes the compatibility port (Jan/Mar/May 31).
  const forecastSource = [
    'plugin "fava.plugins.forecast"',
    "2010-01-01 open Assets:Checking USD",
    "2010-01-01 open Expenses:Electricity USD",
    '2014-01-31 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"',
    "  Expenses:Electricity   50.10 USD",
    "  Assets:Checking       -50.10 USD",
    "2014-06-01 balance Assets:Checking -150.30 USD",
  ].join("\n");
  const forecastSnapshot = await parseLedgerFiles(
    { "main.beancount": forecastSource },
    "main.beancount",
  );
  const forecastTransactions = forecastSnapshot.directives.filter(
    (directive) => directive.type === "transaction",
  );
  assert(forecastSnapshot.valid, "fava forecast ledger is valid");
  assert(
    !forecastSnapshot.errors.some(
      (error) => error.code === "TS_PLUGIN_SKIPPED",
    ),
    "fava forecast is handled instead of skipped",
  );
  assert(
    JSON.stringify(forecastTransactions.map((directive) => directive.date)) ===
      JSON.stringify(["2014-01-31", "2014-03-31", "2014-05-31"]),
    "forecast preserves Fava month-end recurrence semantics",
  );
  assert(
    forecastTransactions.every(
      (directive) => directive.narration === "Electricity bill",
    ),
    "forecast strips the recurrence marker from generated narrations",
  );
  const forecastQuery = await queryLedgerFilesResult(
    { "main.beancount": forecastSource },
    "main.beancount",
    "SELECT date, narration WHERE account ~ 'Expenses'",
  );
  assert(
    forecastQuery.rows.length === 3 &&
      forecastQuery.rows.map((row) => String(row[0])).join(",") ===
        "2014-01-31,2014-03-31,2014-05-31",
    `BQL observes all forecast transactions (got ${forecastQuery.rows.length})`,
  );

  const invalidForecast = await parseLedgerFiles(
    {
      "main.beancount": forecastSource.replace(
        "[MONTHLY REPEAT 3 TIMES]",
        "[MONTHLY UNTIL 2014-99-99]",
      ),
    },
    "main.beancount",
  );
  assert(
    !invalidForecast.valid &&
      invalidForecast.errors.some(
        (error) => error.code === "TS_FORECAST_TEMPLATE_FAILED",
      ),
    "invalid forecast input fails the ledger closed",
  );

  // link_documents path parity: path-valued metadata must resolve relative to
  // the referencing entry's source file, not broaden to every same-basename,
  // same-account Document in the ledger.
  const linkedDocumentsSnapshot = await parseLedgerFiles(
    {
      "main.beancount": [
        'plugin "fava.plugins.link_documents"',
        'include "a/documents.beancount"',
        'include "b/documents.beancount"',
        'include "a/transactions.beancount"',
        "2020-01-01 open Assets:Bank USD",
      ].join("\n"),
      "a/documents.beancount":
        '2020-01-05 document Assets:Bank "receipts/receipt.pdf"',
      "b/documents.beancount":
        '2020-01-05 document Assets:Bank "receipts/receipt.pdf"',
      "a/transactions.beancount": [
        '2020-01-10 * "payment"',
        '  document: "receipts/receipt.pdf"',
        "  Assets:Bank  0 USD",
      ].join("\n"),
    },
    "main.beancount",
    {
      repoPaths: ["a/receipts/receipt.pdf", "b/receipts/receipt.pdf"],
    },
  );
  const linkedDocuments = linkedDocumentsSnapshot.directives.filter(
    (directive) =>
      directive.type === "document" &&
      (directive.links ?? []).includes("dok-2020-01-10"),
  );
  assert(
    linkedDocuments.length === 1,
    `link_documents resolves one source-relative document (got ${linkedDocuments.length})`,
  );

  // Invalid BQL does NOT throw — rustledger reports it in QueryResult.errors
  // (the shell service maps these to BadUserInputError instead of returning an
  // empty successful table).
  const badQuery = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "THIS IS NOT BQL AT ALL",
  );
  assert(
    badQuery.errors.some((e) => e.severity === "error"),
    "invalid BQL surfaces a severity-error entry in QueryResult.errors",
  );
  assert(badQuery.rows.length === 0, "invalid BQL returns no rows");

  const bigIntQuery = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT 9007199254740993 AS value LIMIT 1",
  );
  assert(
    bigIntQuery.errors.some((error) => error.severity === "error"),
    "out-of-range integer query surfaces a severity-error entry in QueryResult.errors",
  );
  assert(
    bigIntQuery.errors.some((error) =>
      error.message.includes("can't be represented as a JavaScript number"),
    ),
    "out-of-range integer preserves rustledger's conversion diagnostic",
  );
  assert(bigIntQuery.rows.length === 0, "out-of-range integer returns no rows");

  const decimalControl = await queryLedgerFilesResult(
    FILES,
    "main.beancount",
    "SELECT 9007199254740993.0 AS value LIMIT 1",
  );
  assert(
    decimalControl.errors.length === 0,
    "the same numeric value as a decimal literal succeeds",
  );
  assert(
    String(decimalControl.rows[0]?.[0]).includes("9007199254740993"),
    "decimal literal preserves exact digits",
  );

  // Parsed-snapshot cache: same content + same effective today → the SAME
  // frozen snapshot object (no re-parse); a different today → a distinct entry.
  const cacheFixture = {
    "cache.beancount": [
      "2024-01-01 open Assets:Cash USD",
      "2024-01-01 open Income:Salary USD",
      '2024-02-01 * "Pay" "Salary"',
      "  Assets:Cash  100.00 USD",
      "  Income:Salary",
    ].join("\n"),
  };
  const [snapA, snapB] = await Promise.all([
    parseLedgerFiles(cacheFixture, "cache.beancount", { today: "2026-08-01" }),
    parseLedgerFiles(cacheFixture, "cache.beancount", { today: "2026-08-01" }),
  ]);
  assert(
    snapA === snapB,
    "concurrent identical parses coalesce to one shared snapshot",
  );
  const snapC = await parseLedgerFiles(cacheFixture, "cache.beancount", {
    today: "2026-08-01",
  });
  assert(snapC === snapA, "a repeat parse is a cache hit (same object)");
  const snapD = await parseLedgerFiles(cacheFixture, "cache.beancount", {
    today: "2026-08-02",
  });
  assert(
    snapD !== snapA,
    "a different effective today is a distinct cache entry",
  );
  assert(
    Object.isFrozen(snapA) && Object.isFrozen(snapA.directives),
    "cached snapshots are frozen (shared across requests)",
  );

  const unsupportedSnap = await parseLedgerFiles(
    {
      "main.beancount": [
        'plugin "fava.plugins.some_unsupported"',
        "2017-01-01 open Assets:Cash",
      ].join("\n"),
    },
    "main.beancount",
  );
  assert(
    unsupportedSnap.valid,
    "ledger with an unsupported fava plugin is still valid (not E8005)",
  );
  assert(
    unsupportedSnap.errors.some((e) => e.code === "TS_PLUGIN_SKIPPED"),
    "unsupported fava plugin surfaces a friendly TS_PLUGIN_SKIPPED warning",
  );

  // Document existence: the WASM has no filesystem, so its E8001/E7006 checks
  // always fail. `parseLedgerFiles` reconciles them against the real repo file
  // inventory (`repoPaths`).
  const docSource = [
    "2020-01-01 open Assets:Bank:Checking",
    '2020-01-05 document Assets:Bank:Checking "documents/2020-01-statement.pdf" #statement ^jan',
  ].join("\n");
  // File is present in the repo inventory → valid, no E8001.
  const docOk = await parseLedgerFiles(
    { "main.beancount": docSource },
    "main.beancount",
    { repoPaths: ["main.beancount", "documents/2020-01-statement.pdf"] },
  );
  assert(
    docOk.valid,
    "document referencing a file that exists in the repo is valid",
  );
  assert(
    !docOk.errors.some((e) => e.code === "E8001"),
    "no E8001 for a document that exists in the repo inventory",
  );
  const parsedDocument = docOk.directives.find(
    (directive) => directive.type === "document",
  );
  assert(
    parsedDocument?.type === "document" &&
      parsedDocument.tags?.includes("statement") === true &&
      parsedDocument.links?.includes("jan") === true,
    "document tags/links omitted by the WASM are restored from source",
  );
  // File genuinely missing from the repo inventory → real E8001, invalid.
  const docMissing = await parseLedgerFiles(
    { "main.beancount": docSource },
    "main.beancount",
    { repoPaths: ["main.beancount"] },
  );
  assert(
    docMissing.errors.some((e) => e.code === "E8001"),
    "a genuinely-missing document still surfaces a real E8001 error",
  );
  assert(
    !docMissing.valid,
    "a ledger referencing a missing document is invalid",
  );

  // `option "documents"` root (E7006): @rustledger/wasm ≥0.24 no longer emits the
  // always-failing filesystem check, so reconcileDocumentErrors has nothing to
  // keep for a missing root. Explicit `document` E8001 reconciliation above is
  // unchanged. When a root *is* present in the inventory the ledger stays valid.
  const optDocsSource = [
    'option "documents" "docs"',
    "2020-01-01 open Assets:Cash",
  ].join("\n");
  const rootExists = await parseLedgerFiles(
    { "main.beancount": optDocsSource },
    "main.beancount",
    { repoPaths: ["main.beancount", "docs/Assets/2020-01-01 note.pdf"] },
  );
  assert(
    rootExists.valid,
    'option "documents" with an existing root directory is valid',
  );
  const rootMissing = await parseLedgerFiles(
    { "main.beancount": optDocsSource },
    "main.beancount",
    { repoPaths: ["main.beancount"] },
  );
  assert(
    rootMissing.valid &&
      !rootMissing.errors.some((e) => e.message.includes("[E7006]")),
    'option "documents" with a missing root stays valid under wasm ≥0.24 (no E7006)',
  );

  // #4: beancount reads option/plugin ONLY from the entry point; the WASM applies
  // them from INCLUDED files too. An included `option "name_assets" "Actif"`
  // renames the Assets root, so the entry-point's `Assets:Cash` open fails
  // validation. `parseLedgerFiles` neutralizes included option/plugin directives
  // (matching beancount, which ignores them), so a valid ledger stays valid.
  const includedOptionFiles = {
    "main.beancount": 'include "opts.beancount"\n2024-01-01 open Assets:Cash',
    "opts.beancount": 'option "name_assets" "Actif"',
  };
  // Raw WASM (no neutralization) wrongly applies the included option → invalid.
  const rawIncluded = await rawValidate(includedOptionFiles, "main.beancount");
  assert(
    !rawIncluded.valid,
    "raw WASM wrongly applies an included option (renames Assets root → invalid)",
  );
  // parseLedgerFiles neutralizes it → valid, matching beancount's ignore.
  const scopedIncluded = await parseLedgerFiles(
    includedOptionFiles,
    "main.beancount",
  );
  assert(
    scopedIncluded.valid,
    "included option/plugin is neutralized so a valid ledger stays valid (#4)",
  );

  await verifyMultilineSources();
  await verifyDocumentSourcePaths();
  await verifyDocumentDiscovery();
  await verifyWrittenReservedFlags();

  // w23/011: an undecodable source the entry point does not reach changes
  // nothing; one it includes is reported by path, and the rest still parses.
  const strayExport = await parseLedgerFiles(
    {
      "main.bean": "2024-01-01 open Assets:Cash USD\n",
      "export.bean": UNDECODABLE_SOURCE,
    },
    "main.bean",
  );
  assert(
    strayExport.valid && strayExport.directiveCount === 1,
    "an undecodable file nothing includes leaves the ledger valid (w23/011)",
  );
  const includedExport = await parseLedgerFiles(
    {
      "main.bean":
        'include "export.bean"\n2024-01-01 open Assets:Cash USD\n',
      "export.bean": UNDECODABLE_SOURCE,
    },
    "main.bean",
  );
  assert(
    !includedExport.valid &&
      includedExport.directiveCount === 1 &&
      includedExport.errors.length === 1 &&
      includedExport.errors[0]?.code === "INVALID_UTF8" &&
      includedExport.errors[0]?.file === "export.bean",
    "an included undecodable file is the one error, naming it (w23/011)",
  );

  // w23/012: rustledger 0.24.0 collapses cost(sum(position)) over several
  // currencies into one mislabelled Amount; the query path refuses that. When
  // a bump fixes the engine, the first check fails and the guard can go.
  const costFiles: FileMap = {
    "main.bean": [
      "2024-01-01 open Assets:Hours",
      "2024-01-01 open Assets:Broker",
      "2024-01-01 open Assets:Cash",
      "2024-01-01 open Equity:Opening",
      '2024-01-02 * "hours"',
      "  Assets:Hours  -13 VACHR",
      "  Equity:Opening",
      '2024-01-03 * "buy"',
      "  Assets:Broker  17 GLD {268.22 USD}",
      "  Assets:Cash",
      "",
    ].join("\n"),
  };
  const rawCost = await withLedger(costFiles, "main.bean", (ledger) =>
    ledger.query(
      "SELECT cost(sum(position)) WHERE account ~ '^Assets:(Hours|Broker)'",
    ),
  );
  assert(
    JSON.stringify(rawCost.rows) ===
      JSON.stringify([[{ number: "4546.74", currency: "VACHR" }]]),
    "raw engine still collapses a multi-currency cost(sum(position)) (w23/012)",
  );
  const guardedCost = await queryLedgerFilesResult(
    costFiles,
    "main.bean",
    "SELECT cost(sum(position)) WHERE account ~ '^Assets:(Hours|Broker)'",
  );
  assert(
    guardedCost.rows.length === 0 &&
      guardedCost.errors[0]?.message.includes("sum(cost(position))") === true,
    "the query path refuses the collapsed cost and names sum(cost(position))",
  );
  const singleCost = await queryLedgerFilesResult(
    costFiles,
    "main.bean",
    "SELECT cost(sum(position)) WHERE account ~ '^Assets:Broker'",
  );
  assert(
    JSON.stringify(singleCost.rows) ===
      JSON.stringify([[{ number: "4559.74", currency: "USD" }]]),
    "a single-currency cost(sum(position)) is still answered",
  );

  // w23/015: a position cell names its lot the way Beancount writes it.
  const lotQuery = await queryLedgerFilesResult(
    {
      "main.bean": [
        "2015-01-01 open Assets:Broker",
        "2015-01-01 open Assets:Cash",
        '2015-09-15 * "buy"',
        '  Assets:Broker  5 GLD {197.06 USD, "lot-a"}',
        "  Assets:Cash",
        "",
      ].join("\n"),
    },
    "main.bean",
    "SELECT position WHERE account ~ 'Broker'",
  );
  assert(
    formatCellValue(lotQuery.rows[0]?.[0] as CellValue) ===
      '5 GLD {197.06 USD, 2015-09-15, "lot-a"}',
    "a position cell keeps its lot date and label (w23/015)",
  );

  // w23/016: documented beanquery forms this engine refuses, and the spellings
  // the refusals name instead. When a bump accepts the upstream form, the
  // first check of a pair fails and its ENGINE_GAPS entry can go.
  const gapFiles: FileMap = {
    "main.bean": [
      "2024-01-01 open Assets:Cash",
      "2024-01-01 open Income:Salary",
      '2024-01-02 * "pay"',
      "  Assets:Cash  100 USD",
      "  Income:Salary",
      "",
    ].join("\n"),
  };
  const gap = (query: string) =>
    queryLedgerFilesResult(gapFiles, "main.bean", query);
  const negInventory = await gap(
    "SELECT account, neg(sum(position)) WHERE account ~ '^Income' GROUP BY account",
  );
  assert(
    negInventory.errors[0]?.message.includes("NEG expects a number or amount") ===
      true,
    "engine still refuses neg(inventory) (w23/016)",
  );
  const negUnits = await gap(
    "SELECT account, sum(neg(units(position))) WHERE account ~ '^Income' GROUP BY account",
  );
  assert(
    negUnits.errors.length === 0 && negUnits.rows.length === 1,
    "sum(neg(units(position))) runs, as the neg refusal says",
  );
  const negNumber = await gap(
    "SELECT currency, neg(sum(number)) WHERE account ~ '^Income' GROUP BY currency",
  );
  assert(
    negNumber.errors.length === 0 &&
      JSON.stringify(negNumber.rows) === JSON.stringify([["USD", "100"]]),
    "neg(sum(number)) grouped by currency runs, as the neg refusal says",
  );
  const filterPosition = await gap(
    "SELECT account, sum(filter_currency(position, 'USD')) GROUP BY account",
  );
  assert(
    filterPosition.errors[0]?.message.includes(
      "FILTER_CURRENCY expects (inventory, string)",
    ) === true,
    "engine still refuses filter_currency(position, ...) (w23/016)",
  );
  const filterInventory = await gap(
    "SELECT account, filter_currency(sum(position), 'USD') GROUP BY account",
  );
  assert(
    filterInventory.errors.length === 0 && filterInventory.rows.length > 0,
    "filter_currency(sum(position), 'USD') runs, as the refusal says",
  );

  // w23/020: BALANCES/JOURNAL … AT value come back in units, and a BALANCES
  // FROM window that sells an earlier lot fails. The first check of each
  // pair fails once an engine bump fixes it, and its guard or hint can go.
  const lotFiles: FileMap = {
    "main.bean": [
      "2020-01-01 open Assets:Broker",
      "2020-01-01 open Assets:Cash USD",
      "2020-01-01 open Income:Gains USD",
      '2020-01-02 * "buy lot1"',
      "  Assets:Broker  9 VHT {113.91 USD, 2020-01-02}",
      "  Assets:Cash",
      '2021-03-10 * "sell lot1"',
      "  Assets:Broker  -9 VHT {113.91 USD, 2020-01-02} @ 120.00 USD",
      "  Assets:Cash   1080.00 USD",
      "  Income:Gains",
      '2021-03-11 * "buy lot2"',
      "  Assets:Broker  4 VHT {118.03 USD}",
      "  Assets:Cash",
      "2021-03-12 price VHT 120.00 USD",
      "",
    ].join("\n"),
  };
  const rawAtValue = await withLedger(lotFiles, "main.bean", (ledger) =>
    ledger.query("BALANCES AT value WHERE account ~ 'Broker'"),
  );
  assert(
    JSON.stringify(rawAtValue.rows).includes('"currency":"VHT"'),
    "raw engine still answers BALANCES AT value in units (w23/020)",
  );
  const guardedAtValue = await queryLedgerFilesResult(
    lotFiles,
    "main.bean",
    "BALANCES AT value WHERE account ~ 'Broker'",
  );
  assert(
    guardedAtValue.rows.length === 0 &&
      guardedAtValue.errors[0]?.message.includes("value(sum(position))") ===
        true,
    "the query path refuses BALANCES AT value and names value(sum(position))",
  );
  const valued = await queryLedgerFilesResult(
    lotFiles,
    "main.bean",
    "SELECT account, value(sum(position)) WHERE account ~ 'Broker' GROUP BY account",
  );
  assert(
    JSON.stringify(valued.rows).includes('"number":"480.00","currency":"USD"'),
    "value(sum(position)) values the holding at market, as the refusal says",
  );
  const windowed = await queryLedgerFilesResult(
    lotFiles,
    "main.bean",
    "BALANCES FROM year = 2021",
  );
  assert(
    windowed.errors[0]?.message.includes("No matching lot for VHT") === true,
    "engine still fails BALANCES FROM a window that sells an earlier lot (w23/020)",
  );
  const windowSum = await queryLedgerFilesResult(
    lotFiles,
    "main.bean",
    "SELECT account, sum(position) FROM year = 2021 GROUP BY account",
  );
  assert(
    windowSum.errors.length === 0 && windowSum.rows.length > 0,
    "the windowed sum the lot-error hint names runs",
  );

  // w21/648: the entries precheck balances a transaction as the engine does,
  // on the cases where Beancount and rustledger agree.
  const toleranceCases: Array<[string, string[]]> = [
    ['option "inferred_tolerance_default" "USD:0.01"', ["-10.00", "3.33", "3.33", "3.33"]],
    ["", ["-10.00", "3.33", "3.33", "3.33"]],
    ["", ["10", "-9.6"]],
    ["", ["10", "-10.004"]],
    ["", ["100.0000", "-99.9960"]],
    ["", ["10.000", "-10.0004"]],
    ["", ["10.00", "-9.995"]],
    ["", ["10.00", "-9.9949"]],
    ['option "inferred_tolerance_default" "EUR:0.5"', ["10", "-9.6"]],
    ['option "inferred_tolerance_default" "*:1"', ["10", "-9"]],
    ['option "inferred_tolerance_default" "0.01"', ["-10.00", "3.33", "3.33", "3.33"]],
  ];
  // w21/647: and weighs a priced posting (`EUR @ USD`) the engine's way.
  const pricedCases: Array<[string, string, string]> = [
    ["-110.00", "100.00", "1.10"],
    ["-110.00", "100.00", "1.11"],
    ["-33.33", "10", "3.3333"],
    ["-33.33", "10", "3.334"],
    ["-110", "100", "1.1"],
  ];
  for (const [cash, euros, rate] of pricedCases) {
    const priced = await parseLedgerFiles(
      {
        "main.bean": `2024-01-01 open Assets:Cash\n2024-01-01 open Assets:Bank\n2024-01-02 * "t"\n  Assets:Cash ${cash} USD\n  Assets:Bank ${euros} EUR @ ${rate} USD\n`,
      },
      "main.bean",
    );
    const engineBalances = !priced.errors.some((error) =>
      error.message.startsWith("Transaction does not balance"),
    );
    const precheck = checkTransactionBalance([
      { account: "Assets:Cash", units: { number: cash, currency: "USD" } },
      {
        account: "Assets:Bank",
        units: { number: euros, currency: "EUR" },
        price: { number: rate, currency: "USD" },
      },
    ]).ok;
    assert(
      precheck === engineBalances,
      `the precheck ${precheck ? "accepts" : "refuses"} ${cash} USD / ${euros} EUR @ ${rate} USD, as the engine does`,
    );
  }
  for (const [option, numbers] of toleranceCases) {
    const accounts = numbers.map((_number, index) => `Assets:A${index}`);
    const balanced = await parseLedgerFiles(
      {
        "main.bean": `${option}\n${accounts.map((account) => `2024-01-01 open ${account}\n`).join("")}2024-01-02 * "t"\n${numbers.map((number, index) => `  ${accounts[index]} ${number} USD\n`).join("")}`,
      },
      "main.bean",
    );
    const engineBalances = !balanced.errors.some((error) =>
      error.message.startsWith("Transaction does not balance"),
    );
    const precheck = checkTransactionBalance(
      numbers.map((number, index) => ({
        account: accounts[index]!,
        units: { number, currency: "USD" },
      })),
      scanInferredToleranceDefaults([option]),
    ).ok;
    assert(
      precheck === engineBalances,
      `the precheck ${precheck ? "accepts" : "refuses"} ${numbers.join(" / ")} USD${option ? ` under ${option.slice(36)}` : ""}, as the engine does`,
    );
  }

  // w21/653: the entry validator accepts a tag (or a flag) exactly when the
  // engine reads it back as written.
  const accepts = (item: Record<string, unknown>): boolean => {
    try {
      assertEntryTokens([{ type: "transaction", item }]);
      return true;
    } catch {
      return false;
    }
  };
  for (const tag of ["trip-2026", "inv/2026.03", "a_b", "café", "旅行"]) {
    const tagged = await parseLedgerFiles(
      {
        "main.bean": `2024-01-01 open Assets:Cash\n2024-01-01 open Equity:Open\n2024-01-02 * "t" #${tag}\n  Assets:Cash 1 USD\n  Equity:Open\n`,
      },
      "main.bean",
    );
    const read = tagged.directives.find(
      (directive) => directive.type === "transaction",
    );
    const intact =
      tagged.errors.length === 0 &&
      read?.type === "transaction" &&
      JSON.stringify(read.tags) === JSON.stringify([tag]);
    assert(
      accepts({ tags: [tag] }) === intact,
      `the validator ${intact ? "accepts" : "refuses"} tag #${tag}, as the engine reads it`,
    );
  }
  // Every flag the validator takes reads back on a transaction and a posting
  // (w21/650: a `%` posting was read as a comment and silently dropped).
  const unreadFlags: string[] = [];
  for (let code = 0x21; code <= 0x7e; code += 1) {
    const flag = String.fromCharCode(code);
    const asPosting = accepts({
      postings: [{ account: "Assets:Cash", flag }],
    });
    if (!asPosting && !accepts({ flag })) continue;
    const flagged = await parseLedgerFiles(
      {
        "main.bean": `2024-01-01 open Assets:Cash\n2024-01-01 open Equity:Open\n2024-01-02 ${flag} "t"\n  ${flag} Assets:Cash 1 USD\n  Equity:Open\n`,
      },
      "main.bean",
    );
    const read = flagged.directives.find(
      (directive) => directive.type === "transaction",
    );
    if (
      !(
        flagged.errors.length === 0 &&
        read?.type === "transaction" &&
        read.flag === flag &&
        read.postings.length === 2 &&
        read.postings[0]?.flag === flag
      )
    ) {
      unreadFlags.push(flag);
    }
  }
  assert(
    unreadFlags.length === 0,
    `the engine reads every flag the validator accepts, on a transaction and a posting${unreadFlags.length ? ` (not: ${unreadFlags.join(" ")})` : ""}`,
  );
  for (const flag of ["*", "!", "P", "A", "Z", "'X"]) {
    const flagged = await parseLedgerFiles(
      {
        "main.bean": `2024-01-01 open Assets:Cash\n2024-01-01 open Equity:Open\n2024-01-02 ${flag} "t"\n  Assets:Cash 1 USD\n  Equity:Open\n`,
      },
      "main.bean",
    );
    const read = flagged.errors.length === 0 &&
      flagged.directives.some(
        (directive) =>
          directive.type === "transaction" && directive.flag === flag,
      );
    assert(
      accepts({ flag }) === read,
      `the validator ${read ? "accepts" : "refuses"} flag ${flag}, as the engine reads it`,
    );
  }

  // w21/649: an account with a ZWNJ or ZWJ is accepted, and the engine reads it.
  for (const account of ["Assets:Bank:خانه\u200cها", "Assets:Bank:क्\u200dष"]) {
    const opened = await parseLedgerFiles(
      { "main.bean": `2024-01-01 open ${account}\n` },
      "main.bean",
    );
    assert(
      accepts({ postings: [{ account }] }) &&
        opened.errors.length === 0 &&
        opened.directives.some(
          (directive) =>
            directive.type === "open" && directive.account === account,
        ),
      `the validator accepts ${JSON.stringify(account)}, and the engine reads it`,
    );
  }

  // w21/651: a futures currency is accepted exactly when the engine reads it
  // as written (`/6E` is read as one sixth of `E`).
  for (const currency of ["/ESZ24", "/NQH21_QNEG21C13100", "/6E", "/6.3"]) {
    const futures = await parseLedgerFiles(
      {
        "main.bean": `2024-01-01 open Assets:Cash\n2024-01-01 open Equity:Open\n2024-01-02 * "t"\n  Assets:Cash 1 ${currency}\n  Equity:Open\n`,
      },
      "main.bean",
    );
    const read = futures.directives.find(
      (directive) => directive.type === "transaction",
    );
    const intact =
      futures.errors.length === 0 &&
      read?.type === "transaction" &&
      read.postings[0]?.units?.number === "1" &&
      read.postings[0]?.units?.currency === currency;
    assert(
      accepts({
        postings: [
          { account: "Assets:Cash", units: { number: "1", currency } },
        ],
      }) === intact,
      `the validator ${intact ? "accepts" : "refuses"} currency ${currency}, as the engine reads it`,
    );
  }

  // w21/654: the engine still opens a string at a `"` on an org heading or a
  // `#` line and loses every entry after it; the parse comments such lines.
  const headingFiles = {
    "main.bean": `2024-01-01 open Assets:Cash
2024-01-01 open Equity:Open
* Notes: 12" pizza budget
2024-01-02 * "after the heading"
  Assets:Cash 1 USD
  Equity:Open
# It's 5" wide
2024-01-03 note Assets:Cash "agenda:
* kept inside the string"
2024-01-04 balance Assets:Cash 1 USD
`,
  };
  const headingSnapshot = await parseLedgerFiles(headingFiles, "main.bean");
  assert(
    headingSnapshot.errors.length === 0 &&
      headingSnapshot.directives.some(
        (directive) =>
          directive.type === "transaction" &&
          directive.narration === "after the heading",
      ) &&
      headingSnapshot.directives.some(
        (directive) =>
          directive.type === "note" &&
          directive.comment === "agenda:\n* kept inside the string",
      ) &&
      headingSnapshot.directives.some(
        (directive) => directive.type === "balance",
      ),
    "an org heading or # line with a quote keeps every entry after it",
  );
  const headingCount = await queryLedgerFilesResult(
    headingFiles,
    "main.bean",
    "SELECT count(*)",
  );
  assert(
    JSON.stringify(headingCount.rows) === "[[2]]",
    "BQL counts the postings after a quoted heading",
  );

  // w21/655: the engine still drops a note's tags and links and pushtag on
  // notes and documents; the parse restores them, so the filters see them.
  const noteSnapshot = await parseLedgerFiles(
    {
      "main.bean": `2024-01-01 open Assets:Cash
pushtag #trip
2024-02-01 note Assets:Cash "dispute filed" #dispute ^case-42
2024-02-02 document Assets:Cash "r.pdf"
poptag #trip
2024-02-03 note Assets:Cash "after"
`,
      "r.pdf": "",
    },
    "main.bean",
    { repoPaths: ["main.bean", "r.pdf"] },
  );
  const tagged = (filter: string) =>
    filterDirectives(noteSnapshot.directives, { filter }).map(
      (directive) => directive.date,
    );
  deepStrictEqual(tagged("#dispute"), ["2024-02-01"]);
  deepStrictEqual(tagged("^case-42"), ["2024-02-01"]);
  deepStrictEqual(tagged("#trip"), ["2024-02-01", "2024-02-02"]);
  console.log("✓ a note's tags and links, and pushed tags, reach the filters");

  // w21/656: the engine still ignores raw mode, so the parse undoes its pad
  // and balance steps, and BQL (over the materialized stream) follows.
  const rawFiles = {
    "main.bean": `option "plugin_processing_mode" "raw"
2020-01-01 open Assets:Bank
2020-01-01 open Equity:Open
2020-01-01 pad Assets:Bank Equity:Open
2020-01-02 balance Assets:Bank 100 USD
2020-01-03 balance Assets:Bank 5 USD
`,
  };
  const rawSnapshot = await parseLedgerFiles(rawFiles, "main.bean");
  assert(
    rawSnapshot.errors.length === 0 &&
      !rawSnapshot.directives.some((directive) => directive.type === "transaction"),
    "raw plugin processing inserts no padding and checks no balance",
  );
  const rawBalances = await queryLedgerFilesResult(
    rawFiles,
    "main.bean",
    "SELECT account, sum(position) GROUP BY account",
  );
  assert(
    rawBalances.rows.length === 0,
    "BQL over a raw-mode ledger sums no padding",
  );

  console.log("\nAll rustledger engine checks passed.");
}

void main()
  .finally(closeRustledgerWorkerPool)
  .catch((error: unknown) => {
    console.error("verify-rustledger failed:", error);
    process.exitCode = 1;
  });
