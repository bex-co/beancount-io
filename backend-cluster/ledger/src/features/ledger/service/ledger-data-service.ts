import { parseLedgerId } from "@/shared/str";
import { BadUserInputError } from "@/shared/errors";
import type {
  AttributesPublic,
  CommodityPairWithPricesPublic,
  EventPublic,
  DocumentPublic,
  TransactionPublic,
  BeancountErrorPublic,
  AccountLastEntryPublic,
  EntriesCountPerTypePublic,
  AccountReportPublic,
  DateAndBalanceWithAccountBalancePublic,
} from "@/foundation/ledger-api-types";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import {
  accountBalanceSeries,
  accountOwnUnitBalances,
  accountsForPayee,
  buildPriceMap,
  clampDirectives,
  collectAttributes,
  collectDocuments,
  collectEvents,
  collectLedgerAccounts,
  commodityPairsWithPrices,
  deriveReportAccounts,
  entriesCountPerType,
  filterDirectivesAsync,
  formatFiscalYearEnd,
  intervalTotals,
  linechartSeries,
  parseDateRange,
  parseFavaOptions,
  parseLedgerFiles,
  resolveConversion,
  TimeFilterParseError,
  AdvancedFilterParseError,
  type IntervalKey,
  type IntervalWindow,
  type LedgerAttributes,
  type LedgerSnapshot,
  type ReportAccounts,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import type { CacheHelper } from "@/shared/cache";
import type { DirectiveJson } from "@rustledger/wasm";
import {
  toAttributesPublic,
  toBeancountErrorsPublic,
  toDocumentsPublic,
  toEntriesCountPerTypePublic,
  toEventsPublic,
} from "./ledger-data-mappers";

type BaseParams = { ledgerId: string; userId: string | undefined };
type FilterParams = { account?: string; filter?: string; time?: string };
type ConversionParams = FilterParams & {
  conversion?: string;
  interval?: string;
};
type AccountReportParams = ConversionParams & { accountName: string };

interface ILedgerDataService {
  getAttributes(params: BaseParams): Promise<AttributesPublic>;

  getCommodities(params: BaseParams): Promise<CommodityPairWithPricesPublic[]>;

  getEvents(params: BaseParams & FilterParams): Promise<EventPublic[]>;

  getDocuments(params: BaseParams & FilterParams): Promise<DocumentPublic[]>;

  getPayeeTransactions(
    params: BaseParams & { payee: string },
  ): Promise<TransactionPublic | null>;

  getNarrationTransactions(
    params: BaseParams & { narration: string },
  ): Promise<TransactionPublic | null>;

  getPayeeAccounts(params: BaseParams & { payee: string }): Promise<string[]>;

  getErrors(params: BaseParams): Promise<BeancountErrorPublic[]>;

  getCurrencies(params: BaseParams): Promise<string[]>;

  getSourceFiles(params: BaseParams): Promise<string[]>;

  getTags(params: BaseParams): Promise<string[]>;

  getYears(params: BaseParams): Promise<string[]>;

  getLinks(params: BaseParams): Promise<string[]>;

  getNarrations(params: BaseParams): Promise<string[]>;

  getPayees(params: BaseParams): Promise<string[]>;

  getAccountLastEntries(
    params: BaseParams & FilterParams,
  ): Promise<AccountLastEntryPublic[]>;

  getEntriesCountPerType(
    params: BaseParams & FilterParams,
  ): Promise<EntriesCountPerTypePublic[]>;

  getAccountReport(
    params: BaseParams & AccountReportParams,
  ): Promise<AccountReportPublic>;

  getIntervalTotals(
    params: BaseParams & AccountReportParams,
  ): Promise<DateAndBalanceWithAccountBalancePublic[]>;
}

export class LedgerDataService implements ILedgerDataService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  /**
   * Parse the ledger via the in-process rustledger engine (replacing the Python
   * fava_api for the directive-walk / validation reads below). Loads every
   * `.bean` file from Gitea into a FileMap and parses it.
   */
  private async loadSnapshot(
    ledgerId: string,
    userId: string | undefined,
  ): Promise<
    LedgerSnapshot & { reportAccounts: ReportAccounts; fiscalYearEnd: string }
  > {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { files, entryPoint, repoPaths } = await loadCachedFileMapForRepo(
      client as GiteaCommitClient,
      this.cacheHelper,
      ledgerOwner,
      ledgerName,
    );
    const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
    // The WASM does not surface `name_*` overrides; recover the real root names
    // so account-selection honors `option "name_assets" "Actif"` etc.
    const reportAccounts = deriveReportAccounts({
      source: files[entryPoint],
      operatingCurrencies: snapshot.options.operating_currencies ?? [],
    });
    // Fava `fiscal-year-end` (default `12-31`) as `MM-DD`, so `fyXXXX`/fiscal-
    // quarter `time` filters resolve to the ledger's real accounting periods.
    const fiscalYearEnd = formatFiscalYearEnd(
      parseFavaOptions(snapshot.directives).fiscal_year_end,
    );
    return { ...snapshot, reportAccounts, fiscalYearEnd };
  }

  private async loadAttributes(
    ledgerId: string,
    userId: string | undefined,
  ): Promise<LedgerAttributes> {
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    return collectAttributes(snapshot.directives, snapshot.fiscalYearEnd);
  }

  /** Apply Fava `get_filtered`, mapping a bad `time` string to a 400. */
  private async applyFilters(
    directives: DirectiveJson[],
    opts: {
      account?: string;
      filter?: string;
      time?: string;
      fiscalYearEnd?: string;
    },
  ): Promise<DirectiveJson[]> {
    try {
      return await filterDirectivesAsync(directives, opts);
    } catch (error) {
      if (
        error instanceof TimeFilterParseError ||
        error instanceof AdvancedFilterParseError
      ) {
        throw new BadUserInputError(error.message);
      }
      throw error;
    }
  }

  /**
   * Apply Fava's full `get_filtered(account, filter, time)` for a balance-
   * summing report: account/advanced filters via {@link filterDirectives}, then
   * — when `time` is set — the `TimeFilter` summarization via
   * {@link clampDirectives} (beancount `summarize.clamp_opt`). Returns the
   * clamped stream plus the `[begin, end)` window (so the chart series use
   * `complete=false` interval boundaries). Mirrors
   * `LedgerFinanceService.loadReportDirectives`.
   */
  private async clampReportDirectives(
    directives: DirectiveJson[],
    opts: {
      account?: string;
      filter?: string;
      time?: string;
      fiscalYearEnd?: string;
      clamp: ReportAccounts["clamp"];
    },
  ): Promise<{ directives: DirectiveJson[]; window?: IntervalWindow }> {
    try {
      const filtered = await filterDirectivesAsync(directives, {
        account: opts.account,
        filter: opts.filter,
      });
      // Empty string (dashboard's "no time filter") is treated as no filter,
      // matching Fava's `if time:`.
      if (!opts.time) return { directives: filtered };
      const range = parseDateRange(opts.time, opts.fiscalYearEnd);
      if (!range) throw new TimeFilterParseError(opts.time);
      const clamped = clampDirectives(
        filtered,
        range.begin,
        range.end,
        opts.clamp,
      );
      return {
        directives: clamped,
        window: { begin: range.begin, end: range.end },
      };
    } catch (error) {
      if (
        error instanceof TimeFilterParseError ||
        error instanceof AdvancedFilterParseError
      ) {
        throw new BadUserInputError(error.message);
      }
      throw error;
    }
  }

  async getAttributes(params: BaseParams): Promise<AttributesPublic> {
    const { ledgerId, userId } = params;
    return toAttributesPublic(await this.loadAttributes(ledgerId, userId));
  }

  async getCommodities(
    params: BaseParams,
  ): Promise<CommodityPairWithPricesPublic[]> {
    const { ledgerId, userId } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const operatingCurrencies =
      snapshot.options.operating_currencies.length > 0
        ? snapshot.options.operating_currencies
        : ["USD"];
    return commodityPairsWithPrices(snapshot.directives, operatingCurrencies);
  }

  async getEvents(params: BaseParams & FilterParams): Promise<EventPublic[]> {
    const { ledgerId, userId, account, filter, time } = params;
    // Pure listing of Event directives — filtering (incl. time-truncate) selects
    // real entries, so the engine matches fava for every filter.
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const filtered = await this.applyFilters(snapshot.directives, {
      account,
      filter,
      time,
      fiscalYearEnd: snapshot.fiscalYearEnd,
    });
    return toEventsPublic(collectEvents(filtered));
  }

  async getDocuments(
    params: BaseParams & FilterParams,
  ): Promise<DocumentPublic[]> {
    const { ledgerId, userId, account, filter, time } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const filtered = await this.applyFilters(snapshot.directives, {
      account,
      filter,
      time,
      fiscalYearEnd: snapshot.fiscalYearEnd,
    });
    return toDocumentsPublic(collectDocuments(filtered));
  }

  async getPayeeTransactions(
    params: BaseParams & { payee: string },
  ): Promise<TransactionPublic | null> {
    const { directives } = await this.loadSnapshot(
      params.ledgerId,
      params.userId,
    );
    return this.lastTransaction(directives, (t) => t.payee === params.payee);
  }

  async getNarrationTransactions(
    params: BaseParams & { narration: string },
  ): Promise<TransactionPublic | null> {
    const { directives } = await this.loadSnapshot(
      params.ledgerId,
      params.userId,
    );
    return this.lastTransaction(
      directives,
      (t) => t.narration === params.narration,
    );
  }

  /** Fava `payee_transaction`/`narration_transaction`: the LAST matching txn. */
  private lastTransaction(
    directives: DirectiveJson[],
    match: (txn: Extract<DirectiveJson, { type: "transaction" }>) => boolean,
  ): TransactionPublic | null {
    for (let i = directives.length - 1; i >= 0; i -= 1) {
      const directive = directives[i];
      if (directive.type === "transaction" && match(directive)) {
        return {
          date: directive.date,
          payee: directive.payee ?? null,
          narration: directive.narration ?? null,
          postings: directive.postings.map((posting) => ({
            account: posting.account,
            amount: posting.units?.number ?? "",
            commodity: posting.units?.currency ?? "",
            price: posting.price?.number ?? null,
          })),
        };
      }
    }
    return null;
  }

  async getPayeeAccounts(
    params: BaseParams & { payee: string },
  ): Promise<string[]> {
    const { ledgerId, userId, payee } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    return accountsForPayee(snapshot.directives, payee);
  }

  async getErrors(params: BaseParams): Promise<BeancountErrorPublic[]> {
    const { ledgerId, userId } = params;
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    return toBeancountErrorsPublic(snapshot.errors);
  }

  async getCurrencies(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).currencies;
  }

  /**
   * The ledger's Beancount source files (`main.bean` plus everything it
   * transitively `include`s) — i.e. the set of valid targets for a new entry.
   */
  async getSourceFiles(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const client = await this.giteaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { sourceFiles } = await loadCachedFileMapForRepo(
      client as GiteaCommitClient,
      this.cacheHelper,
      ledgerOwner,
      ledgerName,
    );
    return sourceFiles;
  }

  async getTags(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).tags;
  }

  async getYears(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).years;
  }

  async getLinks(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).links;
  }

  async getNarrations(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).narrations;
  }

  async getPayees(params: BaseParams): Promise<string[]> {
    const { ledgerId, userId } = params;
    return (await this.loadAttributes(ledgerId, userId)).payees;
  }

  async getAccountLastEntries(
    params: BaseParams & FilterParams,
  ): Promise<AccountLastEntryPublic[]> {
    const { ledgerId, userId, account, filter, time } = params;

    // Fava's handler mixes the FULL and FILTERED ledgers (`reports.py`):
    //   - the account list is `ledger.attributes.accounts` (FULL) restricted to
    //     Assets/Liabilities,
    //   - `last_entry.date` is `ledger.accounts[acc].last_entry` (FULL — the
    //     `time` filter does NOT move the reported date),
    //   - the balance is `conversion.units(Tree(filtered.entries).get(acc))`
    //     (the FILTERED/CLAMPED balance, in UNITS).
    const {
      directives: fullDirectives,
      reportAccounts,
      fiscalYearEnd,
    } = await this.loadSnapshot(ledgerId, userId);
    const attributes = collectAttributes(fullDirectives);
    const ledgerAccounts = collectLedgerAccounts(fullDirectives);

    const { directives: reportDirectives } = await this.clampReportDirectives(
      fullDirectives,
      {
        account,
        filter,
        time,
        fiscalYearEnd,
        clamp: reportAccounts.clamp,
      },
    );
    const ownBalances = accountOwnUnitBalances(reportDirectives);

    // Assets & Liabilities accounts that have a last entry (fava filters to
    // these two roots and skips accounts with no referencing directive). The
    // roots honor the ledger's `name_assets`/`name_liabilities` overrides.
    const balanceRoots = [
      reportAccounts.roots.assets,
      reportAccounts.roots.liabilities,
    ];
    return attributes.accounts
      .filter((acc) =>
        balanceRoots.some((root) => acc === root || acc.startsWith(`${root}:`)),
      )
      .filter((acc) => ledgerAccounts[acc]?.last_entry != null)
      .map((acc) => ({
        account: acc,
        date: ledgerAccounts[acc]?.last_entry?.date ?? null,
        balance: ownBalances.get(acc) ?? {},
      }));
  }

  async getEntriesCountPerType(
    params: BaseParams & FilterParams,
  ): Promise<EntriesCountPerTypePublic[]> {
    const { ledgerId, userId, account, filter, time } = params;
    // Fava counts over `get_filtered(account, filter, time)`. A `time` filter
    // counts the CLAMPED stream (the summarize/transfer synthetic transactions
    // replace the pre-period entries), so the clamp is required — this is not a
    // plain truncate.
    const snapshot = await this.loadSnapshot(ledgerId, userId);
    const { directives } = await this.clampReportDirectives(
      snapshot.directives,
      {
        account,
        filter,
        time,
        fiscalYearEnd: snapshot.fiscalYearEnd,
        clamp: snapshot.reportAccounts.clamp,
      },
    );
    return toEntriesCountPerTypePublic(entriesCountPerType(directives));
  }

  async getAccountReport(
    params: BaseParams & AccountReportParams,
  ): Promise<AccountReportPublic> {
    const {
      ledgerId,
      userId,
      accountName,
      account,
      filter,
      time,
      conversion,
      interval,
    } = params;

    const {
      directives: fullDirectives,
      options,
      reportAccounts,
      fiscalYearEnd,
    } = await this.loadSnapshot(ledgerId, userId);
    // Fava values against the FULL ledger's price map (see finance service).
    const priceMap = buildPriceMap(fullDirectives);
    const { directives, window } = await this.clampReportDirectives(
      fullDirectives,
      {
        account,
        filter,
        time,
        fiscalYearEnd,
        clamp: reportAccounts.clamp,
      },
    );
    // Fava's default report conversion is the ledger's OPERATING currency, not
    // hardcoded USD, and the dashboard's "" ("no conversion" sentinel) must
    // resolve the same way — parity with LedgerFinanceService, so the account
    // page agrees with the overview/income-statement/balance-sheet reports.
    const { target } = resolveConversion(
      conversion,
      directives,
      options.operating_currencies?.[0] ?? "USD",
    );
    const key = (interval ?? "month") as IntervalKey;
    const strip = (rows: { date: string; balance: Record<string, string> }[]) =>
      rows.map((row) => ({ date: row.date, balance: row.balance }));
    return {
      linechart_data: linechartSeries(
        directives,
        [accountName],
        target,
        priceMap,
      ),
      interval_totals_data: strip(
        intervalTotals(
          directives,
          key,
          [accountName],
          target,
          priceMap,
          window,
        ),
      ),
      account_balance_data: accountBalanceSeries(
        directives,
        key,
        [accountName],
        target,
        priceMap,
        window,
      ),
    };
  }

  async getIntervalTotals(
    params: BaseParams & AccountReportParams,
  ): Promise<DateAndBalanceWithAccountBalancePublic[]> {
    const {
      ledgerId,
      userId,
      accountName,
      account,
      filter,
      time,
      conversion,
      interval,
    } = params;

    const {
      directives: fullDirectives,
      options,
      reportAccounts,
      fiscalYearEnd,
    } = await this.loadSnapshot(ledgerId, userId);
    const priceMap = buildPriceMap(fullDirectives);
    const { directives, window } = await this.clampReportDirectives(
      fullDirectives,
      {
        account,
        filter,
        time,
        fiscalYearEnd,
        clamp: reportAccounts.clamp,
      },
    );
    // Same operating-currency default as getAccountReport (see above).
    const { target } = resolveConversion(
      conversion,
      directives,
      options.operating_currencies?.[0] ?? "USD",
    );
    const key = (interval ?? "month") as IntervalKey;
    return intervalTotals(
      directives,
      key,
      [accountName],
      target,
      priceMap,
      window,
    );
  }
}
