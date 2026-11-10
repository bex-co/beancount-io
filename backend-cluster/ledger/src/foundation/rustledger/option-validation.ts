import type { BeancountError } from "@rustledger/wasm";

/**
 * Reconcile the engine's option-value checks with Beancount's.
 *
 * Beancount's own defaults trip two of rustledger's checks, which gave a ledger
 * copied from the Beancount docs or the bean-example a permanent bell badge and
 * red error rows for options `bean-check` accepts (w21/308):
 *
 * - `[E7002] Invalid leaf account name: 'Opening-Balances'` for
 *   `option "account_previous_balances"` (and `account_rounding`,
 *   `account_current_earnings`, …). Beancount joins the value under the Equity
 *   root, so what matters is that the leaf is a valid account component: an
 *   uppercase letter or digit first, then letters, digits and hyphens. The
 *   engine rejects the hyphen. The error is dropped only when the quoted leaf IS
 *   a valid component; a genuinely bad one (`rounding`, `my rounding`) stays.
 * - `[E7007] Option 'account_rounding' is accepted for compatibility but has no
 *   effect`: a compatibility notice, not an error. It is kept, as a warning.
 *
 * Neither error carries a source line (their `code` is null; the code is a tag
 * in the message), so they are told apart by that tag, as the document checks
 * are.
 */

const INVALID_LEAF = /^\[E7002\] Invalid leaf account name: '([^']*)'/u;
const NO_EFFECT = "[E7007] Option '";

/** A valid Beancount account component, as the grammar allows it. */
const ACCOUNT_COMPONENT = /^[\p{Lu}\p{Lt}\p{Lo}\p{Nd}][\p{L}\p{M}\p{Nd}-]*$/u;

export function reconcileOptionErrors(
  errors: readonly BeancountError[],
): BeancountError[] {
  return errors.flatMap((error): BeancountError[] => {
    const leaf = INVALID_LEAF.exec(error.message)?.[1];
    if (leaf !== undefined && ACCOUNT_COMPONENT.test(leaf)) return [];
    if (error.message.startsWith(NO_EFFECT)) {
      return [{ ...error, severity: "warning" }];
    }
    return [error];
  });
}

/** `option "name" "value"`, a top-level directive: a comment never matches. */
const OPTION_RE = /^[^\S\r\n]*option[^\S\r\n]+"([^"]*)"[^\S\r\n]+"([^"]*)"/gmu;

/** An engine option error: its `[E70xx]` tag leads the message and `code` is null. */
const OPTION_ERROR = /^\[(E70\d\d)\] ([\s\S]*)$/u;

/**
 * The directive line of each `option` in one file's text, with its 1-based
 * line. Lines are counted between matches, so a large file is scanned once.
 */
function optionDeclarations(
  content: string,
): Array<{ name: string; value: string; line: number }> {
  const declarations: Array<{ name: string; value: string; line: number }> = [];
  let line = 1;
  let scanned = 0;
  for (const match of content.matchAll(OPTION_RE)) {
    const index = match.index ?? 0;
    for (let i = scanned; i < index; i += 1) {
      if (content.charCodeAt(i) === 10) line += 1;
    }
    scanned = index;
    declarations.push({ name: match[1], value: match[2], line });
  }
  return declarations;
}

/**
 * The options the engine renamed, by new name: its E7004 "Renamed to 'X'."
 * quotes only the new name, so the old ones are what a line declares. The
 * engine (rustledger 0.24.0) renames exactly this one.
 */
const RENAMED_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  tolerance_multiplier: ["inferred_tolerance_multiplier"],
};

/**
 * Put option errors on the `option` line they are about, with their code.
 *
 * The engine reports `[E7001] Invalid option "bogus_option"` with no file, line
 * or code (the code is a tag in the message), so the row could not be opened in
 * the editor and no banner listed it, where Beancount names the option's file
 * and line. The option is found from the names and values the message quotes: a
 * line naming it and carrying the quoted value wins, then one naming it, then one
 * whose value was quoted (a bad account leaf names no option); among equals the
 * last line, which is the one that wins (and the one a duplicate is reported
 * on). An error that matches no line is left as it was. The `[E7006]` document
 * root error has its own reconciliation and is not touched (w21/309).
 */
export function locateOptionErrors(
  errors: readonly BeancountError[],
  files: Readonly<Record<string, string>>,
  entryPoint: string,
): BeancountError[] {
  const content = files[entryPoint];
  if (content === undefined) return [...errors];
  let options: ReturnType<typeof optionDeclarations> | undefined;
  return errors.map((error) => {
    if (error.file || error.code) return error;
    const tagged = OPTION_ERROR.exec(error.message);
    if (!tagged || tagged[1] === "E7006") return error;
    options ??= optionDeclarations(content);
    const quoted = new Set(
      [...tagged[2].matchAll(/"([^"]*)"|'([^']*)'/gu)].map(
        (match) => match[1] ?? match[2],
      ),
    );
    // A renamed option's error quotes only the new name; the line declares
    // an old one (w1/209).
    for (const name of [...quoted]) {
      for (const old of RENAMED_OPTIONS[name] ?? []) quoted.add(old);
    }
    let best: { line: number; score: number } | null = null;
    for (const option of options) {
      const score =
        (quoted.has(option.name) ? 2 : 0) + (quoted.has(option.value) ? 1 : 0);
      if (score > 0 && (best === null || score >= best.score)) {
        best = { line: option.line, score };
      }
    }
    // Unplaced, the error still carries its code rather than a tag in the
    // message (w1/209).
    if (best === null) return { ...error, code: tagged[1], message: tagged[2] };
    return {
      ...error,
      code: tagged[1],
      message: tagged[2],
      file: entryPoint,
      line: best.line,
      column: error.column ?? 1,
    };
  });
}

/**
 * Whether the entry point sets `option "plugin_processing_mode" "raw"` (the
 * last declaration wins, as in Beancount). Raw mode runs only the declared
 * plugins: not `beancount.ops.pad` or `beancount.ops.balance`, so no padding is
 * inserted and no balance assertion is checked. The engine accepts the option
 * and ignores it (w21/656), so the parse undoes those two steps itself.
 */
export function isRawPluginProcessing(
  files: Readonly<Record<string, string>>,
  entryPoint: string,
): boolean {
  const content = files[entryPoint];
  if (content === undefined || !content.includes("plugin_processing_mode")) {
    return false;
  }
  const mode = optionDeclarations(content)
    .filter((option) => option.name === "plugin_processing_mode")
    .at(-1);
  return mode?.value === "raw";
}

/**
 * The engine's errors from the pad and balance steps raw mode skips: a failed
 * assertion (E2001), one past its explicit tolerance (E2002), an unused pad
 * (E2003) and two pads before one assertion (E2004). Unknown accounts and
 * duplicate assertions are validation, which raw mode still runs.
 */
const PAD_AND_BALANCE_CHECK_CODES = new Set([
  "E2001",
  "E2002",
  "E2003",
  "E2004",
]);

export function withoutPadAndBalanceChecks(
  errors: readonly BeancountError[],
): BeancountError[] {
  return errors.filter(
    (error) => !PAD_AND_BALANCE_CHECK_CODES.has(error.code ?? ""),
  );
}
