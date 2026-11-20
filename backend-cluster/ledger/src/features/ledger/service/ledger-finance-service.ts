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
  balanceSheetCap,
  closeCurrentEarnings,
  collectLedgerCommodities,
  deriveReportAccounts,
  filterDirectivesAsync,
  formatFiscalYearEnd,
  intervalTotals,
  isUnbookedDirective,
  parseDateRange,
  parseFavaOptions,
  parseLedgerFiles,
  resolveConversion,
  TimeFilterParseError,
  AdvancedFilterParseError,
  trialBalanceLines,
  windowEndInclusive,
  withoutClampConversions,
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

interface ILedgerFinanceService {
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
      valuationDate,
      window,
      operatingCurrency,
      allCommodities,
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
      allCommodities,
    );
    const key = (interval ?? "month") as IntervalKey;
    const cumulative = (prefixes: string[]) =>
      accountBalanceSeries(directives, key, prefixes, target, priceMap, window);
    // Income and expenses are flows, each posting valued on its own date in
    // the trees and the interval totals alike (w1/m49).
    const periodic = (prefixes: string[]) =>
      intervalTotals(directives, key, prefixes, target, priceMap, window, {
        flows: true,
      });
    const flowTree = (root: string) =>
      accountHierarchy(directives, root, target, priceMap, valuationDate, {
        flows: true,
      });
    return {
      net_worth_data: cumulative([roots.assets, roots.liabilities]),
      assets_data: cumulative([roots.assets]),
      assets_hierarchy_data: accountHierarchy(
        directives,
        roots.assets,
        target,
        priceMap,
        valuationDate,
      ),
      liabilities_data: cumulative([roots.liabilities]),
      liabilities_hierarchy_data: accountHierarchy(
        directives,
        roots.liabilities,
        target,
        priceMap,
        valuationDate,
      ),
      expenses_interval_data: periodic([roots.expenses]),
      expenses_hierarchy_data: flowTree(roots.expenses),
      expenses_data: cumulative([roots.expenses]),
      income_interval_data: periodic([roots.income]),
      income_hierarchy_data: flowTree(roots.income),
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
      valuationDate,
      window,
      operatingCurrency,
      allCommodities,
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
      allCommodities,
    );
    const key = (interval ?? "month") as IntervalKey;
    // Each income and expenses posting is valued on its own date, in the trees
    // and the rows alike, so the rows add up to the trees at every interval
    // (w1/m49).
    const periodic = (prefixes: string[]) =>
      intervalTotals(directives, key, prefixes, target, priceMap, window, {
        flows: true,
      });
    const flowTree = (root: string) =>
      accountHierarchy(directives, root, target, priceMap, valuationDate, {
        flows: true,
      });
    return {
      net_profit_data: periodic([roots.income, roots.expenses]).map((row) => ({
        date: row.date,
        balance: row.balance,
      })),
      income_data: periodic([roots.income]),
      expenses_data: periodic([roots.expenses]),
      income_hierarchy_data: flowTree(roots.income),
      expenses_hierarchy_data: flowTree(roots.expenses),
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
      valuationDate,
      window,
      operatingCurrency,
      allCommodities,
      roots,
      clamp,
      unrealizedAccount,
    } = await this.loadReportDirectives(ledgerId, userId, {
      account,
      filter,
      time,
    });
    const { directives, target } = resolveConversion(
      conversion,
      rawDirectives,
      operatingCurrency,
      allCommodities,
    );
    // Conversions and unrealized gains, as Fava's `Tree.cap` adds them, on
    // the clamped stream and the whole one alike (w21/710).
    const equityDirectives = closeCurrentEarnings(
      balanceSheetCap(
        directives,
        clamp,
        `${roots.equity}:${unrealizedAccount}`,
        window?.end,
      ),
      clamp,
    );
    const key = (interval ?? "month") as IntervalKey;
    const cumulative = (prefixes: string[]) =>
      accountBalanceSeries(directives, key, prefixes, target, priceMap, window);
    return {
      net_worth_data: cumulative([roots.assets, roots.liabilities]),
      assets_data: cumulative([roots.assets]),
      liabilities_data: cumulative([roots.liabilities]),
      equity_data: accountBalanceSeries(
        equityDirectives,
        key,
        [roots.equity],
        target,
        priceMap,
        window,
      ),
      assets_hierarchy_data: accountHierarchy(
        directives,
        roots.assets,
        target,
        priceMap,
        valuationDate,
      ),
      liabilities_hierarchy_data: accountHierarchy(
        directives,
        roots.liabilities,
        target,
        priceMap,
        valuationDate,
      ),
      equity_hierarchy_data: accountHierarchy(
        equityDirectives,
        roots.equity,
        target,
        priceMap,
        valuationDate,
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
      valuationDate,
      operatingCurrency,
      allCommodities,
      roots,
      ledgerErrors,
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
      allCommodities,
    );
    // Income and expenses value each posting on its own date, as the income
    // statement does; the valuation line takes the translation (w1/m49).
    const tree = (root: string, stream = directives) =>
      accountHierarchy(stream, root, target, priceMap, valuationDate, {
        flows: root === roots.income || root === roots.expenses,
      });
    // Valued, the five trees net only through two lines, valuation and the
    // rounding the ledger's tolerance accepted (w1/305), and the clamp's
    // conversion booking folds into the first, as `bea` does: with and
    // without `time` the equity tree is the booked equity and the lines are
    // the same (w1/291). `units` values nothing and keeps the booking.
    const valued = target !== "units" && target !== "units_by_cost";
    const booked = valued ? withoutClampConversions(directives) : directives;
    const trees = {
      income_hierarchy_data: tree(roots.income),
      liabilities_hierarchy_data: tree(roots.liabilities),
      equity_hierarchy_data: tree(roots.equity, booked),
      expenses_hierarchy_data: tree(roots.expenses),
      assets_hierarchy_data: tree(roots.assets),
    };
    // Withheld with ledger errors: they would absorb an unbalanced entry.
    const lines =
      valued && !ledgerErrors
        ? trialBalanceLines(
            Object.values(trees),
            booked,
            target,
            priceMap,
            valuationDate,
          )
        : null;
    return {
      ...trees,
      valuation_adjustment: lines?.valuation_adjustment ?? null,
      rounding_residual: lines?.rounding_residual ?? null,
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
    const favaOptions = parseFavaOptions(snapshot.directives);
    const fiscalYearEnd = formatFiscalYearEnd(favaOptions.fiscal_year_end);
    return {
      ...snapshot,
      reportAccounts,
      fiscalYearEnd,
      // Fava's `unrealized` option: the Equity child unrealized gains go to.
      unrealizedAccount: favaOptions.unrealized,
    };
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
    /** Every commodity in the FULL snapshot (w23/156 conversion check). */
    allCommodities: Set<string>;
    roots: ReportAccounts["roots"];
    clamp: ReportAccounts["clamp"];
    /** Fava's `unrealized` option: the Equity child unrealized gains go to. */
    unrealizedAccount: string;
    window?: IntervalWindow;
    /** Price date for tree balances; latest prices when absent. */
    valuationDate?: string;
    /** Whether the ledger has an error bean-check fails on (not a warning). */
    ledgerErrors: boolean;
  }> {
    const {
      directives,
      errors,
      options,
      reportAccounts,
      fiscalYearEnd,
      unrealizedAccount,
    } = await this.loadSnapshot(ledgerId, userId);
    const ledgerErrors = errors.some((error) => error.severity !== "warning");
    const { roots, clamp } = reportAccounts;
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
    // Conversion targets validate against the FULL snapshot's commodities
    // (w23/156) — like the price map, a filter must not hide a currency.
    const allCommodities = collectLedgerCommodities(directives);
    try {
      // Apply account + advanced filters first (Fava's filter order), leaving
      // the time filter for the clamp so we can also capture its date window.
      // A transaction the engine could not book is in no balance, as in
      // Beancount, which drops it (w21/678). Prices and commodities above keep
      // the full stream.
      const filtered = await filterDirectivesAsync(
        directives.filter((directive) => !isUnbookedDirective(directive)),
        {
          account: selectors.account,
          filter: selectors.filter,
        },
      );
      // Fava applies the TimeFilter only when `time` is truthy (`if time:`); the
      // dashboard sends an empty string for "no time filter", so treat that (and
      // undefined) as no filter rather than trying to parse "".
      if (!selectors.time) {
        return {
          directives: filtered,
          priceMap,
          operatingCurrency,
          allCommodities,
          roots,
          clamp,
          unrealizedAccount,
          ledgerErrors,
        };
      }
      const range = parseDateRange(selectors.time, fiscalYearEnd);
      if (!range) throw new TimeFilterParseError(selectors.time);
      // Thread the derived clamp account names so the synthesized opening/
      // retained-earnings/conversion entries land under the ledger's actual
      // equity root and the income-statement predicate uses the real
      // income/expenses roots.
      const window = { begin: range.begin, end: range.end };
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
        allCommodities,
        roots,
        clamp,
        unrealizedAccount,
        window,
        valuationDate: windowEndInclusive(window),
        ledgerErrors,
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
