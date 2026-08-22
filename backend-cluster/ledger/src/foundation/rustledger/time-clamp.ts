import BigNumber from "bignumber.js";
import type { AmountValue, DirectiveJson, PostingJson } from "@rustledger/wasm";
import { perUnitFromTotalCost } from "./total-cost";
import { utcDate } from "./utc-date";

/**
 * In-process port of beancount's `summarize.clamp_opt` — the summarization that
 * Fava's `TimeFilter.apply` performs when a `time` filter truncates a ledger's
 * history for a balance-summing report.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ────────────────────────────────────────────────────────────────────────────
 * Fava composes `AccountFilter` → `AdvancedFilter` → `TimeFilter`
 * (`fava/ledger.py::FilteredLedger.__init__`). The first two are a pure
 * directive-in / directive-out keep (see {@link "./directive-filter"}). The
 * third is NOT: `TimeFilter.apply` (`fava/core/filters.py`) calls
 * `beancount.ops.summarize.clamp_opt(entries, begin, end, options_map)`, which
 * SYNTHESIZES brand-new directives so that a report restricted to `[begin, end)`
 * still shows the right opening balances and retained earnings:
 *
 *   1. `transfer_balances(entries, begin, income_stmt_pred, account_earnings)` —
 *      move the pre-period Income/Expenses balances into a synthetic "retained
 *      earnings" account (`Equity:Earnings:Previous`).
 *   2. `summarize(entries, begin, account_opening)` — collapse ALL pre-period
 *      account activity into one synthetic "opening balance" transaction per
 *      account (against `Equity:Opening-Balances`), preserving the still-open
 *      `Open` directives and the last `Price` per commodity pair.
 *   3. `truncate(entries, end)` — drop entries on/after `end`.
 *   4. `conversions(entries, account_conversions, conversion_currency, end)` —
 *      insert a currency-conversion transaction (only when the residual cost
 *      balance is non-empty; a no-op for a single-currency ledger).
 *
 * The opening/earnings entries are computed from a running, cost-aware
 * inventory keyed by lot `(currency, cost.number, cost.currency, cost.date,
 * cost.label)` — a direct model of beancount's `Inventory` keyed by
 * `(units.currency, Cost)` (`beancount/core/inventory.py::add_amount`). The
 * balancing leg of a held-at-cost position uses the position's TOTAL COST
 * (`convert.get_cost` = `cost.number * units.number`), matching
 * `summarize.create_entries_from_balances`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT DOWNSTREAM CONSUMERS DO WITH THE RESULT
 * ────────────────────────────────────────────────────────────────────────────
 * The clamped directive stream is fed to the SAME chart/hierarchy code that the
 * unfiltered (`time === undefined`) path uses (`interval-series.ts`,
 * `account-tree.ts`) — Fava does likewise, running `ChartModule` /
 * `FinancialStatementsModule` over `filtered.entries`. Because those consumers
 * only SUM postings per account (order-independent within a date), reproducing
 * the exact SET of synthetic postings + their dates is what makes the balance
 * totals byte-exact; the directive ORDER within a date is irrelevant to them.
 *
 * The one thing the `time` path ALSO changes is the interval-range boundaries:
 * with a `date_range` set Fava computes `dateranges(begin, end, interval,
 * complete=False)` instead of spanning the first/last transaction
 * (`FilteredLedger.interval_ranges`). That boundary change lives in
 * `interval-series.ts` (`intervalRanges(..., { complete })`); this module only
 * produces the directives.
 *
 * @see fava/core/filters.py::TimeFilter.apply
 * @see beancount/ops/summarize.py (clamp / clamp_opt / summarize / transfer_balances /
 *   conversions / truncate / balance_by_account / create_entries_from_balances /
 *   get_open_entries)
 * @see beancount/core/prices.py::get_last_price_entries
 * @see beancount/core/convert.py::get_cost
 */

const Amount = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

interface ScaledDecimal {
  value: BigNumber;
  scale: number;
}

function scaleOf(source: string): number {
  const dot = source.indexOf(".");
  if (dot === -1) return 0;
  const exponent = source.search(/[eE]/u);
  const end = exponent === -1 ? source.length : exponent;
  return Math.max(end - dot - 1, 0);
}

function fromSource(source: string): ScaledDecimal {
  return { value: new Amount(source), scale: scaleOf(source) };
}

