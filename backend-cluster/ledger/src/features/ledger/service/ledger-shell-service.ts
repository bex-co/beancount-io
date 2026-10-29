import type { QueryResult } from "@rustledger/wasm";
import { parseLedgerId } from "@/shared/str";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import {
  queryLedgerFilesResult,
  type LoadedLedger,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import type { CacheHelper } from "@/shared/cache";
import { BadUserInputError } from "@/shared/errors";
import {
  queryResultToShellResult,
  queryResultToText,
} from "./ledger-shell-mappers";
import { stripBqlBlockComments } from "./bql-comments";
import { extractSelectAliases } from "./bql-select-aliases";
import { foldBqlColumnFrom } from "./bql-from-fold";
import { dropPostingsFromForWindows } from "./bql-from-windows";
import { rescueInnerTableFrom } from "./bql-from-inner-tables";
import { routeIntegerLiterals } from "./bql-int-literals";
import { unquoteBqlFromTables } from "./bql-from-quotes";
import { stripBqlStatementTerminator } from "./bql-terminator";
import { unquoteBqlAliases } from "./bql-alias-quotes";
import { rewriteBqlStringBetween } from "./bql-string-between";
import { foldBqlIdentifierCase } from "./bql-identifier-case";
import { foldBqlWhitespace } from "./bql-whitespace";

/**
 * The ONE BQL text pipeline — every shell mode normalizes through it, and
 * `verify:rustledger` pins it against the live engine, so the order exists in
 * exactly one place. Whitespace first (every later stage — and the engine's
 * own ASCII-only tokenizer — sees plain gaps), then comments (a `;` or `FROM`
 * inside one is not syntax), then quoted aliases (`AS "p"` is `AS p`), then
 * identifier case (columns and aliases resolve exactly in the engine,
 * case-insensitively in stock), then string BETWEEN (the engine refuses it
 * where it accepts the ordering pair), then unquote (quoted names classify as their
 * bare selves), then the window rescue (a top-level window over `FROM
 * postings` drops to the bare form the engine numbers, before any stage reads
 * the FROM), then the terminator (a trailing `;` breaks bare-table
 * resolution), then the integer routing (dead-zone literals join the decimal
 * path and huge LIMITs cap before any stage reads magnitude), then the
 * inner-table rescue (a `)`-terminated bare table resolves column-first),
 * then the fold last (it must see the unterminated query to re-earn or wrap
 * the fold, and its own generated `)`-inners rely on the native fold).
 */
export function normalizeBqlQueryForEngine(query: string): string {
  return foldBqlColumnFrom(
    rescueInnerTableFrom(
      routeIntegerLiterals(
        stripBqlStatementTerminator(
          dropPostingsFromForWindows(
            unquoteBqlFromTables(
              rewriteBqlStringBetween(
                foldBqlIdentifierCase(
                  unquoteBqlAliases(
                    stripBqlBlockComments(foldBqlWhitespace(query)),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Compatibility DTO shared with existing dashboard/generated clients.
 * Rustledger 0.21 exposes BQL table results only, so `queryShell()` currently
 * returns the `table` arm; Fava-only interactive commands such as `.help` and
 * an empty `run` are rejected as unsupported input. Keep the text arm until a
 * coordinated GraphQL/dashboard contract migration removes it.
 */
export type ShellQueryResult = {
  resultType: "table" | "text";
  table?: {
    types: { name: string; dtype: string }[];
    rows: (string | number | boolean | Record<string, unknown>)[][];
    t?: string;
  };
  text?: {
    contents: string;
    t?: string;
  };
};

export type ShellTextResult = { text: string; rowCount: number };

interface ILedgerShellService {
  queryShell(params: {
    ledgerId: string;
    userId: string | undefined;
    query: string;
  }): Promise<ShellQueryResult>;

  queryShellText(params: {
    ledgerId: string;
    userId: string | undefined;
    query: string;
  }): Promise<ShellTextResult>;
}

/**
 * BQL query shell backed by the in-process rustledger WASM engine — replacing
 * the Python fava_api `shell.queryShell*` HTTP calls. Loads the ledger's
 * `.bean` files straight from Gitea into a FileMap and runs the query
 * in-process. Access control is preserved: `getPublicApiClient(ledgerId,
 * userId)` resolves the same public/private access the fava path did.
 */
export class LedgerShellService implements ILedgerShellService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  private async loadLedger(
    ledgerId: string,
    userId: string | undefined,
  ): Promise<LoadedLedger> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    return loadCachedFileMapForRepo(
      client as GiteaCommitClient,
      this.cacheHelper,
      ledgerOwner,
      ledgerName,
    );
  }

  async queryShell(params: {
    ledgerId: string;
    userId: string | undefined;
    query: string;
  }): Promise<ShellQueryResult> {
    const { ledgerId, userId, query } = params;
    const { files, entryPoint } = await this.loadLedger(ledgerId, userId);
    const result = await queryLedgerFilesResult(
      files,
      entryPoint,
      normalizeBqlQueryForEngine(query),
    );
    assertQuerySucceeded(result);
    // Aliases extract from whitespace-folded text: the scan's gaps are ASCII
    // (w23/162), while the full pipeline's rewrites would hide the list.
    return queryResultToShellResult(
      result,
      extractSelectAliases(foldBqlWhitespace(query)),
    );
  }

  async queryShellText(params: {
    ledgerId: string;
    userId: string | undefined;
    query: string;
  }): Promise<ShellTextResult> {
    const { ledgerId, userId, query } = params;
    const { files, entryPoint } = await this.loadLedger(ledgerId, userId);
    const result = await queryLedgerFilesResult(
      files,
      entryPoint,
      normalizeBqlQueryForEngine(query),
    );
    assertQuerySucceeded(result);
    return {
      text: queryResultToText(
        result,
        extractSelectAliases(foldBqlWhitespace(query)),
      ),
      rowCount: result.rows.length,
    };
  }
}

/**
 * An invalid BQL query does NOT throw in the WASM — rustledger reports
 * syntax/execution failures in `QueryResult.errors` alongside empty
 * columns/rows, so silently mapping it reads as "query ran, zero matches" to
 * the dashboard AND to the AI/MCP BQL tools (which are prompted to retry on
 * error but never see one). Surface severity-`error` entries as
 * BadUserInputError; warnings pass through.
 */
function assertQuerySucceeded(result: QueryResult): void {
  const failures = result.errors.filter((error) => error.severity === "error");
  if (failures.length > 0) {
    throw new BadUserInputError(
      `Invalid BQL query: ${failures.map((error) => withSupportedSpelling(error.message)).join("; ")}`,
      "query",
    );
  }
}

/**
 * Documented beanquery forms the pinned engine (rustledger 0.24.0) refuses,
 * and the spelling it does accept (w23/016). The refusal is the engine's own
 * type error, which names no way forward, while the tool descriptions point
 * agents at the upstream BQL reference. Only the message carries this: the
 * error envelope has no hint field. Drop an entry when an engine bump accepts
 * the upstream form — `scripts/verify-rustledger.ts` checks each one.
 */
const ENGINE_GAPS: ReadonlyArray<{ match: RegExp; supported: string }> = [
  {
    match: /NEG expects a number or amount|negation requires numeric value/,
    supported:
      "This engine negates numbers and amounts, not inventories: negate each posting with sum(neg(units(position))), or a number with neg(sum(number)) grouped by currency.",
  },
  {
    // `BALANCES FROM <window>` books the window's reductions against lots
    // opened before it and fails (w23/020).
    match: /No matching lot for /,
    supported:
      "BALANCES with a FROM window fails on this engine when the window sells a lot bought before it: sum the window's postings with SELECT account, sum(position) FROM <the same filter> GROUP BY account.",
  },
  {
    match: /FILTER_CURRENCY expects \(inventory, string\)/,
    supported:
      "This engine filters an inventory, not a position: use filter_currency(sum(position), 'USD').",
  },
];

function withSupportedSpelling(message: string): string {
  const gap = ENGINE_GAPS.find(({ match }) => match.test(message));
  return gap ? `${message}. ${gap.supported}` : message;
}
