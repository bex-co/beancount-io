import BigNumber from "bignumber.js";
import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import { perUnitFromTotalCost } from "./total-cost";
import { divideWithPythonDecimalContext } from "./decimal-context";

/**
 * Account journal with per-entry change and running balance — a faithful port
 * of fava-slim's `FavaLedger.account_journal` (see
 * `beancount-ledger/fava-slim/fava/ledger.py`) plus the response mapping in
 * `beancount-ledger/server/app/api/journal.py::get_account_journal`.
 *
 * For each directive that touches `account` (respecting `with_children`), we
 * emit the entry's own `change` (the postings to the account, converted) and
 * the running cumulative `balance` after that entry. Internally we mirror fava's
 * `CounterInventory` — keyed by `(currency, cost)` — so the `at_cost` conversion
 * can multiply each lot's per-unit cost by its units, exactly like fava's
 * `cost_or_value` → `get_cost`.
 *
 * IMPORTANT — decimal formatting: fava stringifies the resulting Python
 * `Decimal` with `f"{amount}"`, which preserves the number's *scale* (trailing
 * zeros). Python's `Decimal` scale rules are: add/subtract take the max scale of
 * the operands, multiply sums the operand scales, and negate preserves scale. A
 * plain `bignumber.js` value cannot reproduce this (it strips trailing zeros on
 * construction), so we track the scale alongside the coefficient and format with
 * `.toFixed(scale)` — yielding byte-identical strings to the Python golden
 * (`"1000.00"`, `"15"`, `"-50.00"`).
 *
 * The three reserved conversions plus explicit currency targets are
 * implemented: `units`, `at_cost` (the endpoint default), `at_value`, and a
 * bare currency/code list (`USD` / `USD,EUR`). `at_value` mirrors fava's `_AtValueConversion` →
 * `get_market_value`: each lot with a cost is valued in its *cost currency* using
 * the market price `(units.currency → cost.currency)` as-of the entry date (with
 * an at-cost fallback when no price exists), and cost-less lots pass through as
 * units. It requires a {@link ScaledPriceMap} (a price lookup that PRESERVES each
 * price's source scale, since `Decimal` multiplication sums operand scales) plus
 * the entry's own date. Currency targets mirror `convert_position`, including
 * cost-currency and price-map fallbacks.
 */

