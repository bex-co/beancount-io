import type { BeancountError, DirectiveJson } from "@rustledger/wasm";

const AVERAGE = "AVERAGE";
const OPTION = /^option\s+"booking_method"\s+"([A-Z_]+)"/mu;

/**
 * Beancount 3 has no AVERAGE booking: a sale from a position booked that way
 * fails with "AVERAGE method is not supported" and is not booked. rustledger
 * books it at the average cost, so a ledger bean-check refuses read as clean
 * here, with gains Beancount would not compute (w21/708). The CLI already
 * refuses to open an AVERAGE account (w5/162, w5/764); the hosted ledger
 * reports the error Beancount does, on each transaction that reduces such a
 * position.
 *
 * The errors take the engine's own booking-error form (`BOOK`, no file, the
 * entry's date and narration at the end), which `locateBookErrors` puts on the
 * transaction's line.
 *
 * `directives` is the booked stream in date order; `entryPointSource` holds
 * the ledger's options, `booking_method` among them.
 */
export function averageBookingErrors(
  directives: readonly DirectiveJson[],
  entryPointSource: string | undefined,
): BeancountError[] {
  const byDefault = OPTION.exec(entryPointSource ?? "")?.[1] === AVERAGE;
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
  const errors: BeancountError[] = [];
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    let reduces = false;
    for (const posting of directive.postings) {
      if (!posting.cost || !average.has(posting.account) || !posting.units) {
        continue;
      }
      const key = `${posting.account}\u0000${posting.units.currency}`;
      const units = Number(posting.units.number);
      const before = held.get(key) ?? 0;
      if (before * units < 0) reduces = true;
      held.set(key, before + units);
    }
    if (!reduces) continue;
    errors.push({
      message: `AVERAGE method is not supported (${directive.date}, ${JSON.stringify(directive.narration ?? "")})`,
      code: "BOOK",
      phase: "validate",
      hint: null,
      file: null,
      line: null,
      column: null,
      end_line: null,
      end_column: null,
      severity: "error",
    });
  }
  return errors;
}
