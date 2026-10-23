import BigNumber from "bignumber.js";
import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { entryLocator } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;
type Posting = Transaction["postings"][number];

/** A number with the decimal places Python's `Decimal` would carry. */
type Dec = { value: BigNumber; scale: number };
type Money = Map<string, Dec>;

const scaleOf = (text: string): number => text.split(".")[1]?.length ?? 0;
const dec = (text: string): Dec => ({
  value: new BigNumber(text),
  scale: scaleOf(text),
});
const mul = (a: Dec, b: Dec): Dec => ({
  value: a.value.times(b.value),
  scale: a.scale + b.scale,
});
const add = (a: Dec, b: Dec): Dec => ({
  value: a.value.plus(b.value),
  scale: Math.max(a.scale, b.scale),
});

/** `Inventory.add_amount`: a position that nets to zero is dropped. */
function addTo(money: Money, currency: string, amount: Dec): void {
  const sum = add(money.get(currency) ?? dec("0"), amount);
  if (sum.value.isZero()) money.delete(currency);
  else money.set(currency, sum);
}

/** `str(Inventory)`: positions by currency, in parentheses. */
function show(money: Money): string {
  const parts = [...money.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(
      ([currency, amount]) =>
        `${amount.value.toFixed(amount.scale)} ${currency}`,
    );
  return `(${parts.join(", ")})`;
}

const text = (value: BigNumber.Value | undefined | null) =>
  value === undefined || value === null ? undefined : String(value);

/**
 * The tolerance Beancount infers for each currency from the postings' units:
 * half a unit of the last place, the largest among them (`infer_tolerances`).
 */
function inferTolerances(postings: readonly Posting[]): Map<string, BigNumber> {
  const found = new Map<string, BigNumber>();
  for (const posting of postings) {
    const number = text(posting.units?.number);
    const currency = posting.units?.currency;
    if (number === undefined || !currency) continue;
    const places = scaleOf(number);
    if (places === 0) continue;
    const tolerance = new BigNumber(0.5).times(new BigNumber(10).pow(-places));
    const seen = found.get(currency);
    if (!seen || tolerance.isGreaterThan(seen)) found.set(currency, tolerance);
  }
  return found;
}

/** `option "inferred_tolerance_default" "CUR:value"` lines of the entry point. */
function defaultTolerances(source: string | undefined): Map<string, BigNumber> {
  const found = new Map<string, BigNumber>();
  for (const match of (source ?? "").matchAll(
    /^option\s+"inferred_tolerance_default"\s+"([^":]+):([^"]+)"/gmu,
  )) {
    found.set(match[1]!, new BigNumber(match[2]!));
  }
  return found;
}

const rootOf = (account: string) => account.split(":")[0];
const PROCEED_ROOTS = new Set(["Assets", "Liabilities", "Equity", "Expenses"]);

/**
 * Beancount's `sellgains` (or `pedantic`): for a transaction whose every posting
 * at cost has a price, the priced value of the lots sold must match the other
 * postings to asset, liability, equity and expense accounts, within twice the
 * inferred tolerance. The engine does not run it, so a sale whose price
 * disagreed with its proceeds read as healthy where bean-check refuses it
 * (w21/846). A ledger that renames its account roots is left alone: the roots
 * decide which postings count.
 */
export function sellGainsErrors(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const source = files[entryPoint];
  const runs = beancountPluginRuns(source, "sellgains");
  if (
    runs.length === 0 ||
    /^option\s+"name_(?:assets|liabilities|equity|income|expenses)"/mu.test(
      source ?? "",
    )
  ) {
    return [];
  }
  const defaults = defaultTolerances(source);
  const locate = entryLocator(files, entryPoint);
  const errors: BeancountError[] = [];
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    const atCost = directive.postings.filter((posting) => posting.cost);
    if (atCost.length === 0 || !atCost.every((posting) => posting.price)) {
      continue;
    }
    const at = locate(
      directive.date,
      (line) => line.includes("{") && line.includes("@"),
    );
    const price: Money = new Map();
    const proceeds: Money = new Map();
    let complete = true;
    for (const posting of directive.postings) {
      const units = text(posting.units?.number);
      const currency = posting.units?.currency;
      if (posting.cost) {
        const priced = text(posting.price?.number);
        if (units === undefined || priced === undefined || !posting.price) {
          complete = false;
          continue;
        }
        const total = mul(
          dec(priced),
          dec(new BigNumber(units).negated().toFixed(scaleOf(units))),
        );
        addTo(price, posting.price.currency, total);
      } else if (PROCEED_ROOTS.has(rootOf(posting.account)!)) {
        if (units === undefined || !currency) {
          complete = false;
          continue;
        }
        const priced = text(posting.price?.number);
        if (posting.price && priced !== undefined) {
          addTo(proceeds, posting.price.currency, mul(dec(units), dec(priced)));
        } else {
          addTo(proceeds, currency, dec(units));
        }
      }
    }
    // An elided amount needs the interpolation the stream does not carry.
    if (!complete) continue;
    const tolerances = inferTolerances(directive.postings);
    const left = new Map(proceeds);
    let invalid = false;
    for (const [currency, amount] of price) {
      const tolerance = (
        tolerances.get(currency) ??
        defaults.get(currency) ??
        defaults.get("*") ??
        new BigNumber(0)
      ).times(2);
      const seen = left.get(currency)?.value ?? new BigNumber(0);
      left.delete(currency);
      if (amount.value.minus(seen).abs().isGreaterThan(tolerance)) {
        invalid = true;
        break;
      }
    }
    if (!invalid && left.size === 0) continue;
    const difference: Money = new Map(price);
    for (const [currency, amount] of proceeds) {
      addTo(difference, currency, {
        value: amount.value.negated(),
        scale: amount.scale,
      });
    }
    runs.forEach(() =>
      errors.push({
        message: `Invalid price vs. proceeds/gains: ${show(price)} vs. ${show(proceeds)}; difference: ${show(difference)}`,
        code: "PLUGIN",
        phase: "plugin",
        hint: null,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
        severity: "error",
      }),
    );
  }
  return errors;
}
