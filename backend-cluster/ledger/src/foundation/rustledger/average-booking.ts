import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { entryLocator } from "./block-index";

const AVERAGE = "AVERAGE";
const OPTION = /^option\s+"booking_method"\s+"([A-Z_]+)"/gmu;
const MESSAGE = "AVERAGE method is not supported";
/**
 * A posting line's account, number and commodity, after its flag if it has
 * one: `! Assets:…`, `!Assets:…` or `M Assets:…`. The flag was read as the
 * account, so a flagged sale lost its file and line (w21/733).
 */
const POSTING =
  /^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?(\S+)\s+(-?\d[\d,]*(?:\.\d+)?)\s+(\S+)/u;

type Units = { number: string; currency: string };

/**
 * Where each refused sale is written: the first unclaimed dated block, in
 * include order, holding a posting of those units to that account. Located by
 * its date and narration afterwards, a sale went without a file or line when
 * another entry that day shared its narration, or when it had no strings, so
 * its notification could not be opened (w21/721).
 */
function saleLocator(files: FileMap, entryPoint: string) {
  const locate = entryLocator(files, entryPoint);
  const holds = (line: string, account: string, units: Units) => {
    const posting = POSTING.exec(line);
    return (
      posting !== null &&
      posting[1] === account &&
      posting[3] === units.currency &&
      Number(posting[2]!.replace(/,/gu, "")) === Number(units.number)
    );
  };
  return (date: string, account: string, units: Units) =>
    locate(date, (line) => holds(line, account, units));
}

/**
 * Beancount 3 has no AVERAGE booking: a sale from a position booked that way
 * fails with "AVERAGE method is not supported" and is not booked. rustledger
 * books it at the average cost, so a ledger bean-check refuses read as clean
 * here, with gains Beancount would not compute (w21/708). The CLI already
 * refuses to open an AVERAGE account (w5/162, w5/764); the hosted ledger
 * reports the error Beancount does, on each transaction that reduces such a
 * position.
 *
 * Each error is placed on the sale's own first line, with Beancount's words. A
 * sale whose posting cannot be read off the source (units written as an
 * expression) takes the engine's own booking-error form instead (`BOOK`, no
 * file, the entry's date and narration at the end), which `locateBookErrors`
 * puts on the transaction's line where it can.
 *
 * `directives` is the booked stream in date order; `files[entryPoint]` holds
 * the ledger's options, `booking_method` among them.
 */
export function averageBookingErrors(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  // The last one wins, as the engine says when an option is set twice; the
  // first was read, so AVERAGE then FIFO raised a false error (w21/722).
  const byDefault =
    [...(files[entryPoint] ?? "").matchAll(OPTION)].at(-1)?.[1] === AVERAGE;
  const average = new Set<string>();
  for (const directive of directives) {
    if (directive.type !== "open") continue;
    if ((directive.booking ?? (byDefault ? AVERAGE : "")) === AVERAGE) {
      average.add(directive.account);
    }
  }
  if (average.size === 0) return [];

  // Units held at cost, per account and commodity, as booked so far.
  const held = new Map<string, number>();
  const locate = saleLocator(files, entryPoint);
  const errors: BeancountError[] = [];
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    let sale: { account: string; units: Units } | null = null;
    for (const posting of directive.postings) {
      if (!posting.cost || !average.has(posting.account) || !posting.units) {
        continue;
      }
      const key = `${posting.account}\u0000${posting.units.currency}`;
      const units = Number(posting.units.number);
      const before = held.get(key) ?? 0;
      if (before * units < 0) {
        sale ??= { account: posting.account, units: posting.units };
      }
      held.set(key, before + units);
    }
    if (sale === null) continue;
    const at = locate(directive.date, sale.account, sale.units);
    errors.push({
      message: at
        ? MESSAGE
        : `${MESSAGE} (${directive.date}, ${JSON.stringify(directive.narration ?? "")})`,
      code: "BOOK",
      phase: "validate",
      hint: null,
      file: at?.file ?? null,
      line: at?.line ?? null,
      column: at ? 1 : null,
      end_line: null,
      end_column: null,
      severity: "error",
    });
  }
  return errors;
}
