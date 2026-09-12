import { BadUserInputError } from "@/shared/errors";

/**
 * Beancount text, as directives (w2/m28:t005).
 *
 * Agents write Beancount fluently — it is the format they already maintain in
 * local ledgers — and the hosted write path asked them to learn a 5 KB
 * structured entry schema instead. The field audit's agents did neither:
 * they reached for `editLedgerFiles` and did string surgery, which is how
 * entries ended up appended to `main.bean` out of date order.
 *
 * This module is the small amount of understanding needed to accept the text
 * an agent would write: which directives it contains, so a call can be routed
 * and counted, and where each one belongs in a file that is kept in date
 * order. It is deliberately *not* a Beancount parser — the ledger service
 * bean-checks the projected file, which is the authority on whether the text
 * is valid. What is enforced here is only that the input is directives at all,
 * so a caller who pastes prose or a diff learns that before anything is
 * written.
 */

/** Directive keywords that carry no date and start at column 0. */
const UNDATED_KEYWORDS = new Set([
  "option",
  "include",
  "plugin",
  "pushtag",
  "poptag",
  "pushmeta",
  "popmeta",
]);

/**
 * Dated directive keywords, mapped to the file-routing type
 * `resolveEntryFile` understands. Anything else after a date is a transaction
 * flag — `*`, `!`, `txn`, and the other flag characters Beancount allows.
 */
const DATED_KEYWORDS: Record<string, DirectiveKind> = {
  open: "Open",
  close: "Close",
  commodity: "Commodity",
  price: "Price",
  balance: "Balance",
  pad: "Pad",
  note: "Note",
  document: "Document",
  event: "Event",
  custom: "Custom",
  budget: "Budget",
  query: "Custom",
};

type DirectiveKind =
  | "Transaction"
  | "Open"
  | "Close"
  | "Price"
  | "Balance"
  | "Note"
  | "Pad"
  | "Document"
  | "Budget"
  | "Commodity"
  | "Custom"
  | "Event";

export interface ParsedDirective {
  /** ISO date, or `null` for `option`/`include`/`plugin` and friends. */
  readonly date: string | null;
  readonly kind: DirectiveKind;
  /** The directive's own lines, comments above it included, without a trailing newline. */
  readonly text: string;
}

const DATE_LINE = /^(\d{4}-\d{2}-\d{2})[ \t]+(\S+)/;

/** Does this line start a directive at column 0? */
function directiveHead(
  line: string,
): { date: string | null; kind: DirectiveKind } | null {
  const dated = DATE_LINE.exec(line);
  if (dated) {
    const [, date, keyword] = dated;
    return { date, kind: DATED_KEYWORDS[keyword] ?? "Transaction" };
  }
  const keyword = /^([a-z]+)\b/.exec(line)?.[1];
  if (keyword && UNDATED_KEYWORDS.has(keyword)) {
    return { date: null, kind: "Custom" };
  }
  return null;
}

const isBlank = (line: string) => line.trim().length === 0;
const isComment = (line: string) => line.trimStart().startsWith(";");
/** Indented lines continue the directive above them. */
const isContinuation = (line: string) => /^[ \t]/.test(line);

/**
 * Split Beancount text into its directives.
 *
 * Throws `BadUserInputError` naming the offending line when a line at column 0
 * is neither blank, a comment, nor the start of a directive — the case where a
 * caller pasted prose, a diff, or JSON and would otherwise have it committed
 * verbatim and discover the problem as a bean-check error later.
 */
