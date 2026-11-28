import BigNumber from "bignumber.js";
import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { closeLocations } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";

/**
 * The engine's failure of a balance with no source of its own, followed by
 * its note that a plugin made the balance.
 */
const ENGINE =
  /^Balance failed for (\S+): expected (-?[\d.]+) (\S+), got (-?[\d.]+) (\S+)(?:\n|$)/u;

const scaleOf = (number: string) => (number.split(".")[1] ?? "").length;

/**
 * Beancount's `check_drained` (or `pedantic`) adds a zero balance the day
 * after each close, for each currency the account used, with the close's
 * metadata, so bean-check reports a closed account that still holds money on
 * its `close` line: "Balance failed for 'Assets:Cash': expected 0 USD !=
 * accumulated 49.75 USD (49.75 too much)". The engine reports its own zero
 * balance with no file or line, in its own words (w31/156). Declared, each of
 * those errors for a closed account takes Beancount's words and the line of
 * the account's written close. A close that close_tree made has no line in
 * stock either (`<beancount.plugins.close_tree>:0`), so its error stays
 * unlocated.
 */
export function locateCheckDrainedErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  if (beancountPluginRuns(files[entryPoint], "check_drained").length === 0) {
    return [...errors];
  }
  const closed = new Set(
    directives.flatMap((directive) =>
      directive.type === "close" ? [directive.account] : [],
    ),
  );
  let closes: ReturnType<typeof closeLocations> | undefined;
  return errors.map((error) => {
    if (error.code !== "E2001" || error.file) return error;
    const match = ENGINE.exec(error.message);
    if (match === null) return error;
    const [, account = "", expected = "", currency, got = "", gotCurrency] =
      match;
    if (!closed.has(account) || !new BigNumber(expected).isZero()) {
      return error;
    }
    closes ??= closeLocations(files, entryPoint);
    const at = closes.get(account);
    // Decimal's difference, at the finer scale of the two.
    const diff = new BigNumber(got).minus(expected);
    const amount = diff
      .abs()
      .toFixed(Math.max(scaleOf(got), scaleOf(expected)));
    return {
      ...error,
      message: `Balance failed for '${account}': expected ${expected} ${currency} != accumulated ${got} ${gotCurrency} (${amount} ${diff.isPositive() ? "too much" : "too little"})`,
      file: at?.file ?? null,
      line: at?.line ?? null,
      column: at ? 1 : null,
      end_line: null,
      end_column: null,
    };
  });
}