function addScaled(left: ScaledDecimal, right: ScaledDecimal): ScaledDecimal {
  return {
    value: left.value.plus(right.value),
    scale: Math.max(left.scale, right.scale),
  };
}

function multiplyScaled(
  left: ScaledDecimal,
  right: ScaledDecimal,
): ScaledDecimal {
  return {
    value: left.value.times(right.value),
    scale: left.scale + right.scale,
  };
}

function negateScaled(decimal: ScaledDecimal): ScaledDecimal {
  return { value: decimal.value.negated(), scale: decimal.scale };
}

function formatScaled(decimal: ScaledDecimal): string {
  return decimal.value.toFixed(decimal.scale);
}

/**
 * The beancount option account names used by `clamp_opt`, defaulted to
 * beancount's `OPTIONS_DEFAULTS` (the rustledger WASM does not expose overrides
 * of these; see `ledger-finance-service.ts::ROOTS`). Each is `<name_equity>` +
 * the leaf option, joined with `:` (`options.get_previous_accounts` /
 * `get_current_accounts`).
 *
 * beancount defaults (`beancount/parser/options.py`):
 *   name_equity                    = "Equity"
 *   account_previous_earnings      = "Earnings:Previous"    → Equity:Earnings:Previous
 *   account_previous_balances      = "Opening-Balances"     → Equity:Opening-Balances
 *   account_current_conversions    = "Conversions:Current"  → Equity:Conversions:Current
 *   conversion_currency            = "NOTHING"
 *
 * `name_income` / `name_expenses` drive the income-statement-account predicate
 * (`is_income_statement_account`), defaulting to "Income" / "Expenses".
 */
export interface ClampAccountOptions {
  /** `name_income` — income root (income-statement predicate). */
  nameIncome: string;
  /** `name_expenses` — expenses root (income-statement predicate). */
  nameExpenses: string;
  /** `Equity:Earnings:Previous` — retained-earnings transfer target. */
  accountPreviousEarnings: string;
  /** `Equity:Opening-Balances` — opening-balances summarization target. */
  accountPreviousBalances: string;
  /** `Equity:Conversions:Current` — end-of-period conversion target. */
  accountCurrentConversions: string;
  /** `conversion_currency` — zero-price currency for conversion legs. */
  conversionCurrency: string;
}

/** beancount `OPTIONS_DEFAULTS` for the clamp account names. */
export const DEFAULT_CLAMP_ACCOUNTS: ClampAccountOptions = {
  nameIncome: "Income",
  nameExpenses: "Expenses",
  accountPreviousEarnings: "Equity:Earnings:Previous",
  accountPreviousBalances: "Equity:Opening-Balances",
  accountCurrentConversions: "Equity:Conversions:Current",
  conversionCurrency: "NOTHING",
};

// beancount `flags` used on the synthetic transactions (for parity of the
// emitted `flag` field). Downstream balance-summing ignores the flag, but the
// chart code excludes `FLAG_UNREALIZED` ("U") — none of these are that flag.
const FLAG_SUMMARIZE = "S";
const FLAG_TRANSFER = "T";
const FLAG_CONVERSIONS = "C";

// ── Cost-aware inventory ─────────────────────────────────────────────────────

/**
 * A resolved lot cost. Mirrors beancount's `Cost` NamedTuple
 * (`beancount/core/position.py`): a per-unit `number`, `currency`, acquisition
 * `date`, and optional `label`. In a booked ledger the rustledger WASM emits a
 * `PostingCostJson` whose `number` is a resolved `per_unit` value.
 */
interface Cost {
  number: ScaledDecimal;
  currency: string;
  date: string | null;
  label: string | null;
}

/** A position: units amount + optional cost lot (beancount `Position`). */
interface Position {
  number: ScaledDecimal;
  currency: string;
  cost: Cost | null;
}

/**
 * The inventory lot key — `(units.currency, Cost)` in beancount
 * (`inventory.add_amount`: `key = (units.currency, cost)`). We flatten `Cost` to
 * its structural components so value-equality works as a Map string key.
 */
function lotKey(currency: string, cost: Cost | null): string {
  if (cost === null) return `${currency}\0`;
  return [
    currency,
    cost.number.value.toFixed(),
    cost.currency,
    cost.date ?? "",
    cost.label ?? "",
  ].join("\0");
}

/**
 * A per-account inventory keyed by lot. Augments/reduces like beancount's
 * `Inventory.add_amount`: same lot ⇒ add numbers, delete on zero.
 */