export function parseDirectiveText(text: string): ParsedDirective[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const directives: ParsedDirective[] = [];
  // Comments and blanks seen since the last directive ended. They belong to
  // whatever comes next — a `; groceries` line above a transaction is that
  // transaction's comment — and are dropped if nothing does.
  let pending: string[] = [];
  let current: { head: ReturnType<typeof directiveHead>; lines: string[] } | null =
    null;

  const flush = () => {
    if (!current?.head) return;
    directives.push({
      date: current.head.date,
      kind: current.head.kind,
      text: current.lines.join("\n").replace(/\s+$/, ""),
    });
    current = null;
  };

  lines.forEach((line, index) => {
    if (isBlank(line)) {
      if (current) pending.push(line);
      return;
    }
    if (isContinuation(line)) {
      if (!current) {
        throw new BadUserInputError(
          `line ${index + 1}: indented line has no directive above it: ${line.trim()}`,
        );
      }
      current.lines.push(...pending, line);
      pending = [];
      return;
    }
    if (isComment(line)) {
      pending.push(line);
      return;
    }
    const head = directiveHead(line);
    if (!head) {
      throw new BadUserInputError(
        `line ${index + 1}: not a Beancount directive: ${line.trim()}`,
      );
    }
    flush();
    current = { head, lines: [...pending, line] };
    pending = [];
  });
  flush();

  if (directives.length === 0) {
    throw new BadUserInputError(
      "text contains no Beancount directives. Send directive text such as `2026-01-02 * \"Payee\" \"Narration\"` with its postings indented beneath.",
    );
  }
  return directives;
}

interface InsertedDirective {
  /** 1-based line the directive's first line landed on. */
  readonly line: number;
}

export interface InsertionResult {
  readonly content: string;
  readonly inserted: readonly InsertedDirective[];
  /**
   * True when the file's existing directives were not already in date order,
   * so the new ones were appended at the end rather than threaded in. Saying
   * so is the point: silently "sorting" into an unsorted file would move an
   * entry somewhere the author did not put it.
   */
  readonly appended: boolean;
}

/**
 * Insert directives into a file, keeping it in date order.
 *
 * Each new directive lands after the last existing directive dated on or
 * before it. A file whose own directives are out of order gets them appended
 * at the end instead — see {@link InsertionResult.appended}.
 */
export function insertDirectives(
  existing: string,
  directives: readonly ParsedDirective[],
): InsertionResult {
  const normalized = existing.replace(/\r\n?/g, "\n");
  const lines = normalized === "" ? [] : normalized.split("\n");

  // Where each existing directive starts, and on what date.
  const heads: { index: number; date: string | null }[] = [];
  lines.forEach((line, index) => {
    if (isBlank(line) || isComment(line) || isContinuation(line)) return;
    const head = directiveHead(line);
    if (head) heads.push({ index, date: head.date });
  });

  const dated = heads.filter((head) => head.date !== null);
  const sorted = dated.every(
    (head, i) => i === 0 || dated[i - 1].date! <= head.date!,
  );

  const inserted: InsertedDirective[] = [];
  const working = [...lines];
  // Applied newest-first would shift the offsets of the ones after it, so
  // each insertion recomputes against the file as it now stands.
  for (const directive of directives) {
    const block = directive.text.split("\n");
    const at = sorted
      ? insertionPoint(working, directive.date)
      : working.length;
    // `at > 0` already implies the file is non-empty and that `working[at-1]`
    // exists, so this is the whole condition.
    const prefix = at > 0 && !isBlank(working[at - 1]) ? [""] : [];
    working.splice(at, 0, ...prefix, ...block);
    inserted.push({ line: at + prefix.length + 1 });
  }

  const content = `${working.join("\n").replace(/\n+$/, "")}\n`;
  return { content, inserted, appended: !sorted };
}

/**
 * The line index a directive of this date belongs at: just past the end of
 * the last directive dated on or before it, so it follows that one rather
 * than splitting it from its postings.
 */
function insertionPoint(lines: readonly string[], date: string | null): number {
  if (date === null) return lines.length;
  // The end of the last directive dated on or before this one. Null until we
  // have seen one, which is also what "insert at the top" looks like.
  let lastEligibleEnd: number | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isBlank(line) || isComment(line) || isContinuation(line)) continue;
    const head = directiveHead(line);
    if (!head) continue;
    if (head.date !== null && head.date > date) return lastEligibleEnd ?? index;
    lastEligibleEnd = endOfBlock(lines, index);
  }
  return lastEligibleEnd ?? lines.length;
}

/** One past the last line belonging to the directive starting at `start`. */
function endOfBlock(lines: readonly string[], start: number): number {
  let end = start + 1;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (isContinuation(line) && !isBlank(line)) {
      end = index + 1;
      continue;
    }
    if (isBlank(line)) continue;
    break;
  }
  return end;
}
