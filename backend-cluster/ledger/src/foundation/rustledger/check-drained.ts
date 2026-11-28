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

const key = (...parts: string[]) => parts.join("\u0000");

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
 *
 * Beancount adds no zero balance for a currency that a balance written on
 * the close date already checks (w31/158). The engine still checks it, so
 * one of its errors for that account and currency is dropped per close date
 * that has such a balance.
 */
export function reconcileCheckDrainedErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  if (beancountPluginRuns(files[entryPoint], "check_drained").length === 0) {
    return [...errors];
  }
  const closeDates = new Map<string, Set<string>>();
  for (const directive of directives) {
    if (directive.type !== "close") continue;
    const dates = closeDates.get(directive.account) ?? new Set<string>();
    closeDates.set(directive.account, dates.add(directive.date));
  }
  // Each (account, date, currency) once, as Beancount keeps them in a set.
  const checked = new Set(
    directives.flatMap((directive) =>
      directive.type === "balance" &&
      closeDates.get(directive.account)?.has(directive.date) === true
        ? [key(directive.account, directive.date, directive.amount.currency)]
        : [],
    ),
  );
  let closes: ReturnType<typeof closeLocations> | undefined;
  return errors.flatMap((error) => {
    if (error.code !== "E2001" || error.file) return [error];
    const match = ENGINE.exec(error.message);
    if (match === null) return [error];
    const [
      ,
      account = "",
      expected = "",
      currency = "",
      got = "",
      gotCurrency,
    ] = match;
    const dates = closeDates.get(account);
    if (dates === undefined || !new BigNumber(expected).isZero()) {
      return [error];
    }
    // One error per close date whose written balance checks its currency.
    if (
      [...dates].some((date) => checked.delete(key(account, date, currency)))
    ) {
      return [];
    }
    closes ??= closeLocations(files, entryPoint);
    const at = closes.get(account);
    // Decimal's difference, at the finer scale of the two.
    const diff = new BigNumber(got).minus(expected);
    const amount = diff
      .abs()
      .toFixed(Math.max(scaleOf(got), scaleOf(expected)));
    return [
      {
        ...error,
        message: `Balance failed for '${account}': expected ${expected} ${currency} != accumulated ${got} ${gotCurrency} (${amount} ${diff.isPositive() ? "too much" : "too little"})`,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
      },
    ];
  });
}
