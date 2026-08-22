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
import type { BeancountError, FileMap } from "@rustledger/wasm";
import {
  buildEntryIdMap,
  collectAttributes,
  closeRustledgerWorkerPool,
  countDirectives,
  createBookedBlockParser,
  entriesCountPerType,
  findEntrySlice,
  findEntrySliceWithFullLedger,
  formatSource,
  getDirectiveSourceId,
  getRustledgerVersion,
  hashEntry,
  parseLedgerFiles,
  queryLedgerFiles,
  queryLedgerFilesResult,
  withLedger,
} from "@/foundation/rustledger";
import {
  queryResultToShellResult,
  queryResultToText,
} from "@/features/ledger/service/ledger-shell-mappers";
import { accountHierarchy, buildPriceMap } from "@/foundation/rustledger";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
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

  const count = await countDirectives(
    "2024-01-01 open Assets:Cash USD\n2024-01-02 open Income:Z USD\n",
  );
  assert(
    count === 2,
    `countDirectives on a leaf file returns 2 (got ${count})`,
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

  // `option "documents"` root (E7006) is validated the same way: dropped only if
  // the directory actually exists in the repo; a missing root keeps the error.
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
    !rootMissing.valid,
    'option "documents" pointing at a nonexistent directory is invalid',
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

  console.log("\nAll rustledger engine checks passed.");
}

void main()
  .finally(closeRustledgerWorkerPool)
  .catch((error: unknown) => {
    console.error("verify-rustledger failed:", error);
    process.exitCode = 1;
  });
