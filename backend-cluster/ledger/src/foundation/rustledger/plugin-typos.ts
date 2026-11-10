import type { BeancountError } from "@rustledger/wasm";

const PYTHON_PLUGIN =
  /^Python plugin "(.*)" requires the python-plugins feature$/u;
/** A bare name the engine has no native plugin for (w1/208). */
const PLUGIN_NOT_FOUND = /^Plugin not found: "(.*)"$/u;
const BUILTIN_PREFIX = "beancount.plugins.";

/** The plugin modules Beancount ships under `beancount.plugins`. */
const BEANCOUNT_PLUGINS = [
  "auto",
  "auto_accounts",
  "check_average_cost",
  "check_closing",
  "check_commodity",
  "check_drained",
  "close_tree",
  "coherent_cost",
  "commodity_attr",
  "currency_accounts",
  "divert_expenses",
  "implicit_prices",
  "leafonly",
  "mark_unverified",
  "noduplicates",
  "nounused",
  "onecommodity",
  "pedantic",
  "sellgains",
  "split_expenses",
  "tag_pending",
  "unique_prices",
  "valid_commodities",
  "zerosum",
];

/** Edit distance between two short names. */
function distance(left: string, right: string): number {
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= right.length; j += 1) {
      next[j] = Math.min(
        row[j]! + 1,
        next[j - 1]! + 1,
        row[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    row = next;
  }
  return row[right.length]!;
}

/**
 * Name a misspelled built-in plugin. The engine reports any plugin it cannot
 * run as `Python plugin "beancount.plugins.auto_acounts" requires the
 * python-plugins feature`, which reads as a missing feature, not a typo. A
 * `beancount.plugins` name that is not one Beancount ships becomes an unknown
 * plugin, with the nearest real one as the hint when it is within two edits
 * (w21/902). A real plugin the engine cannot run keeps its message.
 */
export function explainUnknownPlugins(
  errors: BeancountError[],
): BeancountError[] {
  return errors.map((error) => {
    // A bare name the engine does not know: `plugin "noduplicate"` (w1/208).
    const bare = PLUGIN_NOT_FOUND.exec(error.message)?.[1];
    if (bare !== undefined) return unknownPlugin(error, bare, bare, "");
    const name = PYTHON_PLUGIN.exec(error.message)?.[1];
    if (name === undefined || !name.startsWith(BUILTIN_PREFIX)) return error;
    const module = name.slice(BUILTIN_PREFIX.length);
    if (BEANCOUNT_PLUGINS.includes(module)) return error;
    return unknownPlugin(error, name, module, BUILTIN_PREFIX);
  });
}

/** `name` is unknown; suggest the shipped module nearest `module`. */
function unknownPlugin(
  error: BeancountError,
  name: string,
  module: string,
  prefix: string,
): BeancountError {
  const nearest = BEANCOUNT_PLUGINS.map(
    (known) => [known, distance(module, known)] as const,
  ).sort((left, right) => left[1] - right[1])[0];
  return {
    ...error,
    message: `Unknown plugin "${name}": Beancount.io can't run this plugin`,
    hint:
      nearest !== undefined && nearest[1] <= 2
        ? `Did you mean "${prefix}${nearest[0]}"?`
        : error.hint,
  };
}
