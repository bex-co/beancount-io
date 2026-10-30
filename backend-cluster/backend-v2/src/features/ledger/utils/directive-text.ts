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
 * Undated statements that configure the ledger rather than record anything
 * (w23/018). An appended `option "operating_currency"` changes every report's
 * currency, `plugin "…auto_accounts"` switches off the open-account check this
 * tool's own validation relies on, and `include` pulls in a whole file — each
 * reported "No new bean-check errors". They are refused as text to append;
 * a deliberate configuration change is a file edit. `pushtag`/`poptag` and
 * `pushmeta`/`popmeta` only annotate the entries between them, so they are
 * applied to those entries instead (see `TagStack`).
 */
const CONFIGURATION_KEYWORDS = new Set(["option", "plugin", "include"]);

/** Where a line's comment starts, outside any string; its length if none. */
function commentStart(line: string): number {
  let inString = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === ";") return i;
  }
  return line.length;
}

/**
 * The `pushtag`/`pushmeta` stacks, expanded onto the entries between push and
 * pop (w23/041). The stack is positional in Beancount, and every appended
 * entry is moved to its date position, so the statements themselves would
 * end up apart from the entries they annotate: the tag silently dropped, or a
 * dangling `pushtag` breaking the file. Tags go on transactions, the only
 * directive Beancount tags from the stack; metadata goes on every directive.
 */
class TagStack {
  private readonly tags: { tag: string; line: number }[] = [];
  private readonly meta = new Map<string, { value: string; line: number }>();