class Inventory {
  private readonly positions = new Map<string, Position>();

  public addPosition(
    number: ScaledDecimal,
    currency: string,
    cost: Cost | null,
  ): void {
    const key = lotKey(currency, cost);
    const existing = this.positions.get(key);
    if (existing) {
      const sum = addScaled(existing.number, number);
      if (sum.value.isZero()) this.positions.delete(key);
      else this.positions.set(key, { number: sum, currency, cost });
    } else if (!number.value.isZero()) {
      this.positions.set(key, { number, currency, cost });
    }
  }

  public isEmpty(): boolean {
    return this.positions.size === 0;
  }

  /** Positions in a stable order (lot-key sorted) for deterministic output. */
  public getPositions(): Position[] {
    return [...this.positions.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([, pos]) => pos);
  }

  /** `inventory.reduce(convert.get_cost)`: collapse every lot to cost units. */
  public reduceToCost(): Inventory {
    const reduced = new Inventory();
    this.positions.forEach((position) => {
      const cost = positionCost(position);
      reduced.addPosition(cost.number, cost.currency, null);
    });
    return reduced;
  }
}

/** `convert.get_cost(position)` — total cost, or the units if no cost lot. */
function positionCost(pos: Position): {
  number: ScaledDecimal;
  currency: string;
} {
  if (pos.cost !== null) {
    return {
      number: multiplyScaled(pos.cost.number, pos.number),
      currency: pos.cost.currency,
    };
  }
  return { number: pos.number, currency: pos.currency };
}

/** Resolve a rustledger `PostingJson.cost` to a {@link Cost}, or `null`. */
function resolveCost(posting: PostingJson): Cost | null {
  const cost = posting.cost;
  // A cost with no resolvable number is not a held-at-cost lot for balance
  // purposes (beancount treats an unbooked `{}` cost as `None` post-booking).
  if (!cost || cost.number === undefined || cost.currency === undefined)
    return null;
  const number = costNumberPerUnit(cost.number, posting.units?.number);
  if (number === null) return null;
  return {
    number,
    currency: cost.currency,
    date: cost.date ?? null,
    label: cost.label ?? null,
  };
}

/**
 * Extract the per-unit cost from a rustledger `CostNumberJson`. A *booked*
 * ledger resolves costs to `per_unit`; we also accept the pre-booking variants
 * for robustness (`per_unit_from_total` carries the derived per-unit).
 */
function costNumberPerUnit(
  costNumber: NonNullable<PostingJson["cost"]>["number"],
  unitsNumber: string | undefined,
): ScaledDecimal | null {
  if (costNumber === undefined) return null;
  switch (costNumber.kind) {
    case "per_unit":
      return fromSource(costNumber.value);
    case "per_unit_from_total":
      return fromSource(costNumber.per_unit);
    case "total": {
      // beancount CostSpec booking: per-unit = total / ABS(units) — see
      // `perUnitFromTotalCost` (should not occur in a booked ledger; `null`
      // without a usable unit count).
      const perUnit = perUnitFromTotalCost(costNumber.value, unitsNumber);
      if (perUnit === null || unitsNumber === undefined) return null;
      const idealScale = Math.max(
        scaleOf(costNumber.value) - scaleOf(unitsNumber),
        0,
      );
      return {
        value: perUnit,
        scale: Math.max(perUnit.decimalPlaces() ?? 0, idealScale),
      };
    }
    case "compound":
      // Post-booking a compound resolves to per_unit; if we ever see one raw,
      // use the per_unit component.
      return fromSource(costNumber.per_unit);
    default:
      return null;
  }
}

// ── balance_by_account ───────────────────────────────────────────────────────

/**
 * `summarize.balance_by_account(entries, date)` — sum every transaction posting
 * into a per-account cost-aware inventory, for entries STRICTLY BEFORE `date`
 * (dates are ISO strings, so string `<` equals chronological `<`).
 */
function balanceByAccount(
  directives: DirectiveJson[],
  date: string,
): Map<string, Inventory> {
  const balances = new Map<string, Inventory>();
  for (const directive of directives) {
    if (directive.date >= date) break;
    if (directive.type !== "transaction") continue;
    for (const posting of directive.postings) {
      if (!posting.units) continue;
      let inv = balances.get(posting.account);
      if (!inv) {
        inv = new Inventory();
        balances.set(posting.account, inv);
      }
      inv.addPosition(
        fromSource(posting.units.number),
        posting.units.currency,
        resolveCost(posting),
      );
    }
  }
  return balances;
}

