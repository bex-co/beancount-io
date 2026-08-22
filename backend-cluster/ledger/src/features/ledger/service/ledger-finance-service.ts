import { parseLedgerId } from "@/shared/str";
import type {
  OverviewPublic,
  IncomeStatementDataPublic,
  BalanceSheetDataPublic,
  TrialBalanceDataPublic,
} from "@/foundation/ledger-api-types";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import {
  accountBalanceSeries,
  accountHierarchy,
  buildPriceMap,
  clampDirectives,
  deriveReportAccounts,
  filterDirectivesAsync,
  formatFiscalYearEnd,
  intervalTotals,
  parseDateRange,
  parseFavaOptions,
  parseLedgerFiles,
  resolveConversion,
  TimeFilterParseError,
  AdvancedFilterParseError,
  type IntervalKey,
  type IntervalWindow,
  type PriceMap,
  type ReportAccounts,
} from "@/foundation/rustledger";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import type { CacheHelper } from "@/shared/cache";
import type { DirectiveJson } from "@rustledger/wasm";
import { BadUserInputError } from "@/shared/errors";

type BaseParams = { ledgerId: string; userId: string | undefined };
type ConversionParams = {
  account?: string;
  filter?: string;
  time?: string;
  conversion?: string;
  interval?: string;
};

export interface ILedgerFinanceService {
  getOverview(params: BaseParams & ConversionParams): Promise<OverviewPublic>;

  getIncomeStatement(
    params: BaseParams & ConversionParams,
  ): Promise<IncomeStatementDataPublic>;

  getBalanceSheet(
    params: BaseParams & ConversionParams,
  ): Promise<BalanceSheetDataPublic>;

  getTrialBalance(
    params: BaseParams & ConversionParams,
  ): Promise<TrialBalanceDataPublic>;
}