  /** Apply one statement; false when the line is not a stack statement. */
  apply(line: string, lineNumber: number): boolean {
    const keyword = /^(pushtag|poptag|pushmeta|popmeta)\b/.exec(line)?.[1];
    if (!keyword) return false;
    const body = line.slice(keyword.length, commentStart(line)).trim();
    const refuse = (problem: string) => {
      throw new BadUserInputError(
        `line ${lineNumber}: ${problem}: ${line.trim()}`,
        "text",
      );
    };
    if (keyword === "pushtag" || keyword === "poptag") {
      const tag = /^#([^\s#^]+)$/.exec(body)?.[1];
      if (!tag) refuse(`\`${keyword}\` takes one #tag`);
      if (keyword === "pushtag")
        this.tags.push({ tag: tag!, line: lineNumber });
      else {
        const at = this.tags.map((entry) => entry.tag).lastIndexOf(tag!);
        if (at === -1) refuse(`\`poptag #${tag}\` has no matching pushtag`);
        this.tags.splice(at, 1);
      }
      return true;
    }
    const pair = /^([a-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(body);
    if (!pair) refuse(`\`${keyword}\` takes a metadata key`);
    const [, key, value] = pair!;
    if (keyword === "pushmeta") {
      if (!value) refuse("`pushmeta` needs a value");
      this.meta.set(key, { value, line: lineNumber });
    } else if (!this.meta.delete(key)) {
      refuse(`\`popmeta ${key}:\` has no matching pushmeta`);
    }
    return true;
  }

  /** A push left open at the end of the text is refused, naming its line. */
  assertClosed(): void {
    const open = this.tags[0] ?? [...this.meta.values()][0];
    if (!open) return;
    throw new BadUserInputError(
      `line ${open.line}: pushed ${this.tags[0] ? `#${this.tags[0].tag}` : "metadata"} is never popped`,
      "text",
    );
  }

  /** The directive's lines with the active tags and metadata written onto it. */
  annotate(lines: string[], head: number, kind: DirectiveKind): string[] {
    const header = lines[head];
    const cut = commentStart(header);
    const before = header.slice(0, cut).trimEnd();
    const present = new Set(before.match(/#[^\s#^]+/g) ?? []);
    const added =
      kind === "Transaction"
        ? [...new Set(this.tags.map((entry) => `#${entry.tag}`))].filter(
            (tag) => !present.has(tag),
          )
        : [];
    const comment = header.slice(cut);
    const annotated = [
      [before, ...added].join(" ") + (comment ? ` ${comment}` : ""),
    ];
    const keys = new Set(
      lines
        .slice(head + 1)
        .map((line) => /^\s+([a-z][A-Za-z0-9_-]*):/.exec(line)?.[1]),
    );
    for (const [key, { value }] of this.meta) {
      if (!keys.has(key)) annotated.push(`  ${key}: ${value}`);
    }
    return [...lines.slice(0, head), ...annotated, ...lines.slice(head + 1)];
  }
}

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
/** An org-mode heading, which Beancount reads as a section title. */
const ORG_HEADING = /^\*+\s/;
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
  let current: {
    head: ReturnType<typeof directiveHead>;
    lines: string[];
    /** Index of the directive's own first line, after any comments above it. */
    headLine: number;
  } | null = null;
  const stack = new TagStack();

  const flush = () => {
    if (!current?.head) return;
    directives.push({
      date: current.head.date,
      kind: current.head.kind,
      text: stack
        .annotate(current.lines, current.headLine, current.head.kind)
        .join("\n")
        .replace(/\s+$/, ""),
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
    const keyword = /^([a-z]+)\b/.exec(line)?.[1];
    if (keyword && CONFIGURATION_KEYWORDS.has(keyword)) {
      throw new BadUserInputError(
        `line ${index + 1}: \`${keyword}\` configures the ledger and is not appended as an entry: ${line.trim()}`,
        "text",
        "Append dated directives only. To change the ledger's options, plugins or includes deliberately, edit the main file with `updateLedgerFiles`.",
      );
    }
    // The current directive takes the stack as it stood at its header.
    flush();
    if (stack.apply(line, index + 1)) return;
    current = { head, lines: [...pending, line], headLine: pending.length };
    pending = [];
  });
  flush();
  stack.assertClosed();

  if (directives.length === 0) {
    throw new BadUserInputError(
      'text contains no Beancount directives. Send directive text such as `2026-01-02 * "Payee" "Narration"` with its postings indented beneath.',
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

  const inserted: { line: number }[] = [];
  const working = [...lines];
  // Applied newest-first would shift the offsets of the ones after it, so
  // each insertion recomputes against the file as it now stands.
  for (const directive of directives) {
    // A later directive's text carries the blank line that separated it from
    // the one before; the prefix below is the only separator, so drop them.
    const lines = directive.text.split("\n");
    const first = lines.findIndex((line) => !isBlank(line));
    const block = first > 0 ? lines.slice(first) : lines;
    const at = sorted ? placeUnderHeading(working, directive) : working.length;
    // `at > 0` already implies the file is non-empty and that `working[at-1]`
    // exists, so this is the whole condition.
    const prefix = at > 0 && !isBlank(working[at - 1]) ? [""] : [];
    working.splice(at, 0, ...prefix, ...block);
    // A directive already placed at or below this one moves down with it;
    // the reported lines locate the entries' hashes (w23/060).
    for (const earlier of inserted) {
      if (earlier.line > at) earlier.line += prefix.length + block.length;
    }
    inserted.push({ line: at + prefix.length + 1 });
  }

  const content = `${working.join("\n").replace(/\n+$/, "")}\n`;
  return { content, inserted, appended: !sorted };
}

/**
 * The line index a directive of this date belongs at: just past the end of
 * the last directive dated on or before it, so it follows that one rather
 * than splitting it from its postings. `after` is that directive's kind, null
 * when the directive goes first.
 */
function insertionPoint(
  lines: readonly string[],
  date: string | null,
): { at: number; after: DirectiveKind | null } {
  if (date === null) return { at: lines.length, after: null };
  // The end of the last directive dated on or before this one. Null until we
  // have seen one, which is also what "insert at the top" looks like.
  let last: { end: number; kind: DirectiveKind } | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isBlank(line) || isComment(line) || isContinuation(line)) continue;
    const head = directiveHead(line);
    if (!head) continue;
    if (head.date !== null && head.date > date) {
      return last
        ? { at: last.end, after: last.kind }
        : { at: index, after: null };
    }
    last = { end: endOfBlock(lines, index), kind: head.kind };
  }
  return last
    ? { at: last.end, after: last.kind }
    : { at: lines.length, after: null };
}

/**
 * Where a directive goes, past any org headings between its insertion point
 * and the next directive when it follows one of another kind: it then starts
 * the section those headings open. On the starter ledger the first
 * transaction followed the last `1970-01-01 open`, inside `* Accounts`, and
 * left `* Transactions` an empty heading at the bottom (w23/076). One of the
 * same kind stays with its own, so a new `open` stays under `* Accounts` and a
 * transaction dated before a `* 2022` heading stays in 2021. A comment stops
 * the walk: it belongs to the directive below it.
 */
function placeUnderHeading(
  lines: readonly string[],
  directive: ParsedDirective,
): number {
  const { at, after } = insertionPoint(lines, directive.date);
  if (after === null || after === directive.kind) return at;
  let end = at;
  for (let index = at; index < lines.length; index += 1) {
    if (isBlank(lines[index])) continue;
    if (!ORG_HEADING.test(lines[index])) break;
    end = index + 1;
  }
  return end;
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