/**
 * `summarize.balance_by_account` returns the index of the first entry on/after
 * `date`. Directives are date-sorted, so this is the first index with
 * `date >= cutoff`.
 */
function indexOnOrAfter(directives: DirectiveJson[], date: string): number {
  for (let i = 0; i < directives.length; i += 1) {
    if (directives[i].date >= date) return i;
  }
  return directives.length;
}

// ── create_entries_from_balances ─────────────────────────────────────────────

/** A synthetic summarization/transfer transaction. */
type SyntheticTransaction = Extract<DirectiveJson, { type: "transaction" }>;

function buildPosting(
  account: string,
  units: AmountValue,
  cost: Cost | null,
): PostingJson {
  const posting: PostingJson = { account, units };
  if (cost !== null) {
    posting.cost = {
      number: { kind: "per_unit", value: formatScaled(cost.number) },
      currency: cost.currency,
      ...(cost.date !== null ? { date: cost.date } : {}),
      ...(cost.label !== null ? { label: cost.label } : {}),
    };
  }
  return posting;
}

/**
 * `summarize.create_entries_from_balances(balances, date, source_account,
 * direction, ...)`. For each non-empty account inventory (in account-sorted
 * order) build one transaction: a leg per position (units + cost) on `account`,
 * and a balancing leg for the position's total cost on `source_account`. When
 * `direction` is false the whole inventory is negated first (transfer FROM the
 * accounts INTO the source).
 */
function createEntriesFromBalances(
  balances: Map<string, Inventory>,
  date: string,
  sourceAccount: string,
  direction: boolean,
  flag: string,
  narrationTemplate: (account: string) => string,
): SyntheticTransaction[] {
  const entries: SyntheticTransaction[] = [];
  const accounts = [...balances.keys()].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  for (const account of accounts) {
    const inventory = balances.get(account);
    if (!inventory || inventory.isEmpty()) continue;

    const postings: PostingJson[] = [];
    for (const position of inventory.getPositions()) {
      // `direction` false ⇒ negate the balance being moved.
      const unitsNumber = direction
        ? position.number
        : negateScaled(position.number);
      const units: AmountValue = {
        number: formatScaled(unitsNumber),
        currency: position.currency,
      };
      postings.push(buildPosting(account, units, position.cost));

      // Balancing leg: `-convert.get_cost(position)` (with the same direction).
      const cost = positionCost(position);
      const costNumber = direction ? negateScaled(cost.number) : cost.number;
      postings.push(
        buildPosting(
          sourceAccount,
          { number: formatScaled(costNumber), currency: cost.currency },
          null,
        ),
      );
    }

    entries.push({
      type: "transaction",
      date,
      flag,
      narration: narrationTemplate(account),
      tags: [],
      links: [],
      postings,
    });
  }
  return entries;
}

// ── transfer_balances ────────────────────────────────────────────────────────

function isIncomeStatementAccount(
  account: string,
  opts: ClampAccountOptions,
): boolean {
  const type = account.split(":", 1)[0];
  return type === opts.nameIncome || type === opts.nameExpenses;
}

/**
 * `summarize.transfer_balances(entries, date, income_pred, transfer_account)`.
 * Move the balance of every income-statement account (at `date`) into
 * `transfer_account`, via a synthetic transaction dated `date - 1 day`
 * (`direction=False`). Also drops any `Balance` assertion after the cutoff on a
 * transferred account (they would break); balance-summing ignores those anyway,
 * but we replicate the removal for faithful directive output.
 */
function transferBalances(
  directives: DirectiveJson[],
  date: string,
  opts: ClampAccountOptions,
): DirectiveJson[] {
  if (directives.length === 0) return directives;

  const balances = balanceByAccount(directives, date);
  const index = indexOnOrAfter(directives, date);

  const transferBalancesMap = new Map<string, Inventory>();
  balances.forEach((inv, account) => {
    if (isIncomeStatementAccount(account, opts)) {
      // Beancount transfers the raw lot inventory. Reducing to cost here would
      // move USD while leaving the original HOOL lot behind, so units/at_value
      // reports over the clamped stream would show phantom income balances.
      transferBalancesMap.set(account, inv);
    }
  });

  const transferDate = previousDay(date);
  const transferEntries = createEntriesFromBalances(
    transferBalancesMap,
    transferDate,
    opts.accountPreviousEarnings,
    false,
    FLAG_TRANSFER,
    (account) => `Transfer balance for '${account}' (Transfer balance)`,
  );

  const afterEntries = directives
    .slice(index)
    .filter(
      (entry) =>
        !(entry.type === "balance" && transferBalancesMap.has(entry.account)),
    );

  return [...directives.slice(0, index), ...transferEntries, ...afterEntries];
}

