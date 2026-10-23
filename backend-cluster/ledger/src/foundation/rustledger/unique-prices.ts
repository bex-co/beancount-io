import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import {
  beancountPluginRuns,
  collectLedgerPlugins,
} from "./plugins/collect-plugins";
import { includeTraversalOrder } from "./source-slice";

/** rustledger's `unique_prices` error, raised for every same-day repeat. */
const DUPLICATE = /^Duplicate price for (\S+?)\/(\S+) on (\d{4}-\d{2}-\d{2})$/u;
const MESSAGE = "Disagreeing price entries";
const NUMBER = String.raw`-?\d[\d,]*(?:\.\d+)?`;
const PRICE_LINE = new RegExp(
  String.raw`^(\d{4}-\d{2}-\d{2})\s+price\s+(\S+)\s+(${NUMBER})\s+(\S+)`,
  "u",
);
/** A posting's units and the rest of its line, after its flag if it has one. */
const POSTING = new RegExp(
  String.raw`^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?\S+\s+(${NUMBER})\s+(\S+)(.*)$`,
  "u",
);
const TOTAL_PRICE = new RegExp(String.raw`@@\s*(${NUMBER})\s+(\S+)`, "u");
const UNIT_PRICE = new RegExp(
  String.raw`(?<!@)@(?!@)\s*(${NUMBER})\s+(\S+)`,
  "u",
);
const TOTAL_COST = new RegExp(String.raw`\{\{\s*(${NUMBER})\s+([^\s,}]+)`, "u");
const UNIT_COST = new RegExp(String.raw`\{\s*(${NUMBER})\s+([^\s,}#]+)`, "u");
const IMPLICIT_PRICES = new Set([
  "beancount.plugins.implicit_prices",
  "implicit_prices",
]);
const UNIQUE_PRICES = new Set([
  "beancount.plugins.unique_prices",
  "beancount.plugins.pedantic",
]);

const toNumber = (text: string) => Number(text.replace(/,/gu, ""));

/** A number's value as text, so `100` and `100.00` agree, as Decimals do. */
function decimalKey(number: string): string {
  const negative = number.startsWith("-");
  const [whole = "", fraction = ""] = number
    .replace(/,/gu, "")
    .replace(/^[-+]/u, "")
    .split(".");
  const digits = whole.replace(/^0+/u, "") || "0";
  const decimals = fraction.replace(/0+$/u, "");
  const key = decimals ? `${digits}.${decimals}` : digits;
  return negative && key !== "0" ? `-${key}` : key;
}

type Candidate = { file: string; line: number; number: number | null };

/**
 * The price a posting line implies under `implicit_prices`, in `quote`: its
 * price, else its cost when it adds to a position; `null` when the number is
 * written some other way (an expression, a combined cost).
 */
function impliedPrice(
  line: string,
  base: string,
  quote: string,
): { number: number | null } | null {
  const posting = POSTING.exec(line);
  if (posting === null || posting[2] !== base) return null;
  const units = Math.abs(toNumber(posting[1]!));
  const rest = posting[3]!.replace(/;.*$/u, "");
  const total = TOTAL_PRICE.exec(rest);
  const unit = UNIT_PRICE.exec(rest);
  if (total || unit) {
    if ((total ?? unit)![2] !== quote) return null;
    return {
      number: total ? toNumber(total[1]!) / units : toNumber(unit![1]!),
    };
  }
  // A sale at cost reduces the position, and Beancount prices no reduction.
  if (!rest.includes("{") || posting[1]!.startsWith("-")) return null;
  const totalCost = TOTAL_COST.exec(rest);
  if (totalCost) {
    return totalCost[2] === quote
      ? { number: toNumber(totalCost[1]!) / units }
      : null;
  }
  const unitCost = UNIT_COST.exec(rest);
  if (unitCost && !rest.includes("#")) {
    return unitCost[2] === quote ? { number: toNumber(unitCost[1]!) } : null;
  }
  return rest.includes(quote) ? { number: null } : null;
}

/**
 * Where Beancount reports a group's disagreement: it sorts the day's entries
 * by line (not file), keeps one entry per number, the last of each, and names
 * the one for the first number. Price lines are read off the source, and when
 * `implicit_prices` ran first each priced posting too, on its transaction's
 * line.
 */
function disagreementLocator(
  files: FileMap,
  entryPoint: string,
  implicit: boolean,
) {
  const index = indexBlocks(files);
  const order = includeTraversalOrder(files, entryPoint);
  return (
    date: string,
    base: string,
    quote: string,
  ): { file: string; line: number } | null => {
    const candidates: Candidate[] = [];
    for (const file of order) {
      for (const block of index.blocks(file)) {
        if (!block.text.startsWith(date)) continue;
        const line = block.startLine + 1;
        const [header = "", ...postings] = block.text.split("\n");
        const price = PRICE_LINE.exec(header);
        if (price !== null) {
          if (price[2] === base && price[4] === quote) {
            candidates.push({ file, line, number: toNumber(price[3]!) });
          }
          continue;
        }
        if (!implicit) continue;
        for (const posting of postings) {
          const implied = impliedPrice(posting, base, quote);
          if (implied) candidates.push({ file, line, ...implied });
        }
      }
    }
    candidates.sort((a, b) => a.line - b.line);
    const first = candidates[0]?.number;
    if (first === null || first === undefined) return null;
    const at = candidates.findLast((candidate) => candidate.number === first);
    return at ? { file: at.file, line: at.line } : null;
  };
}

