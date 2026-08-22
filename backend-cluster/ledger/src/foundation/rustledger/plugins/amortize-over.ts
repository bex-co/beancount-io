import BigNumber from "bignumber.js";
import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
} from "@rustledger/wasm";
import { pluginError, type PluginContext, type PluginResult } from "./types";
import { inheritDirectiveSourceId } from "./provenance";
import { utcDate } from "../utc-date";

/**
 * Port of fava's `amortize_over` plugin (MIT, Cary Kempston). A transaction
 * carrying an `amortize_months: N` metadata key is split into N monthly copies,
 * each dated `date + n months` with the amount divided into per-period portions
 * (`Decimal.quantize` rounding, residue carried by the iterative split), and
 * **future-dated copies (> today) are dropped** — so financial totals reflect
 * only the amortization that has occurred so far. A copy that is malformed
 * (≠ 2 postings, or neither posting having units) is passed through with an
 * error so malformed plugin input never silently disappears from reports. `N`
 * is capped at {@link MAX_AMORTIZE_MONTHS}; an over-cap transaction is likewise
 * passed through untransformed with a ledger error.
 *
 * Fidelity notes vs. the Python original:
 * - `amortize_months` serializes from the WASM as a plain string (`"3"`).
 * - Python interpolates the elided balancing posting before the plugin runs;
 *   rustledger does NOT (it emits the posting without `units`). We therefore
 *   derive either elided leg from the specified leg (a 2-posting amortized
 *   transaction is always balanced), and synthesize explicit units for both
 *   legs so downstream balances are correct either way.
 * - The number of decimal places is taken from the ORIGINAL amount string (not
 *   from BigNumber, which drops trailing zeros) so `600.00` amortizes to
 *   `200.00`, matching beancount's `quantize`.
 */