// ── summarize ────────────────────────────────────────────────────────────────

/** `summarize.get_open_entries(entries, date)` — active Opens before `date`. */
function getOpenEntries(
  directives: DirectiveJson[],
  date: string,
): DirectiveJson[] {
  // account → [index, openDirective]; keep the earliest-dated open per account.
  const openEntries = new Map<
    string,
    { index: number; directive: DirectiveJson }
  >();
  for (let index = 0; index < directives.length; index += 1) {
    const entry = directives[index];
    if (entry.date >= date) break;
    if (entry.type === "open") {
      const existing = openEntries.get(entry.account);
      if (existing) {
        if (entry.date < existing.directive.date) {
          openEntries.set(entry.account, { index, directive: entry });
        }
      } else {
        openEntries.set(entry.account, { index, directive: entry });
      }
    } else if (entry.type === "close") {
      openEntries.delete(entry.account);
    }
  }
  return [...openEntries.values()]
    .sort((a, b) => a.index - b.index)
    .map((e) => e.directive);
}

/** `prices.get_last_price_entries(entries, date)` — last Price per pair. */
function getLastPriceEntries(
  directives: DirectiveJson[],
  date: string,
): DirectiveJson[] {
  const priceMap = new Map<
    string,
    { directive: DirectiveJson; index: number }
  >();
  for (const [index, entry] of directives.entries()) {
    if (entry.date >= date) break;
    if (entry.type === "price") {
      priceMap.set(`${entry.currency}\0${entry.amount.currency}`, {
        directive: entry,
        index,
      });
    }
  }
  return [...priceMap.values()]
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.directive);
}

const DIRECTIVE_SORT_ORDER: Partial<Record<DirectiveJson["type"], number>> = {
  open: -2,
  balance: -1,
  document: 1,
  close: 2,
};

/** Beancount `entry_sortkey`: date, directive type order, then source order. */
function sortByEntrySortKey(directives: DirectiveJson[]): DirectiveJson[] {
  return directives
    .map((directive, index) => ({ directive, index }))
    .sort((left, right) => {
      const dateOrder = left.directive.date.localeCompare(right.directive.date);
      if (dateOrder !== 0) return dateOrder;
      const typeOrder =
        (DIRECTIVE_SORT_ORDER[left.directive.type] ?? 0) -
        (DIRECTIVE_SORT_ORDER[right.directive.type] ?? 0);
      return typeOrder !== 0 ? typeOrder : left.index - right.index;
    })
    .map((entry) => entry.directive);
}

/**
 * `summarize.summarize(entries, date, account_opening)` — replace all pre-`date`
 * activity with per-account opening-balance transactions (dated `date - 1`),
 * preserving active Opens and the last Price per pair. Returns the new directive
 * list. (We don't need the returned index for balance summing.)
 */
function summarizeBefore(
  directives: DirectiveJson[],
  date: string,
  accountOpening: string,
): DirectiveJson[] {
  const balances = balanceByAccount(directives, date);
  const index = indexOnOrAfter(directives, date);
  const summarizeDate = previousDay(date);

  const summarizingEntries = createEntriesFromBalances(
    balances,
    summarizeDate,
    accountOpening,
    true,
    FLAG_SUMMARIZE,
    (account) => `Opening balance for '${account}' (Summarization)`,
  );

  const priceEntries = getLastPriceEntries(directives, date);
  const openEntries = getOpenEntries(directives, date);

  // This clamped stream also feeds journals/plaintext exports, whose display
  // order is user-visible, so preserve Fava's exact pre-cutoff sort shape.
  const beforeEntries = sortByEntrySortKey([
    ...openEntries,
    ...priceEntries,
    ...summarizingEntries,
  ]);
  const afterEntries = directives.slice(index);
  return [...beforeEntries, ...afterEntries];
}

// ── truncate ─────────────────────────────────────────────────────────────────

