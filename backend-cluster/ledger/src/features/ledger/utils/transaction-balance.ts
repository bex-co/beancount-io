import BigNumber from "bignumber.js";

/**
 * Beancount-style transaction balance validation for the bulk-entries write
 * path (w2/m26): a transaction with a non-zero residual is refused unless the
 * caller opts in, and one posting per transaction may omit its amount.
 *
 * Tolerance is Beancount's inference (`infer_tolerances`): a posting number
 * with decimals implies half its last digit (10.00 → 0.005) and a whole number
 * implies none. A currency's tolerance is the largest implied value, raised to
 * the ledger's `inferred_tolerance_default` for that currency; a currency with
 * none implied takes its own default, else the `*` default, else zero. There
 * is no 0.005 floor, and `10 USD` gives no 0.5 (w21/648). Arithmetic is exact
 * (`BigNumber` over the decimal strings) — never binary floating point.
 */

/** `option "inferred_tolerance_default"`: a currency, or `*`, to its tolerance. */
export type ToleranceDefaults = ReadonlyMap<string, BigNumber>;

const NO_TOLERANCE_DEFAULTS: ToleranceDefaults = new Map();

export type BalancePosting = {
  account: string;
  units?: { number: string; currency: string } | null;
  /** A per-unit price (`@`): the posting weighs units × price, in its currency. */
  price?: { number: string; currency: string } | null;
  /** A cost spec (`{}`): the posting weighs units × cost, in its currency. */
  cost?: { number: string; currency: string } | null;
  /** A total price (`@@`): the posting weighs it at face value, in its currency. */
  totalPrice?: { number: string; currency: string } | null;
};

export type BalanceFailure =
  | {
      kind: "elided-count";
      message: string;
    }
  | {
      kind: "uninterpolatable";
      message: string;
    }
  | {
      kind: "unbalanced";
      message: string;
      /** One `"<amount> <CURRENCY>"` per offending currency. */
      residuals: string[];
    };

/** Decimals implied by a literal (`"124.6845"` → 4, `"10"` → 0). */
function impliedDecimals(literal: string): number {
  const match = /^-?\d+(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal.trim());
  if (!match) return 0;
  const frac = match[1] ?? "";
  const exp = match[2] !== undefined ? Number(match[2]) : 0;
  return Math.max(0, frac.length - exp);
}

function halfUnit(decimals: number): BigNumber {
  return new BigNumber(0.5).times(new BigNumber(10).pow(-decimals));
}

/** A currency's tolerance, as Beancount resolves it from the two sources. */
function toleranceFor(
  currency: string,
  implied: BigNumber | undefined,
  defaults: ToleranceDefaults,
): BigNumber {
  const own = defaults.get(currency);
  if (implied === undefined) {
    return own ?? defaults.get("*") ?? new BigNumber(0);
  }
  return own === undefined ? implied : BigNumber.max(implied, own);
}

/**
 * Format a residual with the precision of the postings that produced it, so
 * `10 USD`/`-5 USD` reads `5 USD` while `10.00 USD`/`-5.00 USD` reads
 * `5.00 USD`. Signed, as both engines print it.
 */
function formatResidual(value: BigNumber, decimals: number): string {
  return value.toFixed(decimals);
}

/** A decimal string as a number; NaN for anything else (never a throw). */
function decimal(number: string): BigNumber {
  // bignumber.js 11 throws on a malformed string where earlier versions
  // returned NaN; either way it is the caller's input, never an outage.
  try {
    return new BigNumber(number);
  } catch {
    return new BigNumber(NaN);
  }
}

/**
 * Scan raw file contents for `option "inferred_tolerance_default"
 * "<CURRENCY>:<tolerance>"` declarations, Beancount lexer semantics (quoted
 * name and value). Each adds one currency (or `*`); a later one for the same
 * currency wins. A bare number is not Beancount syntax, and both engines
 * report and ignore it, so it is ignored here too. Only files the bulk
 * endpoint already fetched are scanned — a declaration living in an unrelated
 * file is missed, noted at the call site.
 */
export function scanInferredToleranceDefaults(
  contents: string[],
): ToleranceDefaults {
  const defaults = new Map<string, BigNumber>();
  for (const content of contents) {
    for (const line of content.split("\n")) {
      const value =
        /^\s*option\s+"inferred_tolerance_default"\s+"([^"]+)"\s*(;.*)?$/.exec(
          line,
        )?.[1];
      const entry =
        value === undefined
          ? null
          : /^\s*([^:\s]+)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
      if (entry) defaults.set(entry[1], new BigNumber(entry[2]));
    }
  }
  return defaults;
}

export type CheckedTransaction = {
  /** Per-currency residuals before tolerance, for error detail. */
  residuals: { currency: string; amount: BigNumber; decimals: number }[];
};

/**
 * Validate one transaction's postings. Returns the residuals so the caller
 * can name them in the refusal; throws nothing — failures are values.
 */
