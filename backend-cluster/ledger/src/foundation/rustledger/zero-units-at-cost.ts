import BigNumber from "bignumber.js";
import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { entryLocator, indexBlocks } from "./block-index";
import { SOURCE_DATE } from "./source-date";
import { endsInsideString, type SourceBlock } from "./source-slice";

type Posting = Extract<
  DirectiveJson,
  { type: "transaction" }
>["postings"][number];

/**
 * A posting line held at cost, after its flag if it has one: its account, what
 * it writes before the `{`, and the cost spec up to its `}`.
 */
const COSTED_POSTING =
  /^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?(\S+)\s+([^;{]*)\{([^}]*)/u;
const STRING = /"(?:[^"\\]|\\.)*"/gu;
/** Units written as one plain number and a commodity: `0`, `-0.00`, `1,000`. */
const PLAIN_UNITS = /^[-+]?(\d[\d,]*(?:\.\d*)?)\s+(\S+)$/u;
const DATE = new RegExp(SOURCE_DATE, "gu");
/**
 * A number in a cost spec once its dates are out: `5 USD`, `# 5 USD`,
 * `{5 USD}` (a total), `(1+4) USD`.
 */
const COST_NUMBER = /(?:^|[\s,#({+*/-])\.?\d/u;

/** Whether booked `posting` holds zero units at a cost with a number. */
const zeroAtCost = (posting: Posting): boolean =>
  posting.cost?.number !== undefined &&
  posting.units !== undefined &&
  new BigNumber(posting.units.number).isZero();

/**
 * Whether `line` may write booked `posting`: a posting to its account held at
 * a cost with a number, with zero units of its commodity. Units written as an
 * expression (`(1-1) VTI`) are not evaluated, so such a line may be it.
 */
function mayWrite(line: string, posting: Posting): boolean {
  const found = COSTED_POSTING.exec(line.replace(STRING, '""'));
  if (found === null || found[1] !== posting.account) return false;
  if (!COST_NUMBER.test(found[3]!.replace(DATE, " "))) return false;
  const plain = PLAIN_UNITS.exec(found[2]!.trim());
  return (
    plain === null ||
    (plain[2] === posting.units?.currency &&
      new BigNumber(plain[1]!.replace(/,/gu, "")).isZero())
  );
}

/**
 * Each line of `block` after its header, with its 1-based number; a line
 * inside a string is none.
 */
function bodyLines(block: SourceBlock): Array<{ line: number; text: string }> {
  const found: Array<{ line: number; text: string }> = [];
  let inString = false;
  block.text.split("\n").forEach((text, at) => {
    const started = inString;
    inString = endsInsideString(text, inString);
    if (at > 0 && !started)
      found.push({ line: block.startLine + at + 1, text });
  });
  return found;
}

/**
 * Stock Beancount refuses a posting held at cost whose units are zero. After
 * booking it checks every posting with a cost: `Amount is zero: "0 VTI"`, on
 * the posting's line (`booking_full.py`). rustledger 0.24.0 raises the sibling
 * rule, `E4005` "Cost is negative", but not this one, and books the posting as
 * an empty lot, so a ledger bean-check refuses read as clean on every surface
 * (w31/140). Stock keeps the entry and its posting, so this reports the error
 * and books nothing differently.
 *
 * The booked stream tells the cases apart: `0 VTI {5 USD}` books with a cost
 * number and is the error, while `0 VTI {}`, a date or a label alone book with
 * none, and stock accepts them. Stock books before plugins run, so
 * `directives` is the stream before them.
 *
 * Each error is placed on the posting's line: in the first unclaimed dated
 * block that day, in include order, holding a line that may write it. A
 * posting not found there takes its block's first line, and one whose block is
 * not found has no place. Remove the rule when the engine raises it; the live
 * check in `scripts/verify-rustledger.ts` shows when.
 */
export function zeroUnitsAtCostErrors(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  let locate: ReturnType<typeof entryLocator> | undefined;
  let index: ReturnType<typeof indexBlocks> | undefined;
  const errors: BeancountError[] = [];
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    const zero = directive.postings.filter(zeroAtCost);
    if (zero.length === 0) continue;
    locate ??= entryLocator(files, entryPoint);
    index ??= indexBlocks(files);
    const at = locate(directive.date, (line) => mayWrite(line, zero[0]!));
    const block = at === null ? undefined : index.at(at.file, at.line);
    const lines = block === undefined ? [] : bodyLines(block);
    for (const posting of zero) {
      const found = lines.findIndex(({ text }) => mayWrite(text, posting));
      const line = found === -1 ? at?.line : lines.splice(found, 1)[0]!.line;
      errors.push({
        message: `Amount is zero: "${posting.units!.number} ${posting.units!.currency}"`,
        code: "ZERO_UNITS_AT_COST",
        phase: "validate",
        hint: null,
        file: at?.file ?? null,
        line: line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
        severity: "error",
      });
    }
  }
  return errors;
}