/** `summarize.truncate(entries, date)` — keep entries strictly before `date`. */
function truncate(directives: DirectiveJson[], date: string): DirectiveJson[] {
  return directives.filter((entry) => entry.date < date);
}

// ── conversions ──────────────────────────────────────────────────────────────

/**
 * `summarize.conversions(entries, conversion_account, conversion_currency,
 * date)`. If the residual cost balance across ALL postings (before `date`) is
 * non-empty, insert one synthetic conversion transaction (dated `date - 1`)
 * whose legs zero it out at a zero price in `conversion_currency`. For a
 * single-currency ledger the residual is empty and this is a no-op — the common
 * case.
 */
function conversions(
  directives: DirectiveJson[],
  conversionAccount: string,
  conversionCurrency: string,
  date: string,
): DirectiveJson[] {
  // compute_entries_balance reduced by cost — the net cost across all postings.
  const costBalance = new Map<string, ScaledDecimal>();
  for (const entry of directives) {
    if (entry.date >= date) break;
    if (entry.type !== "transaction") continue;
    for (const posting of entry.postings) {
      if (!posting.units) continue;
      const pos: Position = {
        number: fromSource(posting.units.number),
        currency: posting.units.currency,
        cost: resolveCost(posting),
      };
      const cost = positionCost(pos);
      const existing = costBalance.get(cost.currency);
      costBalance.set(
        cost.currency,
        existing ? addScaled(existing, cost.number) : cost.number,
      );
    }
  }

  // Drop net-zero currencies (Inventory.reduce/is_empty semantics).
  const nonZero = [...costBalance.entries()].filter(
    ([, number]) => !number.value.isZero(),
  );
  if (nonZero.length === 0) return directives;

  const lastDate = previousDay(date);
  // Negated residual, at a zero price in the conversion currency.
  const postings: PostingJson[] = nonZero
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([currency, number]) => ({
      account: conversionAccount,
      units: { number: formatScaled(negateScaled(number)), currency },
      price: { number: "0", currency: conversionCurrency },
    }));

  const conversionEntry: DirectiveJson = {
    type: "transaction",
    date: lastDate,
    flag: FLAG_CONVERSIONS,
    narration: `Conversion for ${describeBalance(nonZero)}`,
    tags: [],
    links: [],
    postings,
  };

  // Insert before the first entry on/after `date` (i.e. at the truncation end).
  const index = indexOnOrAfter(directives, date);
  return [
    ...directives.slice(0, index),
    conversionEntry,
    ...directives.slice(index),
  ];
}

function describeBalance(entries: Array<[string, ScaledDecimal]>): string {
  return entries
    .map(([currency, number]) => `${formatScaled(number)} ${currency}`)
    .join(", ");
}

// ── date helper ──────────────────────────────────────────────────────────────

/** `date - 1 day`, as an ISO `YYYY-MM-DD` string (UTC, no TZ drift). */
function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map((p) => Number.parseInt(p, 10));
  const dt = utcDate(y, m - 1, d - 1);
  const pad = (n: number, w: number): string => String(n).padStart(w, "0");
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;
}

// ── clamp (public) ───────────────────────────────────────────────────────────

/**
 * `summarize.clamp(entries, begin, end, ...)` — the four-step summarization that
 * Fava's `TimeFilter` applies. `begin`/`end` are ISO `YYYY-MM-DD` (inclusive
 * begin, exclusive end), as produced by {@link "./directive-filter".parseDateRange}.
 *
 * The input MUST be the account/advanced-filtered, date-sorted directive stream
 * (Fava applies account/advanced filters BEFORE the time filter). The output is
 * the clamped stream ready to feed the chart/hierarchy helpers.
 */
export function clampDirectives(
  directives: DirectiveJson[],
  begin: string,
  end: string,
  accounts: ClampAccountOptions = DEFAULT_CLAMP_ACCOUNTS,
): DirectiveJson[] {
  // 1. Transfer pre-period income/expenses to retained earnings.
  let entries = transferBalances(directives, begin, accounts);
  // 2. Summarize all pre-period balances into opening entries.
  entries = summarizeBefore(entries, begin, accounts.accountPreviousBalances);
  // 3. Truncate entries on/after the end date.
  entries = truncate(entries, end);
  // 4. Insert conversion entries to zero the residual cost balance.
  entries = conversions(
    entries,
    accounts.accountCurrentConversions,
    accounts.conversionCurrency,
    end,
  );
  return entries;
}
