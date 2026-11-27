import type { BeancountError, FileMap } from "@rustledger/wasm";
import { isSkippedLine } from "./parseable-files";
import { SOURCE_DATE } from "./source-date";
import { endsInsideString, loadedFiles } from "./source-slice";

/**
 * The mid-currency balance tolerance (w23/197).
 *
 * Beancount's grammar writes a tolerance as `number ~ number currency` — the
 * currency comes once, at the end (`balance Assets:Cash 49.75 ~ 0.05 USD`).
 * rustledger 0.24.0 also accepts `49.75 USD ~ 0.05 USD`, so a line stock
 * `bean-check` rejects (`syntax error, unexpected TILDE`) read as check-clean
 * here and committed without a word. Reported as an error at its line so every
 * surface that reads the ledger's errors — `checkLedger`, the post-write
 * report, entry-write gates — sees what stock would. Remove once the engine
 * rejects the spelling; the live check in `scripts/verify-rustledger.ts`
 * shows when.
 *
 * Syntactic and abstaining on doubt: only a line that starts with a date (any
 * spelling stock's lexer reads, `2026/08/30` and `2026-8-30` too: w31/107) and
 * `balance`, then an account, a plain number expression, a currency, and
 * `~`. The valid spelling has `~` straight after the number, so it never
 * matches; an unrelated line or a comment cannot start with a date at
 * column 0 and hold this shape. A line inside a multiline `"..."` string can
 * — a narration holds any text — so string state is tracked across lines
 * (like `routed-includes`) and in-string lines are never read as directives.
 */
const MID_CURRENCY_TOLERANCE = new RegExp(
  String.raw`^${SOURCE_DATE}[ \t]+balance[ \t]+\S+[ \t]+[-+]?[\d.,]+(?:[ \t]*[-+*/][ \t]*[\d.,]+)*[ \t]+([A-Z][A-Z0-9'._-]*)[ \t]*~`,
);

export function midCurrencyToleranceErrors(
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const errors: BeancountError[] = [];
  for (const file of loadedFiles(files, entryPoint)) {
    const lines = (files[file] ?? "").split("\n");
    let inString = false;
    lines.forEach((line, index) => {
      // Beancount skips a line starting with `*`, `#`, `:`, `!`, `&`, `?` or
      // `%` whole: a `"` on it opens nothing (w31/099). Inside a string the
      // character is content instead.
      if (!inString && isSkippedLine(line)) return;
      if (!inString) {
        const currency = MID_CURRENCY_TOLERANCE.exec(line)?.[1];
        if (currency !== undefined) {
          errors.push({
            message: `Invalid balance tolerance: the currency goes once, after the tolerance ("49.75 ~ 0.05 ${currency}"), not before the "~". Beancount rejects "${currency} ~" with a syntax error, so this line fails outside this service.`,
            code: "TOLERANCE",
            phase: "validate",
            hint: null,
            file,
            line: index + 1,
            column: 1,
            end_line: null,
            end_column: null,
            severity: "error",
          });
        }
      }
      inString = endsInsideString(line, inString);
    });
  }
  return errors;
}
