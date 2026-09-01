import type { MetaValueJson } from "@rustledger/wasm";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { createLedgerId } from "@/shared/str";
import {
  accountBalances,
  accountEntryCounts,
  collectCloseEntries,
  collectOpenEntries,
} from "@/features/ledger/utils/account-entries";
import {
  collectLedgerAccounts,
  deriveReportAccounts,
  parseLedgerFiles,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import type { CacheHelper } from "@/shared/cache";
import { logger } from "@/shared/logger";

export type LedgerAccountDetail = {
  account: string;
  closeDate?: string | null;
  meta?: Record<string, string | number | boolean | null> | null;
  upToDateStatus?: string | null;
  balanceString?: string | null;
  lastEntry?: { date: string; entryHash: string } | null;
};

export type LedgerAccountDirectiveItem = {
  account: string;
  openedAt: string;
  closedAt?: string;
  balance?: Record<string, string>;
  entryCount: number;
  entryHash: string;
  closeEntryHash?: string;
};

interface ILedgerAccountService {
  getAccounts(
    ledgerOwner: string,
    ledgerName: string,
    status?: string,
    userId?: string,
  ): Promise<string[]>;
  getAccountsDetail(
    ledgerOwner: string,
    ledgerName: string,
    userId?: string,
  ): Promise<LedgerAccountDetail[]>;
  getAccountDirectives(
    ledgerOwner: string,
    ledgerName: string,
    userId?: string,
  ): Promise<LedgerAccountDirectiveItem[]>;
}

export class LedgerAccountService implements ILedgerAccountService {
  private readonly logger = logger.child({ module: "ledger-account-service" });

  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  /** Load + parse the ledger's `.bean` files into a directive snapshot. */
  private async loadDirectives(
    ledgerOwner: string,
    ledgerName: string,
    userId?: string,
  ) {
    const client = await this.giteaClientFactory.getPublicApiClient(
      createLedgerId(ledgerOwner, ledgerName),
      userId,
    );
    const { files, entryPoint, repoPaths } = await loadCachedFileMapForRepo(
      client as unknown as GiteaCommitClient,
      this.cacheHelper,
      ledgerOwner,
      ledgerName,
    );
    const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
    // Recover the ledger's real root-account names so balance selection honors
    // `option "name_assets" "Actif"` etc. (the WASM does not surface them).
    const reportAccounts = deriveReportAccounts({
      source: files[entryPoint],
      operatingCurrencies: snapshot.options.operating_currencies ?? [],
    });
    return { ...snapshot, reportAccounts };
  }

  async getAccounts(
    ledgerOwner: string,
    ledgerName: string,
    status?: string,
    userId?: string,
  ): Promise<string[]> {
    const items = await this.getAccountsDetail(ledgerOwner, ledgerName, userId);
    if (status === "open") {
      return items.filter((a) => a.closeDate == null).map((a) => a.account);
    }
    if (status === "closed") {
      return items.filter((a) => a.closeDate != null).map((a) => a.account);
    }
    return items.map((a) => a.account);
  }

  /**
   * `getLedgerAccounts` parity via the in-process rustledger engine (replacing
   * the Python fava_api). Loads the ledger's `.bean` files from Gitea, parses
   * them, and derives the per-account data with {@link collectLedgerAccounts} (a
   * faithful port of fava-slim's `AccountsModule.load_file`). The account name set
   * + `close_date` — the only load-bearing outputs (consumed by `getAccounts`'s
   * open/closed filter) — are byte-exact vs. fava; `meta`/`lastEntry` are
   * best-effort and `upToDateStatus`/`balanceString` are `null` (see the ACCEPTED
   * GAP note in `account-list.ts`; no caller reads those fields).
   */
  async getAccountsDetail(
    ledgerOwner: string,
    ledgerName: string,
    userId?: string,
  ): Promise<LedgerAccountDetail[]> {
    const { directives } = await this.loadDirectives(
      ledgerOwner,
      ledgerName,
      userId,
    );
    const accounts = collectLedgerAccounts(directives);
    return Object.entries(accounts).map(([account, data]) => ({
      account,
      closeDate: data.close_date,
      meta: normalizeAccountMeta(data.meta),
      upToDateStatus: data.uptodate_status,
      balanceString: data.balance_string,
      lastEntry: data.last_entry
        ? { date: data.last_entry.date, entryHash: data.last_entry.entry_hash }
        : null,
    }));
  }

  /**
   * `getAccountDirectives` parity via the in-process engine (replacing the Python
   * fava_api). One parse of the ledger's `.bean` files feeds four derivations —
   * Open/Close directives, per-account last-entry units balances (Assets/
   * Liabilities), and per-account posting counts — combined over the Open list,
   * exactly as the former fava path did (see `account-entries.ts`).
   *
   * `entryHash`/`closeEntryHash` are `hashEntry`'s `exclude_meta=True` value, NOT
   * fava's meta-inclusive hash — the same account-list ACCEPTED GAP, and the hash
   * every source-slice deep-link (`getContext`/delete/update) keys on, so the
   * value is internally consistent.
   */
  async getAccountDirectives(
    ledgerOwner: string,
    ledgerName: string,
    userId?: string,
  ): Promise<LedgerAccountDirectiveItem[]> {
    this.logger.debug("Fetching account directives", {
      ledgerOwner,
      ledgerName,
    });

    const { directives, reportAccounts } = await this.loadDirectives(
      ledgerOwner,
      ledgerName,
      userId,
    );

    const openItems = collectOpenEntries(directives);
    const closeItems = collectCloseEntries(directives);
    const balanceMap = accountBalances(directives, [
      reportAccounts.roots.assets,
      reportAccounts.roots.liabilities,
    ]);
    const countMap = accountEntryCounts(directives);

    const closeMap = new Map<string, { date: string; entry_hash: string }>(
      closeItems.map((item) => [
        item.account,
        { date: item.date, entry_hash: item.entry_hash },
      ]),
    );

    return openItems.map((item) => ({
      account: item.account,
      openedAt: item.date,
      closedAt: closeMap.get(item.account)?.date,
      closeEntryHash: closeMap.get(item.account)?.entry_hash,
      balance: balanceMap.get(item.account),
      entryCount: countMap.get(item.account) ?? 0,
      entryHash: item.entry_hash,
    }));
  }
}

/**
 * Project the engine's `Record<string, MetaValueJson>` account metadata onto the
 * `LedgerAccountDetail.meta` value type. `MetaValueJson` may be an amount object
 * (`{ number, currency }`) which the DTO does not model, so those are stringified
 * (`"<number> <currency>"`); string/boolean/null pass through. `meta` is a
 * best-effort, non-load-bearing field (see `account-list.ts`), so the shape only
 * has to be a valid `LedgerAccountDetail.meta`.
 */
function normalizeAccountMeta(
  meta: Record<string, MetaValueJson>,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  Object.entries(meta).forEach(([key, value]) => {
    out[key] =
      value !== null && typeof value === "object"
        ? `${value.number} ${value.currency}`
        : value;
  });
  return out;
}
