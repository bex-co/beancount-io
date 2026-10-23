import BigNumber from "bignumber.js";
import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { splitIntoBlocks } from "./source-slice";

type Balance = Extract<DirectiveJson, { type: "balance" }>;
type Pad = Extract<DirectiveJson, { type: "pad" }>;

/**
 * Beancount's `get_balance_tolerance`: the explicit `~` tolerance, else half
 * of twice the asserted amount's last decimal place (the default
 * `inferred_tolerance_multiplier` of 0.5), else zero for a whole number.
 */
function balanceTolerance(balance: Balance): BigNumber {
  if (balance.tolerance) return new BigNumber(balance.tolerance);
  // The written scale: "100.00" has two places, which BigNumber drops.
  const places = balance.amount.number.split(".")[1]?.length ?? 0;
  return places > 0
    ? new BigNumber(0.5).times(2).times(new BigNumber(10).pow(-places))
    : new BigNumber(0);
}

/** The first balance after `padIndex` on the pad's account in `currency`. */
function triggeringBalance(
  directives: DirectiveJson[],
  padIndex: number,
  account: string,
  currency: string,
): Balance | undefined {
  for (let index = padIndex + 1; index < directives.length; index += 1) {
    const directive = directives[index];
    if (
      directive.type === "balance" &&
      directive.account === account &&
      directive.amount.currency === currency
    ) {
      return directive;
    }
  }
  return undefined;
}

/** rustledger's "Unused Pad entry", for a pad written at `file:line`. */
export function unusedPadError(
  file: string | null,
  line: number | null,
): BeancountError {
  return {
    message: "Unused Pad entry",
    code: "E2003",
    phase: "validate",
    hint: null,
    file,
    line,
    column: line === null ? null : 1,
    end_line: null,
    end_column: null,
    severity: "error",
  };
}

/** Where a pad is written: `[file, 1-based line]`, matched by its header. */
export function padLocation(
  pad: Pad,
  files: FileMap,
  claimed: Set<string>,
): [string, number] | [null, null] {
  const header = new RegExp(
    `^${pad.date}\\s+pad\\s+${escapeRegExp(pad.account)}\\s+${escapeRegExp(pad.source_account)}(\\s|$)`,
  );
  for (const [file, source] of Object.entries(files)) {
    for (const block of splitIntoBlocks(source)) {
      const key = `${file}:${block.startLine}`;
      if (!claimed.has(key) && header.test(block.text)) {
        claimed.add(key);
        return [file, block.startLine + 1];
      }
    }
  }
  return [null, null];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Drop the padding Beancount would not insert. Its pad plugin pads only when
 * the difference exceeds the balance's tolerance and otherwise reports the
 * pad as unused; rustledger pads any non-zero difference, so a 2.00 gap under
 * `~ 5.00` was padded away and no error was raised (w21/135). A pad left with
 * no padding gets rustledger's own "Unused Pad entry" (E2003), as an exactly
 * zero difference already does.
 *
 * `directives` is the sorted stream without padding, as the merge sees it.
 */
export function dropPaddingWithinTolerance(
  directives: DirectiveJson[],
  paddingTransactions: DirectiveJson[],
  files: FileMap,
): { paddingTransactions: DirectiveJson[]; errors: BeancountError[] } {
  if (paddingTransactions.length === 0) {
    return { paddingTransactions, errors: [] };
  }
  const kept: DirectiveJson[] = [];
  const dropped = new Map<number, boolean>();
  for (const transaction of paddingTransactions) {
    const posting =
      transaction.type === "transaction" ? transaction.postings[0] : undefined;
    const padIndex = posting
      ? directives.findIndex(
          (directive) =>
            directive.type === "pad" &&
            directive.date === transaction.date &&
            directive.account === posting.account &&
            transaction.type === "transaction" &&
            directive.source_account === transaction.postings[1]?.account,
        )
      : -1;
    const balance =
      padIndex >= 0 && posting?.units
        ? triggeringBalance(
            directives,
            padIndex,
            posting.account,
            posting.units.currency,
          )
        : undefined;
    if (
      balance &&
      posting?.units &&
      new BigNumber(posting.units.number)
        .abs()
        .isLessThanOrEqualTo(balanceTolerance(balance))
    ) {
      if (!dropped.has(padIndex)) dropped.set(padIndex, true);
      continue;
    }
    if (padIndex >= 0) dropped.set(padIndex, false);
    kept.push(transaction);
  }

  const claimed = new Set<string>();
  const errors: BeancountError[] = [];
  dropped.forEach((unused, padIndex) => {
    if (!unused) return;
    const [file, line] = padLocation(
      directives[padIndex] as Pad,
      files,
      claimed,
    );
    errors.push(unusedPadError(file, line));
  });
  return { paddingTransactions: kept, errors };
}