/**
 * Whether Beancount's `unique_prices` sees `implicit_prices`' prices: plugins
 * run in the order declared, so only when that one comes first. `pedantic`
 * carries no `implicit_prices` of its own, so under it, or with
 * `unique_prices` declared first, a buy at 100 beside a written price of 101
 * was refused as disagreeing where bean-check accepts it (w21/754).
 */
function implicitPricesSeen(entryPointSource: string | undefined): {
  declared: boolean;
  seen: boolean;
} {
  const plugins = collectLedgerPlugins(entryPointSource);
  const implicit = plugins.findIndex((name) => IMPLICIT_PRICES.has(name));
  const unique = plugins.findIndex((name) => UNIQUE_PRICES.has(name));
  return {
    declared: implicit !== -1,
    seen: implicit !== -1 && (unique === -1 || implicit < unique),
  };
}

/** Each price the source writes, as a `price` line. */
function writtenPrices(
  files: FileMap,
  entryPoint: string,
): { date: string; base: string; quote: string; number: string }[] {
  const index = indexBlocks(files);
  const prices = [];
  for (const file of includeTraversalOrder(files, entryPoint)) {
    for (const block of index.blocks(file)) {
      const price = PRICE_LINE.exec(block.text);
      if (price === null) continue;
      const [, date = "", base = "", number = "", quote = ""] = price;
      prices.push({ date, base, quote, number });
    }
  }
  return prices;
}

/**
 * Beancount's `unique_prices` refuses a day's prices for a pair only when they
 * disagree: "Disagreeing price entries", once per pair and day. rustledger's
 * raises "Duplicate price for VTI/USD on 2024-01-08" for every repeat, equal
 * ones too and without a location, so a ledger bean-check passes read as
 * broken (w21/735). Each such error is judged against the day's prices: in the
 * booked stream (`directives`) when `implicit_prices` ran first, its own
 * included, and otherwise as the source writes them. It is dropped
 * when they agree, and otherwise replaced by Beancount's one error, on the
 * line bean-check gives where the source shows it. Declared by its Beancount
 * name or through `pedantic`, which rustledger's own `pedantic` leaves out,
 * every day is judged (w21/739).
 */
export function reconcileUniquePriceErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const declared =
    beancountPluginRuns(files[entryPoint], "unique_prices").length > 0;
  if (!declared && !errors.some((error) => DUPLICATE.test(error.message))) {
    return [...errors];
  }
  // The stream's prices, unless they hold implicit ones the check ran before.
  const implicit = implicitPricesSeen(files[entryPoint]);
  const prices =
    !implicit.declared || implicit.seen
      ? directives.flatMap((directive) =>
          directive.type === "price"
            ? [
                {
                  date: directive.date,
                  base: directive.currency,
                  quote: directive.amount.currency,
                  number: directive.amount.number,
                },
              ]
            : [],
        )
      : writtenPrices(files, entryPoint);
  const days = new Map<
    string,
    { date: string; base: string; quote: string; numbers: Set<string> }
  >();
  for (const { date, base, quote, number } of prices) {
    const key = `${date} ${base}/${quote}`;
    const day = days.get(key) ?? { date, base, quote, numbers: new Set() };
    day.numbers.add(decimalKey(number));
    days.set(key, day);
  }
  const locate = disagreementLocator(files, entryPoint, implicit.seen);
  const judged = new Set<string>();
  const reconciled: BeancountError[] = [];
  const judge = (key: string) => {
    const day = days.get(key);
    if (judged.has(key) || day === undefined) return;
    judged.add(key);
    if (day.numbers.size < 2) return;
    const at = locate(day.date, day.base, day.quote);
    reconciled.push({
      message: at
        ? MESSAGE
        : `${MESSAGE} (${day.base}/${day.quote} on ${day.date})`,
      code: "PLUGIN",
      phase: "plugin",
      hint: null,
      file: at?.file ?? null,
      line: at?.line ?? null,
      column: at ? 1 : null,
      end_line: null,
      end_column: null,
      severity: "error",
    });
  };
  for (const error of errors) {
    const duplicate = DUPLICATE.exec(error.message);
    if (duplicate === null) {
      reconciled.push(error);
      continue;
    }
    const [, base = "", quote = "", date = ""] = duplicate;
    judge(`${date} ${base}/${quote}`);
  }
  if (declared) for (const key of days.keys()) judge(key);
  return reconciled;
}