const Coefficient = BigNumber.clone({
  DECIMAL_PLACES: 40,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

/** A decimal that tracks its Python-`Decimal`-style scale (fractional digits). */
interface ScaledDecimal {
  value: BigNumber;
  scale: number;
}

/** Number of fractional digits in a source number string ("100.00" -> 2). */
function scaleOf(source: string): number {
  const dot = source.indexOf(".");
  if (dot === -1) return 0;
  // Guard against a trailing exponent (rustledger emits plain decimals, but be
  // defensive): count only the digits between the dot and any exponent marker.
  const exp = source.search(/[eE]/);
  const end = exp === -1 ? source.length : exp;
  return end - dot - 1;
}

function fromSource(source: string): ScaledDecimal {
  return { value: new Coefficient(source), scale: scaleOf(source) };
}

/** Python `Decimal.__add__`: value sum, scale = max(operand scales). */
function addScaled(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return { value: a.value.plus(b.value), scale: Math.max(a.scale, b.scale) };
}

/** Python `Decimal.__mul__`: value product, scale = sum of operand scales. */
function mulScaled(a: ScaledDecimal, b: ScaledDecimal): ScaledDecimal {
  return { value: a.value.times(b.value), scale: a.scale + b.scale };
}

/** Format like `str(Decimal)` — preserve scale as trailing zeros. */
function formatScaled(dec: ScaledDecimal): string {
  return dec.value.toFixed(dec.scale);
}

/** How a lot's units are valued when reduced to a `SimpleCounterInventory`. */
export type JournalConversion = string;

/**
 * A price lookup that preserves each price's source scale — the `at_value`
 * valuation multiplies `units.number * price_number`, and Python's `Decimal`
 * multiply SUMS the operand scales (`5 * Decimal("100.00") == Decimal("500.00")`),
 * so a scale-stripping `BigNumber` rate cannot reproduce fava's trailing zeros.
 * A faithful port of the subset of `fava.beans.prices.FavaPriceMap` that
 * `get_market_value` uses: keep the last rate per day, record inverse rates
 * (`ONE/rate`, full precision — matching fava), and return the latest point with
 * `date <= requested` (`bisect`-equivalent). `null` when no path exists.
 */
export interface ScaledPriceMap {
  getRate(base: string, quote: string, date: string): ScaledDecimal | null;
}

interface ScaledPricePoint {
  date: string;
  rate: ScaledDecimal;
}

/**
 * Build a {@link ScaledPriceMap} from a directive stream — the `at_value`
 * counterpart of {@link buildPriceMap} that keeps price scales. Mirrors
 * `FavaPriceMap.__init__`: for each `Price` directive record `(currency →
 * amount.currency, rate)` at the price's own source scale, plus the inverse
 * `(amount.currency → currency, ONE/rate)`; then sort per pair and keep the last
 * rate per day.
 */
export function buildScaledPriceMap(
  directives: DirectiveJson[],
): ScaledPriceMap {
  const raw = new Map<string, ScaledPricePoint[]>();
  const keyOf = (base: string, quote: string): string => `${base} ${quote}`;
  const add = (
    base: string,
    quote: string,
    date: string,
    rate: ScaledDecimal,
  ): void => {
    const k = keyOf(base, quote);
    const list = raw.get(k);
    if (list) list.push({ date, rate });
    else raw.set(k, [{ date, rate }]);
  };

  directives.forEach((directive) => {
    if (directive.type !== "price") return;
    const rate = fromSource(directive.amount.number);
    add(directive.currency, directive.amount.currency, directive.date, rate);
    if (!rate.value.isZero()) {
      const inverseValue = divideWithPythonDecimalContext(1, rate.value);
      const inverse: ScaledDecimal = {
        value: inverseValue,
        // Exact quotients such as 1 / 0.5 stringify as `2`, while repeating
        // quotients retain Coefficient's full precision. A fixed scale made
        // exact values visibly leak forty trailing zeroes into the API.
        scale: inverseValue.decimalPlaces() ?? 0,
      };
      add(
        directive.amount.currency,
        directive.currency,
        directive.date,
        inverse,
      );
    }
  });

  const map = new Map<string, ScaledPricePoint[]>();
  raw.forEach((points, k) => {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const perDay: ScaledPricePoint[] = [];
    sorted.forEach((point) => {
      const last = perDay[perDay.length - 1];
      if (last && last.date === point.date) perDay[perDay.length - 1] = point;
      else perDay.push(point);
    });
    map.set(k, perDay);
  });

  return {
    getRate(base: string, quote: string, date: string): ScaledDecimal | null {
      if (base === quote) return { value: new Coefficient(1), scale: 0 };
      const list = map.get(keyOf(base, quote));
      if (!list || list.length === 0) return null;
      let found: ScaledDecimal | null = null;
      for (const point of list) {
        if (point.date <= date) found = point.rate;
        else break;
      }
      return found;
    },
  };
}

/**
 * A `(currency, cost)`-keyed inventory mirroring fava's `CounterInventory`.
 * We keep the composite key so `at_cost` can recover each lot's per-unit cost;
 * `units` ignores the cost component. Net-zero keys are dropped on `add`, exactly
 * like fava's `add` (`new_num == ZERO -> pop`).
 */
interface Lot {
  units: ScaledDecimal;
  unitsCurrency: string;
  costPerUnit: ScaledDecimal | null;
  costCurrency: string | null;
}

/** Composite key: currency + serialized cost (per fava's `(currency, cost)`). */
function lotKey(posting: PostingJson): string {
  const unitsCurrency = posting.units?.currency ?? "";
  const cost = posting.cost;
  if (!cost) return `${unitsCurrency}\0`;
  const number = cost.number;
  let costValue = "";
  if (number) {
    const resolved = costPerUnitOf(posting);
    if (resolved !== null) {
      // Python Decimal equality ignores trailing-zero scale, so normalize the
      // effective per-unit number for the inventory key. A raw `total` must be
      // divided by abs(units) before it can share a lot with `per_unit`.
      costValue = resolved.value.toFixed();
    } else if (number.kind === "compound") {
      costValue = `compound:${number.per_unit}/${number.total}`;
    }
  }
  return `${unitsCurrency}\0${cost.currency ?? ""}\0${costValue}\0${cost.date ?? ""}\0${cost.label ?? ""}`;
}

/**
 * Resolve a posting's per-unit cost as a `ScaledDecimal`, matching fava's
 * `get_cost` which multiplies `cost.number * units.number`. rustledger already
 * books lots to a `per_unit` cost number; `per_unit_from_total` carries a
 * derived per-unit we can use directly. A raw `total` (should not survive
 * booking, but be defensive) resolves like beancount's CostSpec booking:
 * per-unit = `total / abs(units)` ({@link perUnitFromTotalCost} — dividing by
 * the SIGNED units would flip a reduction's valuation sign). `compound`
 * (unresolved) has no single per-unit value and is treated as "no cost" (falls
 * back to units — see notes).
 */
function costPerUnitOf(posting: PostingJson): ScaledDecimal | null {
  const cost = posting.cost;
  if (!cost || !cost.number) return null;
  const number = cost.number;
  switch (number.kind) {
    case "per_unit":
      return fromSource(number.value);
    case "total": {
      const unitsNumber = posting.units?.number;
      const perUnit = perUnitFromTotalCost(number.value, unitsNumber);
      if (perUnit === null || unitsNumber === undefined) return null;
      // Python `Decimal` division scale: an exact quotient keeps the IDEAL
      // exponent `scale(total) - scale(units)` (`Decimal('1000.00') /
      // Decimal('10') == Decimal('100.00')`), padding beyond the quotient's own
      // digits when needed; an inexact quotient keeps its computed places.
      const idealScale = Math.max(
        scaleOf(number.value) - scaleOf(unitsNumber),
        0,
      );
      return {
        value: perUnit,
        scale: Math.max(perUnit.decimalPlaces() ?? 0, idealScale),
      };
    }
    case "per_unit_from_total":
      return fromSource(number.per_unit);
    case "compound":
      return null;
    default:
      return null;
  }
}

class LotInventory {
  private readonly lots = new Map<string, Lot>();

  add(posting: PostingJson): void {
    if (!posting.units) return;
    const key = lotKey(posting);
    const incoming = fromSource(posting.units.number);
    const existing = this.lots.get(key);
    if (existing) {
      const sum = addScaled(existing.units, incoming);
      if (sum.value.isZero()) {
        this.lots.delete(key);
      } else {
        existing.units = sum;
      }
      return;
    }
    if (incoming.value.isZero()) return;
    const costCurrency = posting.cost?.currency ?? null;
    this.lots.set(key, {
      units: incoming,
      unitsCurrency: posting.units.currency,
      costPerUnit: costPerUnitOf(posting),
      costCurrency,
    });
  }

  /** Reduce to `currency -> string`, mirroring `cost_or_value` for the mode. */
  reduce(
    conversion: JournalConversion,
    valuation?: { prices: ScaledPriceMap; date: string },
  ): Record<string, string> {
    let totals = new Map<string, ScaledDecimal>();
    const addInto = (currency: string, amount: ScaledDecimal): void => {
      const prev = totals.get(currency);
      const next = prev ? addScaled(prev, amount) : amount;
      if (next.value.isZero()) totals.delete(currency);
      else totals.set(currency, next);
    };

    this.lots.forEach((lot) => {
      if (
        conversion === "at_cost" &&
        lot.costPerUnit !== null &&
        lot.costCurrency !== null
      ) {
        addInto(lot.costCurrency, mulScaled(lot.costPerUnit, lot.units));
      } else if (conversion === "at_value" && valuation) {
        this.reduceAtValue(lot, valuation, addInto);
      } else if (
        conversion !== "units" &&
        conversion !== "at_cost" &&
        valuation
      ) {
        this.reduceAtCurrency(
          lot,
          conversion.split(",")[0],
          valuation,
          addInto,
        );
      } else {
        addInto(lot.unitsCurrency, lot.units);
      }
    });

    if (
      conversion !== "units" &&
      conversion !== "at_cost" &&
      conversion !== "at_value" &&
      valuation
    ) {
      for (const target of conversion.split(",").slice(1)) {
        if (target.length === 0) continue;
        const next = new Map<string, ScaledDecimal>();
        totals.forEach((amount, currency) => {
          const rate = valuation.prices.getRate(
            currency,
            target,
            valuation.date,
          );
          const outputCurrency = rate === null ? currency : target;
          const outputAmount = rate === null ? amount : mulScaled(amount, rate);
          const previous = next.get(outputCurrency);
          const combined = previous
            ? addScaled(previous, outputAmount)
            : outputAmount;
          if (combined.value.isZero()) next.delete(outputCurrency);
          else next.set(outputCurrency, combined);
        });
        totals = next;
      }
    }

    const out: Record<string, string> = {};
    totals.forEach((amount, currency) => {
      if (!amount.value.isZero()) out[currency] = formatScaled(amount);
    });
    return out;
  }

  /**
   * Value one lot at market — a faithful port of `conversion.get_market_value`.
   * A lot WITH a cost is valued in its `cost.currency`: look up the price
   * `(units.currency → cost.currency)` as-of the entry date and multiply the
   * units by it; if no price exists, fall back to `units * cost.number` (the
   * at-cost value, in the cost currency). A cost-less lot passes through as its
   * units (fava returns `pos.units` unchanged).
   */
  private reduceAtValue(
    lot: Lot,
    valuation: { prices: ScaledPriceMap; date: string },
    addInto: (currency: string, amount: ScaledDecimal) => void,
  ): void {
    if (lot.costPerUnit === null || lot.costCurrency === null) {
      addInto(lot.unitsCurrency, lot.units);
      return;
    }
    const rate = valuation.prices.getRate(
      lot.unitsCurrency,
      lot.costCurrency,
      valuation.date,
    );
    if (rate !== null) {
      addInto(lot.costCurrency, mulScaled(lot.units, rate));
    } else {
      addInto(lot.costCurrency, mulScaled(lot.costPerUnit, lot.units));
    }
  }

  /** Fava `convert_position` for an explicit target/currency fallback list. */
  private reduceAtCurrency(
    lot: Lot,
    target: string,
    valuation: { prices: ScaledPriceMap; date: string },
    addInto: (currency: string, amount: ScaledDecimal) => void,
  ): void {
    const direct = valuation.prices.getRate(
      lot.unitsCurrency,
      target,
      valuation.date,
    );
    if (direct !== null) {
      addInto(target, mulScaled(lot.units, direct));
      return;
    }
    if (lot.costCurrency !== null && lot.costCurrency !== target) {
      const toCost = valuation.prices.getRate(
        lot.unitsCurrency,
        lot.costCurrency,
        valuation.date,
      );
      const costToTarget = valuation.prices.getRate(
        lot.costCurrency,
        target,
        valuation.date,
      );
      if (toCost !== null && costToTarget !== null) {
        addInto(target, mulScaled(mulScaled(lot.units, toCost), costToTarget));
        return;
      }
    }
    addInto(lot.unitsCurrency, lot.units);
  }
}

/** Whether an account matches, per fava's `account_tester`. */
function makeAccountTester(
  account: string,
  withChildren: boolean,
): (candidate: string) => boolean {
  if (withChildren) {
    const prefix = `${account}:`;
    return (candidate) => candidate === account || candidate.startsWith(prefix);
  }
  return (candidate) => candidate === account;
}

/**
 * Accounts referenced by a non-transaction directive, per fava's
 * `get_entry_accounts` (used only to decide relevance for entries without
 * postings — the change stays empty for those).
 */
function nonPostingAccounts(directive: DirectiveJson): string[] {
  switch (directive.type) {
    case "custom":
      return (directive.values ?? [])
        .filter((value) => value.type === "account")
        .map((value) => String(value.value));
    case "pad":
      return [directive.account, directive.source_account];
    case "open":
    case "close":
    case "balance":
    case "note":
    case "document":
      return [directive.account];
    default:
      return [];
  }
}

/** One row of the account journal: the entry plus its change and balance. */
export interface AccountJournalItem {
  entry: DirectiveJson;
  change: Record<string, string>;
  balance: Record<string, string>;
}

export interface AccountJournalOptions {
  withChildren?: boolean;
  /** Reduction mode; defaults to `at_cost` to match the endpoint default. */
  conversion?: JournalConversion;
  /**
   * Required for `at_value` and explicit currency conversion — the
   * scale-preserving price lookup
   * ({@link buildScaledPriceMap}), built from the FULL (unfiltered) directive
   * stream so a `time`-truncated future `Price` still values earlier lots, exactly
   * as fava values against `ledger.prices`. Each entry is valued as-of its OWN
   * date (fava passes `entry.date` to `cost_or_value`).
   */
  prices?: ScaledPriceMap;
}

/**
 * Build the account-journal rows for `account` — parity for `getAccountJournal`.
 *
 * Directives are consumed in their given (chronological) order, exactly as fava
 * iterates `filtered.entries`; the running `balance` accumulates across relevant
 * entries and `change` is that entry's own postings to the account. The result
 * preserves source order (the endpoint reverses + paginates downstream).
 *
 * NOTE on `entry`: the returned `entry` is the raw `DirectiveJson`. Serialising
 * it to the `JournalDirectiveTypePublic` DTO is the job of the journal-serialize
 * module (`serializeDirective`); the orchestrator wires that in. This module's
 * contract — and its golden tests — cover the `change`/`balance` numbers.
 */
export function accountJournalItems(
  directives: DirectiveJson[],
  account: string,
  opts: AccountJournalOptions = {},
): AccountJournalItem[] {
  const withChildren = opts.withChildren ?? true;
  const conversion = opts.conversion ?? "at_cost";
  const isRelevant = makeAccountTester(account, withChildren);

  const balance = new LotInventory();
  const items: AccountJournalItem[] = [];

  directives.forEach((directive) => {
    const change = new LotInventory();
    let entryIsRelevant = false;

    if (directive.type === "transaction") {
      directive.postings.forEach((posting) => {
        if (isRelevant(posting.account)) {
          entryIsRelevant = true;
          balance.add(posting);
          change.add(posting);
        }
      });
    } else if (nonPostingAccounts(directive).some(isRelevant)) {
      entryIsRelevant = true;
    }

    if (entryIsRelevant) {
      // `at_value` values each row as-of the entry's own date (fava passes
      // `entry.date` to `cost_or_value`); other modes ignore `valuation`.
      const valuation =
        conversion !== "units" && conversion !== "at_cost" && opts.prices
          ? { prices: opts.prices, date: directive.date }
          : undefined;
      items.push({
        entry: directive,
        change: change.reduce(conversion, valuation),
        balance: balance.reduce(conversion, valuation),
      });
    }
  });

  return items;
}
