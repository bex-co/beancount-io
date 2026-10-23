import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { beancountPluginRuns } from "./plugins/collect-plugins";

/** rustledger's own finding, a warning, which the server does not show. */
const RUSTLEDGER = /^commodity '.*' used but not declared$/u;
const PRICE_CONTEXT = "Price Directive Context";

const unlocated = (message: string): BeancountError => ({
  message,
  code: "PLUGIN",
  phase: "plugin",
  hint: null,
  file: null,
  line: null,
  column: null,
  end_line: null,
  end_column: null,
  severity: "error",
});

/**
 * The plugin's config, a Python dict of context pattern to currency pattern
 * (`{"Assets:.*": "VT.*"}`) naming uses that need no `commodity`; `null` when
 * it is not one. Read as JSON, with single quotes allowed.
 */
function ignorePatterns(config: string): Record<string, unknown> | null {
  for (const text of [config, config.replace(/'/gu, '"')]) {
    try {
      const value: unknown = JSON.parse(text);
      if (value !== null && typeof value === "object" && !Array.isArray(value))
        return value as Record<string, unknown>;
      return null;
    } catch {
      // Not JSON; try the next spelling.
    }
  }
  return null;
}

/** Beancount's check, once: its errors for one run with `config`. */
function checkCommodities(
  directives: readonly DirectiveJson[],
  config: string | null,
): BeancountError[] {
  const errors: BeancountError[] = [];
  const ignore: [RegExp, RegExp][] = [];
  if (config) {
    const patterns = ignorePatterns(config);
    if (patterns === null) {
      return [
        unlocated(
          "Invalid configuration for check_commodity plugin; skipping.",
        ),
      ];
    }
    for (const [key, value] of Object.entries(patterns)) {
      const compiled: RegExp[] = [];
      for (const pattern of [key, String(value)]) {
        try {
          // Sticky, so it matches from the start, as `re.match`.
          compiled.push(new RegExp(pattern, "y"));
        } catch {
          errors.push(unlocated(`Invalid regexp: '${value}' for ${key}`));
        }
      }
      if (compiled.length === 2) ignore.push([compiled[0]!, compiled[1]!]);
    }
  }
  const matches = (pattern: RegExp, text: string) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  };

  const declared = new Set<string>();
  const occurrences = new Map<string, [string, string]>();
  const occur = (context: string, currency: string | undefined) => {
    if (currency)
      occurrences.set(`${context}\u0000${currency}`, [context, currency]);
  };
  for (const directive of directives) {
    switch (directive.type) {
      case "commodity":
        declared.add(directive.currency);
        break;
      case "open":
        for (const currency of directive.currencies) {
          occur(directive.account, currency);
        }
        break;
      case "transaction":
        for (const posting of directive.postings) {
          occur(posting.account, posting.units?.currency);
          occur(posting.account, posting.cost?.currency);
          occur(posting.account, posting.price?.currency);
        }
        break;
      case "balance":
        occur(directive.account, directive.amount.currency);
        break;
      case "price":
        occur(PRICE_CONTEXT, directive.currency);
        occur(PRICE_CONTEXT, directive.amount.currency);
        break;
      default:
        break;
    }
  }
  // Sorted as Python sorts the (context, currency) pairs.
  const sorted = [...occurrences.values()].sort(([a, x], [b, y]) =>
    a !== b ? (a < b ? -1 : 1) : x < y ? -1 : x > y ? 1 : 0,
  );
  const issued = new Set<string>();
  const ignored = new Set<string>();
  const missing = (currency: string, context: string) => {
    errors.push(
      unlocated(
        `Missing Commodity directive for '${currency}' in '${context}'`,
      ),
    );
    issued.add(currency);
  };
  // Account uses first, then prices; one error per currency.
  for (const [context, currency] of sorted) {
    if (context === PRICE_CONTEXT) continue;
    if (declared.has(currency) || issued.has(currency)) continue;
    if (
      ignore.some(
        ([contextPattern, currencyPattern]) =>
          matches(contextPattern, context) &&
          matches(currencyPattern, currency),
      )
    ) {
      ignored.add(currency);
      continue;
    }
    missing(currency, context);
  }
  for (const [context, currency] of sorted) {
    if (context !== PRICE_CONTEXT) continue;
    if (declared.has(currency) || issued.has(currency) || ignored.has(currency))
      continue;
    missing(currency, context);
  }
  return errors;
}

/**
 * Beancount's `check_commodity` (or `pedantic`) refuses each currency used
 * with no `commodity` directive: "Missing Commodity directive for 'USD' in
 * 'Assets:Cash'", naming the first account using it (prices last), with no
 * ledger location (bean-check gives `<check_commodity>:0`). The engine's says
 * so as a warning, which the server drops as advice (w21/188), so a ledger
 * bean-check refuses read as healthy (w21/739). Declared, its warnings are
 * replaced by Beancount's errors, over the booked stream (`directives`).
 */
export function reconcileCheckCommodityErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "check_commodity");
  if (runs.length === 0) return [...errors];
  return [
    ...errors.filter((error) => !RUSTLEDGER.test(error.message)),
    ...runs.flatMap((config) => checkCommodities(directives, config)),
  ];
}