/** Decimal clone matching Python `Decimal` defaults (banker's rounding). */
const Amount = BigNumber.clone({
  DECIMAL_PLACES: 28,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;
type Posting = Transaction["postings"][number];

const META_KEY = "amortize_months";

/**
 * Hard cap on `amortize_months` — 1200 periods = 100 years. `amortize_months`
 * is user-authored ledger data, so an absurd value (`100000`) must degrade to a
 * ledger error on that transaction, not blow up report generation with an
 * unbounded split.
 */
export const MAX_AMORTIZE_MONTHS = 1200;

export function amortizeOver(
  directives: DirectiveJson[],
  _options: LedgerOptions,
  ctx: PluginContext,
): PluginResult {
  const out: DirectiveJson[] = [];
  const errors: BeancountError[] = [];
  directives.forEach((directive) => {
    if (
      directive.type === "transaction" &&
      directive.meta !== undefined &&
      META_KEY in directive.meta
    ) {
      const { entries, errs } = amortizeTransaction(directive, ctx.today);
      out.push(...entries);
      errors.push(...errs);
    } else {
      out.push(directive);
    }
  });
  return { directives: out, errors };
}

function amortizeTransaction(
  txn: Transaction,
  today: string,
): { entries: DirectiveJson[]; errs: BeancountError[] } {
  if (txn.postings.length !== 2) {
    return {
      entries: [txn],
      errs: [
        pluginError("Amortized transactions must have exactly two postings."),
      ],
    };
  }
  const first = txn.postings[0];
  const second = txn.postings[1];
  const specifiedUnits =
    first.units?.number !== undefined
      ? first.units
      : second.units?.number !== undefined
        ? second.units
        : undefined;
  if (specifiedUnits === undefined) {
    return {
      entries: [txn],
      errs: [
        pluginError(
          "At least one posting of an amortized transaction must have units specified.",
        ),
      ],
    };
  }
  const periods = metaToInt(txn.meta?.[META_KEY]);
  if (periods === null || periods < 1) {
    return {
      // Keep malformed input visible in reports while marking the ledger
      // invalid. Dropping it would silently remove both sides from balances.
      entries: [txn],
      errs: [pluginError("amortize_months must be a positive integer.")],
    };
  }
  if (periods > MAX_AMORTIZE_MONTHS) {
    // Surface a ledger error and pass the transaction through untransformed,
    // as for other invalid period values, so the books stay balanced and every
    // report still renders.
    return {
      entries: [txn],
      errs: [
        pluginError(
          `amortize_months is ${periods}, which exceeds the maximum of ${MAX_AMORTIZE_MONTHS} months; the transaction was not amortized.`,
        ),
      ],
    };
  }

  const dp = decimalPlacesOf(specifiedUnits.number);
  const currency = specifiedUnits.currency;
  const magnitudes = splitAmount(
    new Amount(specifiedUnits.number).abs(),
    periods,
    dp,
  );

  const secondNeg =
    second.units !== undefined && second.units.number !== undefined
      ? new Amount(second.units.number).isNegative()
      : first.units !== undefined && first.units.number !== undefined
        ? !new Amount(first.units.number).isNegative()
        : false;
  const firstNeg =
    first.units !== undefined && first.units.number !== undefined
      ? new Amount(first.units.number).isNegative()
      : !secondNeg;

  const entries: DirectiveJson[] = [];
  magnitudes.forEach((magnitude, n) => {
    const date = addMonths(txn.date, n);
    if (date > today) return; // drop not-yet-amortized months
    const postings: Posting[] = [
      {
        ...first,
        units: { number: signed(magnitude, firstNeg, dp), currency },
      },
      {
        ...second,
        units: { number: signed(magnitude, secondNeg, dp), currency },
      },
    ];
    const amortized: DirectiveJson = {
      ...txn,
      date,
      narration: `${txn.narration ?? ""} (${n + 1}/${periods})`,
      postings,
    };
    inheritDirectiveSourceId(txn, amortized);
    entries.push(amortized);
  });
  return { entries, errs: [] };
}

/** Format a magnitude with the target sign + the original amount's decimals. */
function signed(magnitude: BigNumber, negative: boolean, dp: number): string {
  return (negative ? magnitude.negated() : magnitude).toFixed(dp);
}

/**
 * Faithful port of the Python `split_amount` recursion, unrolled to a LOOP so
 * the stack depth is constant regardless of `periods` (the recursion at one
 * frame per period overflowed the stack for large user-supplied values): each
 * period gets `remainder / remainingPeriods` quantized to the original amount's
 * exponent (banker's rounding), with the running remainder carried into the
 * subsequent periods — the final period IS the remainder, so the parts always
 * sum back EXACTLY to `amount`.
 */
function splitAmount(
  amount: BigNumber,
  periods: number,
  dp: number,
): BigNumber[] {
  const parts: BigNumber[] = [];
  let remainder = amount;
  for (let remaining = periods; remaining > 1; remaining -= 1) {
    const per = remainder
      .dividedBy(remaining)
      .decimalPlaces(dp, BigNumber.ROUND_HALF_EVEN);
    parts.push(per);
    remainder = remainder.minus(per);
  }
  parts.push(remainder);
  return parts;
}

/** Decimal places of a beancount number STRING (BigNumber drops trailing zeros). */
function decimalPlacesOf(numStr: string): number {
  const dot = numStr.indexOf(".");
  return dot === -1 ? 0 : numStr.length - dot - 1;
}

/** Coerce an integral `amortize_months` metadata value to a number, or null. */
function metaToInt(value: unknown): number | null {
  let raw: string | null = null;
  if (typeof value === "string") raw = value;
  else if (typeof value === "number") raw = String(value);
  else if (
    value !== null &&
    typeof value === "object" &&
    "number" in value &&
    typeof (value as { number: unknown }).number === "string"
  ) {
    raw = (value as { number: string }).number;
  }
  if (raw === null) return null;
  const normalized = raw.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const parsed = new Amount(normalized);
  if (!parsed.isFinite() || !parsed.isInteger()) return null;
  const number = parsed.toNumber();
  return Number.isSafeInteger(number) ? number : null;
}

/**
 * Add `n` calendar months to an ISO date, clamping the day to the target
 * month's last day (matches `dateutil.relativedelta(months=n)`:
 * `2020-01-31 + 1mo → 2020-02-29`). Hand-rolled UTC math — the repo deliberately
 * avoids a date dependency (see `directive-filter.ts` / `time-clamp.ts`).
 */
function addMonths(iso: string, n: number): string {
  const [year, month, day] = iso
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  const monthIndex = month - 1 + n;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = utcDate(targetYear, targetMonth + 1, 0).getUTCDate();
  const jsDate = utcDate(targetYear, targetMonth, Math.min(day, lastDay));
  const pad = (value: number, width: number): string =>
    String(value).padStart(width, "0");
  return `${pad(jsDate.getUTCFullYear(), 4)}-${pad(jsDate.getUTCMonth() + 1, 2)}-${pad(jsDate.getUTCDate(), 2)}`;
}