export function checkTransactionBalance(
  postings: BalancePosting[],
  toleranceDefaults: ToleranceDefaults = NO_TOLERANCE_DEFAULTS,
):
  | { ok: true; value: CheckedTransaction }
  | { ok: false; value: BalanceFailure } {
  const elided = postings.filter(
    (posting) => posting.units === undefined || posting.units === null,
  );
  if (elided.length > 1) {
    return {
      ok: false,
      value: {
        kind: "elided-count",
        message: `at most one posting may omit its amount, found ${elided.length}`,
      },
    };
  }

  const sums = new Map<string, BigNumber>();
  const decimals = new Map<string, number>();
  const inferred = new Map<string, BigNumber>();
  for (const posting of postings) {
    if (posting.units === undefined || posting.units === null) continue;
    const { number, currency } = posting.units;
    const amount = decimal(number);
    const price = posting.price ? decimal(posting.price.number) : undefined;
    const cost = posting.cost ? decimal(posting.cost.number) : undefined;
    const total =
      posting.totalPrice ? decimal(posting.totalPrice.number) : undefined;
    if (
      !amount.isFinite() ||
      (price !== undefined && !price.isFinite()) ||
      (cost !== undefined && !cost.isFinite()) ||
      (total !== undefined && !total.isFinite())
    ) {
      const bad = !amount.isFinite()
        ? posting.units
        : price !== undefined && !price.isFinite()
          ? posting.price!
          : cost !== undefined && !cost.isFinite()
            ? posting.cost!
            : posting.totalPrice!;
      return {
        ok: false,
        value: {
          kind: "unbalanced",
          message: `posting amount "${bad.number} ${bad.currency}" is not a number`,
          residuals: [`${bad.number} ${bad.currency}`],
        },
      };
    }
    const places = impliedDecimals(number);
    // Stock's get_weight precedence (w21/647 did price; w23/163 cost and
    // total): a cost posting weighs units × cost in the cost's currency, a
    // total-price posting weighs its face value, a priced posting units ×
    // price. Cost wins over a co-present price, as Beancount balances it.
    let weightCurrency = currency;
    let weight = amount;
    let weightPlaces = places;
    if (posting.price && price !== undefined) {
      weightCurrency = posting.price.currency;
      weight = amount.times(price);
      weightPlaces = places + impliedDecimals(posting.price.number);
    }
    if (posting.totalPrice && total !== undefined) {
      weightCurrency = posting.totalPrice.currency;
      weight = total;
      weightPlaces = impliedDecimals(posting.totalPrice.number);
    }
    if (posting.cost && cost !== undefined) {
      weightCurrency = posting.cost.currency;
      weight = amount.times(cost);
      weightPlaces = places + impliedDecimals(posting.cost.number);
    }
    sums.set(
      weightCurrency,
      (sums.get(weightCurrency) ?? new BigNumber(0)).plus(weight),
    );
    decimals.set(
      weightCurrency,
      Math.max(decimals.get(weightCurrency) ?? 0, weightPlaces),
    );
    // A whole number implies no tolerance at all.
    if (places === 0) continue;
    const candidate = halfUnit(places);
    const best = inferred.get(currency);
    if (!best || candidate.isGreaterThan(best))
      inferred.set(currency, candidate);
  }

  const residuals: CheckedTransaction["residuals"] = [];
  for (const [currency, sum] of sums) {
    if (!sum.isZero()) {
      residuals.push({
        currency,
        amount: sum,
        decimals: decimals.get(currency) ?? 0,
      });
    }
  }

  if (elided.length === 1) {
    if (residuals.length === 0) {
      return {
        ok: false,
        value: {
          kind: "uninterpolatable",
          message:
            "transaction already balances; an omitted amount needs a non-zero residual to interpolate",
        },
      };
    }
    if (residuals.length > 1) {
      return {
        ok: false,
        value: {
          kind: "uninterpolatable",
          message: `cannot interpolate one omitted amount across multiple currencies (${residuals.map((residual) => residual.currency).join(", ")})`,
        },
      };
    }
    // Exactly one currency is off: the omitted amount is its negation, so the
    // transaction balances by construction. Nothing further to check.
    return { ok: true, value: { residuals: [] } };
  }

  const offending = residuals.filter((residual) =>
    residual.amount
      .abs()
      .isGreaterThan(
        toleranceFor(
          residual.currency,
          inferred.get(residual.currency),
          toleranceDefaults,
        ),
      ),
  );
  if (offending.length === 0) return { ok: true, value: { residuals: [] } };
  const rendered = offending.map(
    (residual) =>
      `${formatResidual(residual.amount, residual.decimals)} ${residual.currency}`,
  );
  return {
    ok: false,
    value: {
      kind: "unbalanced",
      message: `Transaction does not balance: residual ${rendered.join(", ")}`,
      residuals: rendered,
    },
  };
}
