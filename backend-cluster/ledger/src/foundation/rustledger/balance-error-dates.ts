import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { SOURCE_DATE, sourceDateOf } from "./source-date";

/** A balance failure that also names the date of the assertion it is on. */
export type DatedBalanceError = BeancountError & { date?: string };

const DATED_HEADER = new RegExp(String.raw`^${SOURCE_DATE}\s+balance\s`, "u");

/**
 * Balance failures carrying the date written on their line. The validator
 * names the account and both amounts but no date, so two assertions of one
 * amount (the monthly "0.00" card checks) could not be told apart when only one
 * failed (w21/677); the line it reports can. The date is the engine's
 * `YYYY-MM-DD`, however the line spells it (w31/107).
 */
export function withBalanceErrorDates(
  errors: readonly BeancountError[],
  files: FileMap,
): DatedBalanceError[] {
  // Split once, however many balances failed (w21/706).
  const index = indexBlocks(files);
  return errors.map((error) => {
    if (
      (error.code !== "E2001" && error.code !== "E2002") ||
      !error.file ||
      !error.line
    ) {
      return error;
    }
    if (files[error.file] === undefined) return error;
    const block = index.at(error.file, error.line);
    const date =
      block && DATED_HEADER.test(block.text)
        ? sourceDateOf(block.text)
        : undefined;
    return date ? { ...error, date } : error;
  });
}
