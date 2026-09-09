import BigNumber from "bignumber.js";

/**
 * Beancount-style transaction balance validation for the bulk-entries write
 * path (w2/m26): a transaction with a non-zero residual is refused unless the
 * caller opts in, and one posting per transaction may omit its amount.
 *
 * Tolerance mirrors Beancount's inference: each posting number implies half
 * the value of its least-significant digit (10.00 → 0.005), the per-currency
 * tolerance is the largest implied value, floored by the ledger's
 * `inferred_tolerance_default` (Beancount default 0.005). Arithmetic is exact
 * (`BigNumber` over the decimal strings) — never binary floating point.
 */

export const DEFAULT_INFERRED_TOLERANCE = "0.005";

export type BalancePosting = {
  account: string;
  units?: { number: string; currency: string } | null;
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

/**
 * Format a residual with the precision of the postings that produced it, so
 * `10 USD`/`-5 USD` reads `5 USD` while `10.00 USD`/`-5.00 USD` reads
 * `5.00 USD`.
 */
function formatResidual(value: BigNumber, decimals: number): string {
  return value.abs().toFixed(decimals);
}

/**
 * Scan raw file contents for an `option "inferred_tolerance_default" "<n>"`
 * override, Beancount lexer semantics (quoted name and value). Only files the
 * bulk endpoint already fetched are scanned — an override living in an
 * unrelated file falls back to the default, noted at the call site.
 */
export function scanInferredToleranceDefault(
  contents: string[],
): string {
  for (const content of contents) {
    for (const line of content.split("\n")) {
      const match =
        /^\s*option\s+"inferred_tolerance_default"\s+"([^"]+)"\s*(;.*)?$/.exec(
          line,
        );
      if (match?.[1] && /^-?\d+(\.\d+)?$/.test(match[1].trim())) {
        return match[1].trim();
      }
    }
  }
  return DEFAULT_INFERRED_TOLERANCE;
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
  inferredToleranceDefault: string = DEFAULT_INFERRED_TOLERANCE,
): { ok: true; value: CheckedTransaction } | { ok: false; value: BalanceFailure } {
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
    const amount = new BigNumber(number);
    if (!amount.isFinite()) {
      return {
        ok: false,
        value: {
          kind: "unbalanced",
          message: `posting amount "${number} ${currency}" is not a number`,
          residuals: [`${number} ${currency}`],
        },
      };
    }
    sums.set(currency, (sums.get(currency) ?? new BigNumber(0)).plus(amount));
    const places = impliedDecimals(number);
    decimals.set(currency, Math.max(decimals.get(currency) ?? 0, places));
    const candidate = halfUnit(places);
    const best = inferred.get(currency);
    if (!best || candidate.isGreaterThan(best)) inferred.set(currency, candidate);
  }

  const floorParsed = new BigNumber(inferredToleranceDefault);
  const floor =
    floorParsed.isFinite() && floorParsed.isGreaterThanOrEqualTo(0)
      ? floorParsed
      : new BigNumber(DEFAULT_INFERRED_TOLERANCE);
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

  const offending = residuals.filter((residual) => {
    const tolerance = BigNumber.max(
      floor,
      inferred.get(residual.currency) ?? new BigNumber(0),
    );
    return residual.amount.abs().isGreaterThan(tolerance);
  });
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
