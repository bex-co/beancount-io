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

export type ShellTextResult = { text: string };

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
    const result = await queryLedgerFilesResult(files, entryPoint, query);
    assertQuerySucceeded(result);
    return queryResultToShellResult(result);
  }

  async queryShellText(params: {
    ledgerId: string;
    userId: string | undefined;
    query: string;
  }): Promise<ShellTextResult> {
    const { ledgerId, userId, query } = params;
    const { files, entryPoint } = await this.loadLedger(ledgerId, userId);
    const result = await queryLedgerFilesResult(files, entryPoint, query);
    assertQuerySucceeded(result);
    return { text: queryResultToText(result) };
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
      `Invalid BQL query: ${failures.map((error) => error.message).join("; ")}`,
      "query",
    );
  }
}