export class LedgerFinanceService implements ILedgerFinanceService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly cacheHelper: CacheHelper,
  ) {}

  async getOverview(
    params: BaseParams & ConversionParams,
  ): Promise<OverviewPublic> {
    const { ledgerId, userId, account, filter, time, conversion, interval } =
      params;

    const {
      directives: rawDirectives,
      priceMap,
      window,
      operatingCurrency,
      roots,
    } = await this.loadReportDirectives(ledgerId, userId, {
      account,
      filter,
      time,
    });
    const { directives, target } = resolveConversion(
      conversion,
      rawDirectives,
      operatingCurrency,
    );
    const key = (interval ?? "month") as IntervalKey;
    const cumulative = (prefixes: string[]) =>
      accountBalanceSeries(directives, key, prefixes, target, priceMap, window);
    const periodic = (prefixes: string[]) =>
      intervalTotals(directives, key, prefixes, target, priceMap, window);
    return {
      net_worth_data: cumulative([roots.assets, roots.liabilities]),
      assets_data: cumulative([roots.assets]),
      assets_hierarchy_data: accountHierarchy(
        directives,
        roots.assets,
        target,
        priceMap,
      ),
      liabilities_data: cumulative([roots.liabilities]),
      liabilities_hierarchy_data: accountHierarchy(
        directives,
        roots.liabilities,
        target,
        priceMap,
      ),
      expenses_interval_data: periodic([roots.expenses]),
      expenses_hierarchy_data: accountHierarchy(
        directives,
        roots.expenses,
        target,
        priceMap,
      ),
      expenses_data: cumulative([roots.expenses]),
      income_interval_data: periodic([roots.income]),
      income_hierarchy_data: accountHierarchy(
        directives,
        roots.income,
        target,
        priceMap,
      ),
      income_data: cumulative([roots.income]),
    };
  }

  async getIncomeStatement(
    params: BaseParams & ConversionParams,
  ): Promise<IncomeStatementDataPublic> {
    const { ledgerId, userId, account, filter, time, conversion, interval } =
      params;

    const {
      directives: rawDirectives,
      priceMap,
      window,
      operatingCurrency,
      roots,
    } = await this.loadReportDirectives(ledgerId, userId, {
      account,
      filter,
      time,
    });
    const { directives, target } = resolveConversion(
      conversion,
      rawDirectives,
      operatingCurrency,
    );
    const key = (interval ?? "month") as IntervalKey;
    const netProfit = intervalTotals(
      directives,
      key,
      [roots.income, roots.expenses],
      target,
      priceMap,
      window,
    ).map((row) => ({ date: row.date, balance: row.balance }));
    return {
      net_profit_data: netProfit,
      income_data: intervalTotals(
        directives,
        key,
        [roots.income],
        target,
        priceMap,
        window,
      ),
      expenses_data: intervalTotals(
        directives,
        key,
        [roots.expenses],
        target,
        priceMap,
        window,
      ),
      income_hierarchy_data: accountHierarchy(
        directives,
        roots.income,
        target,
        priceMap,
      ),
      expenses_hierarchy_data: accountHierarchy(
        directives,
        roots.expenses,
        target,
        priceMap,
      ),
    };
  }

  async getBalanceSheet(
    params: BaseParams & ConversionParams,
  ): Promise<BalanceSheetDataPublic> {
    const { ledgerId, userId, account, filter, time, conversion, interval } =
      params;

    const {
      directives: rawDirectives,
      priceMap,
      window,
      operatingCurrency,
      roots,
    } = await this.loadReportDirectives(ledgerId, userId, {
      account,
      filter,
      time,
    });
    const { directives, target } = resolveConversion(
      conversion,
      rawDirectives,
      operatingCurrency,
    );
    const key = (interval ?? "month") as IntervalKey;
    const cumulative = (prefixes: string[]) =>
      accountBalanceSeries(directives, key, prefixes, target, priceMap, window);
    return {
      net_worth_data: cumulative([roots.assets, roots.liabilities]),
      assets_data: cumulative([roots.assets]),
      liabilities_data: cumulative([roots.liabilities]),
      equity_data: cumulative([roots.equity]),
      assets_hierarchy_data: accountHierarchy(
        directives,
        roots.assets,
        target,
        priceMap,
      ),
      liabilities_hierarchy_data: accountHierarchy(
        directives,
        roots.liabilities,
        target,
        priceMap,
      ),
      equity_hierarchy_data: accountHierarchy(
        directives,
        roots.equity,
        target,
        priceMap,
      ),
    };
  }

  async getTrialBalance(
    params: BaseParams & ConversionParams,
  ): Promise<TrialBalanceDataPublic> {
    const { ledgerId, userId, account, filter, time, conversion } = params;

    // The engine computes the 5 account-hierarchy trees directly, valuing each
    // in the target currency via the price map, over the (possibly clamped)
    // directive stream.
    const {
      directives: rawDirectives,
      priceMap,
      operatingCurrency,
      roots,
    } = await this.loadReportDirectives(ledgerId, userId, {
      account,
      filter,
      time,
    });
    // Resolve fava's conversion keyword into the value `target` the lot-aware
    // accountHierarchy applies: "at_cost"/"at_value"/"units" keywords, or a
    // currency code (default = the operating currency).
    const { directives, target } = resolveConversion(
      conversion,
      rawDirectives,
      operatingCurrency,
    );
    return {
      income_hierarchy_data: accountHierarchy(
        directives,
        roots.income,
        target,
        priceMap,
      ),
      liabilities_hierarchy_data: accountHierarchy(
        directives,
        roots.liabilities,
        target,
        priceMap,
      ),
      equity_hierarchy_data: accountHierarchy(
        directives,
        roots.equity,
        target,
        priceMap,
      ),
      expenses_hierarchy_data: accountHierarchy(
        directives,
        roots.expenses,
        target,
        priceMap,
      ),
      assets_hierarchy_data: accountHierarchy(
        directives,
        roots.assets,
        target,
        priceMap,
      ),
    };
  }

  private async loadSnapshot(ledgerId: string, userId: string | undefined) {
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
    // The WASM does not surface `name_*` / `account_current_*` overrides, so
    // recover the report root-account names (and the derived `time`-clamp
    // account names) from the raw source — honoring `option "name_assets"
    // "Actif"` etc. instead of assuming the beancount defaults. (Root names are
    // independent of the ledger `title`, so we don't need to resolve it here.)
    const reportAccounts = deriveReportAccounts({
      source: files[entryPoint],
      operatingCurrencies: snapshot.options.operating_currencies ?? [],
    });
    // The ledger's Fava `fiscal-year-end` (default `12-31`) drives `fyXXXX`/
    // fiscal-quarter `time` parsing; thread it as `MM-DD` so a custom fiscal year
    // maps to the right accounting period instead of the calendar year.
    const fiscalYearEnd = formatFiscalYearEnd(
      parseFavaOptions(snapshot.directives).fiscal_year_end,
    );
    return { ...snapshot, reportAccounts, fiscalYearEnd };
  }

  /**
   * Load the directive stream for a balance-summing report, applying Fava's
   * full `get_filtered(account, filter, time)`:
   *
   *  - account/filter are the pure directive-in/out filters
   *    ({@link filterDirectives}).
   *  - `time` (when set) applies the `TimeFilter` summarization via
   *    {@link clampDirectives} — synthesizing the opening/retained-earnings/
   *    conversion entries beancount's `summarize.clamp_opt` produces — and
   *    returns the `[begin, end)` window so the chart series use `complete=false`
   *    interval boundaries ({@link IntervalWindow}).
   *
   * This replaces the former Python-fava fallback: the engine now handles every
   * filter combination in-process.
   */
  private async loadReportDirectives(
    ledgerId: string,
    userId: string | undefined,
    selectors: { account?: string; filter?: string; time?: string },
  ): Promise<{
    directives: DirectiveJson[];
    priceMap: PriceMap;
    operatingCurrency: string;
    roots: ReportAccounts["roots"];
    window?: IntervalWindow;
  }> {
    const { directives, options, reportAccounts, fiscalYearEnd } =
      await this.loadSnapshot(ledgerId, userId);
    const roots = reportAccounts.roots;
    // Fava's `at_value`/default valuation converts to the ledger's operating
    // currency; use the first declared one (bean-example: "USD"), defaulting to
    // "USD" when a ledger declares none.
    const operatingCurrency = options.operating_currencies?.[0] ?? "USD";
    // Fava values every report against the FULL ledger's price map
    // (`FilteredLedger.ledger.prices`), NOT the filtered/clamped stream — a
    // `time` filter that truncates future `Price` directives must not lose them
    // for at-cost valuation. Build the price map once from the unfiltered
    // snapshot and thread it through.
    const priceMap = buildPriceMap(directives);
    try {
      // Apply account + advanced filters first (Fava's filter order), leaving
      // the time filter for the clamp so we can also capture its date window.
      const filtered = await filterDirectivesAsync(directives, {
        account: selectors.account,
        filter: selectors.filter,
      });
      // Fava applies the TimeFilter only when `time` is truthy (`if time:`); the
      // dashboard sends an empty string for "no time filter", so treat that (and
      // undefined) as no filter rather than trying to parse "".
      if (!selectors.time) {
        return { directives: filtered, priceMap, operatingCurrency, roots };
      }
      const range = parseDateRange(selectors.time, fiscalYearEnd);
      if (!range) throw new TimeFilterParseError(selectors.time);
      // Thread the derived clamp account names so the synthesized opening/
      // retained-earnings/conversion entries land under the ledger's actual
      // equity root and the income-statement predicate uses the real
      // income/expenses roots.
      const clamped = clampDirectives(
        filtered,
        range.begin,
        range.end,
        reportAccounts.clamp,
      );
      return {
        directives: clamped,
        priceMap,
        operatingCurrency,
        roots,
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
}
