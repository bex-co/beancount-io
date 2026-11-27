import { BadUserInputError } from "@/shared/errors";
import { splitByteOrderMark } from "./byte-order-mark";
import { isSkippedLine } from "./skipped-line";

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

/**
 * One line read from `inString` on (`"` escapes with a backslash; `;` outside
 * a string starts a comment): where its comment starts, or its length if it
 * has none; its code with each string blanked out; and whether it ends inside
 * a string.
 */
function scanLine(
  line: string,
  inString = false,
): { comment: number; code: string; inString: boolean } {
  let code = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      code += " ";
    } else if (char === ";") return { comment: i, code, inString };
    else code += char;
  }
  return { comment: line.length, code, inString };
}

/** Where a line's comment starts, outside any string; its length if none. */
const commentStart = (line: string): number => scanLine(line).comment;

/** A `pushtag`/`poptag`/`pushmeta`/`popmeta` line, read. */
type StackStatement =
  | { readonly keyword: "pushtag" | "poptag"; readonly tag: string }
  | {
      readonly keyword: "pushmeta" | "popmeta";
      readonly key: string;
      readonly value: string;
    };

/**
 * Read a stack statement at column 0: null when the line is not one, and
 * what is wrong with it, as a string, when it is one written wrongly.
 */
function readStackStatement(line: string): StackStatement | string | null {
  const keyword = /^(pushtag|poptag|pushmeta|popmeta)\b/.exec(line)?.[1] as
    | StackStatement["keyword"]
    | undefined;
  if (!keyword) return null;
  const body = line.slice(keyword.length, commentStart(line)).trim();
  if (keyword === "pushtag" || keyword === "poptag") {
    const tag = /^#([^\s#^]+)$/.exec(body)?.[1];
    return tag ? { keyword, tag } : `\`${keyword}\` takes one #tag`;
  }
  const pair = /^([a-z][A-Za-z0-9_-]+):\s*(.*)$/.exec(body);
  if (!pair) {
    // The lexer's key needs two characters: a lone `k:` is not one (w23/237).
    return /^[a-z]:/.test(body)
      ? "a metadata key needs at least two characters"
      : `\`${keyword}\` takes a metadata key`;
  }
  const [, key, value] = pair;
  if (keyword === "pushmeta" && !value) return "`pushmeta` needs a value";
  return { keyword, key, value };
}

/**
 * The directives Beancount gives the `pushtag` stack's tags: transactions,
 * notes and documents (`_finalize_tags_links`; the ledger service restores
 * the engine's for notes and documents, w21/655). No other directive can
 * carry a tag.
 */
const STACK_TAGGED_KINDS: ReadonlySet<DirectiveKind> = new Set([
  "Transaction",
  "Note",
  "Document",
]);

/** A `#tag` token, read from a line's code outside its strings. */
const TAG_TOKEN = /#[^\s#^]+/g;

/**
 * The `pushtag`/`pushmeta` stacks, expanded onto the entries between push and
 * pop (w23/041). The stack is positional in Beancount, and every appended
 * entry is moved to its date position, so the statements themselves would
 * end up apart from the entries they annotate: the tag silently dropped, or a
 * dangling `pushtag` breaking the file. Tags go on the directives Beancount
 * tags from the stack ({@link STACK_TAGGED_KINDS}); metadata goes on every
 * directive, as the engine reads `pushmeta`.
 */
class TagStack {
  private readonly tags: { tag: string; line: number }[] = [];
  /**
   * Each pushed key's values, latest last (w31/029). Beancount keeps a stack
   * per key: a second `pushmeta` of a key shadows the first until its
   * `popmeta`, which brings the first back.
   */
  private readonly meta = new Map<string, { value: string; line: number }[]>();

  /** Apply one statement; false when the line is not a stack statement. */
  apply(line: string, lineNumber: number): boolean {
    const statement = readStackStatement(line);
    if (statement === null) return false;
    const refuse = (problem: string) =>
      new BadUserInputError(
        `line ${lineNumber}: ${problem}: ${line.trim()}`,
        "text",
      );
    if (typeof statement === "string") throw refuse(statement);
    if ("tag" in statement) {
      const { keyword, tag } = statement;
      if (keyword === "pushtag") this.tags.push({ tag, line: lineNumber });
      else {
        const at = this.tags.map((entry) => entry.tag).lastIndexOf(tag);
        if (at === -1)
          throw refuse(`\`poptag #${tag}\` has no matching pushtag`);
        this.tags.splice(at, 1);
      }
      return true;
    }
    const { keyword, key, value } = statement;
    const values = this.meta.get(key);
    if (keyword === "pushmeta") {
      if (values) values.push({ value, line: lineNumber });
      else this.meta.set(key, [{ value, line: lineNumber }]);
    } else if (!values) {
      throw refuse(`\`popmeta ${key}:\` has no matching pushmeta`);
    } else {
      values.pop();
      if (values.length === 0) this.meta.delete(key);
    }
    return true;
  }

  /** A push left open at the end of the text is refused, naming its line. */
  assertClosed(): void {
    const open = this.tags[0] ?? [...this.meta.values()][0]?.[0];
    if (!open) return;
    throw new BadUserInputError(
      `line ${open.line}: pushed ${this.tags[0] ? `#${this.tags[0].tag}` : "metadata"} is never popped`,
      "text",
    );
  }

  /**
   * The directive's lines with the active tags and metadata written onto it,
   * as the engine reads the same entry inside the scope (w31/018). Tags go
   * after the header's last token and before its comment: on the line its
   * strings close on, since a narration or a note's comment can run onto an
   * indented line. Each key goes on its own line under the header. A tag the
   * entry writes itself, outside its strings, and a key it sets above its
   * first posting are not written again.
   */
  annotate(lines: string[], head: number, kind: DirectiveKind): string[] {
    const own = new Set<string>();
    const readTags = (code: string) => {
      for (const tag of code.match(TAG_TOKEN) ?? []) own.add(tag);
    };
    let end = head;
    let scan = scanLine(lines[head]);
    readTags(scan.code);
    while (scan.inString && end + 1 < lines.length) {
      end += 1;
      scan = scanLine(lines[end], true);
      readTags(scan.code);
    }
    // A string that never closes is the text's own error; bean-check names it.
    if (scan.inString) return lines;

    // The entry's own metadata and tag lines run until its first posting.
    const keys = new Set<string>();
    let inside = false;
    for (const line of lines.slice(end + 1)) {
      const continued = inside;
      const read = scanLine(line, inside);
      inside = read.inString;
      if (continued) continue;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(";")) continue;
      const key = /^\s+([a-z][A-Za-z0-9_-]+):/.exec(line)?.[1];
      if (key) keys.add(key);
      else if (/^[#^]/.test(trimmed)) readTags(read.code);
      else break;
    }

    const added = STACK_TAGGED_KINDS.has(kind)
      ? [...new Set(this.tags.map((entry) => `#${entry.tag}`))].filter(
          (tag) => !own.has(tag),
        )
      : [];
    const header = lines[end];
    const before = header.slice(0, scan.comment).trimEnd();
    const comment = header.slice(scan.comment);
    const annotated = [
      [before, ...added].join(" ") + (comment ? ` ${comment}` : ""),
    ];
    for (const [key, values] of this.meta) {
      if (!keys.has(key)) annotated.push(`  ${key}: ${values.at(-1)!.value}`);
    }
    return [...lines.slice(0, end), ...annotated, ...lines.slice(end + 1)];
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

/** Whether `lines` end inside a quoted string. */
const endsInsideString = (lines: readonly string[]): boolean =>
  lines.reduce((inside, line) => scanLine(line, inside).inString, false);

/**
 * Two things stock Beancount reads that this tool's line classifier does not
 * (w23/240): a `YYYY/MM/DD` date, and a quoted string that spans lines, whose
 * second line starts at column 0. `updateLedgerFiles` takes both; naming the way
 * out is the difference between a dead end and a retry.
 */
function notADirectiveHint(
  line: string,
  open: readonly string[] | undefined,
): string | undefined {
  if (/^\d{4}\/\d{2}\/\d{2}[ \t]/.test(line)) {
    return "Beancount accepts a YYYY/MM/DD date, but this tool reads only YYYY-MM-DD: write the date with dashes, or edit the file with `updateLedgerFiles`.";
  }
  if (open && endsInsideString(open)) {
    return "A quoted string cannot span lines in appended text. Put it on one line, or add the entry with `addLedgerEntries` or edit the file with `updateLedgerFiles`, which accept a multi-line string.";
  }
  return undefined;
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
        "text",
        notADirectiveHint(line, current?.lines),
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
 * at the end instead — see {@link InsertionResult.appended}. Neither place
 * may leave it inside a `pushtag`/`pushmeta` scope the file opened, or it
 * would take that scope's tag or metadata — see {@link outsideScopes}.
 */
export function insertDirectives(
  existing: string,
  directives: readonly ParsedDirective[],
): InsertionResult {
  // Read past a leading byte-order mark, as the engine does: in front of
  // line 1 it hid that line's `pushtag` or date, so an entry was threaded
  // into the file's scope or out of date order (w31/100). It is written back.
  const { bom, text } = splitByteOrderMark(existing);
  // A Windows-authored file keeps CRLF: rejoining with LF rewrote every line,
  // so each append was a whole-file diff (w1/197). Detected as the ledger
  // service's own appends and edits detect it (w21/673, w21/252).
  const eol = lineEndingOf(text);
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized === "" ? [] : normalized.split("\n");

  // Where each existing directive starts, and on what date.
  const initialInString = lineStartsInString(lines);
  const heads: { index: number; date: string | null }[] = [];
  lines.forEach((line, index) => {
    if (
      initialInString[index] ||
      isBlank(line) ||
      isComment(line) ||
      isContinuation(line)
    )
      return;
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
    const startsInString = lineStartsInString(working);
    const { at, open, stepped } = outsideScopes(
      working,
      sorted
        ? placeUnderHeading(working, directive, startsInString)
        : working.length,
      startsInString,
    );
    // `at > 0` already implies the file is non-empty and that `working[at-1]`
    // exists, so this is the whole condition.
    const prefix = at > 0 && !isBlank(working[at - 1]) ? [""] : [];
    // Stepped back, the directive sits just above the pushes it stepped over.
    const suffix =
      stepped && at < working.length && !isBlank(working[at]) ? [""] : [];
    const written = [
      ...prefix,
      ...open.map((push) => push.pop).reverse(),
      ...block,
      ...open.flatMap((push) => push.push),
      ...suffix,
    ];
    working.splice(at, 0, ...written);
    // A directive already placed at or below this one moves down with it;
    // the reported lines locate the entries' hashes (w23/060).
    for (const earlier of inserted) {
      if (earlier.line > at) earlier.line += written.length;
    }
    inserted.push({ line: at + prefix.length + open.length + 1 });
  }

  const content = `${bom}${working.join(eol).replace(/(?:\r?\n)+$/, "")}${eol}`;
  return { content, inserted, appended: !sorted };
}

/**
 * Whether each line in `lines` begins inside a quoted string opened on an
 * earlier line (w31/098). Outside strings, a line Beancount skips whole
 * (`isSkippedLine`: a `*` org-mode heading, a `#` line, and the rest, w31/099)
 * opens no string, and `;` starts a comment via `scanLine`.
 */
function lineStartsInString(lines: readonly string[]): boolean[] {
  const starts: boolean[] = new Array(lines.length);
  let inString = false;
  for (let i = 0; i < lines.length; i += 1) {
    starts[i] = inString;
    if (!inString && isSkippedLine(lines[i])) continue;
    inString = scanLine(lines[i], inString).inString;
  }
  return starts;
}

/** CRLF when the file's first line ends that way, else LF. */
function lineEndingOf(content: string): "\r\n" | "\n" {
  const first = content.indexOf("\n");
  return first > 0 && content[first - 1] === "\r" ? "\r\n" : "\n";
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
  startsInString: readonly boolean[],
): { at: number; after: DirectiveKind | null } {
  if (date === null) return { at: lines.length, after: null };
  // The end of the last directive dated on or before this one. Null until we
  // have seen one, which is also what "insert at the top" looks like.
  let last: { end: number; kind: DirectiveKind } | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (startsInString[index]) continue;
    const line = lines[index];
    if (isBlank(line) || isComment(line) || isContinuation(line)) continue;
    const head = directiveHead(line);
    if (!head) continue;
    if (head.date !== null && head.date > date) {
      return last
        ? { at: last.end, after: last.kind }
        : { at: index, after: null };
    }
    last = { end: endOfBlock(lines, index, startsInString), kind: head.kind };
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
  startsInString: readonly boolean[],
): number {
  const { at, after } = insertionPoint(lines, directive.date, startsInString);
  if (after === null || after === directive.kind) return at;
  let end = at;
  for (let index = at; index < lines.length; index += 1) {
    if (startsInString[index]) break;
    if (isBlank(lines[index])) continue;
    if (!ORG_HEADING.test(lines[index])) break;
    end = index + 1;
  }
  return end;
}

/** One past the last line belonging to the directive starting at `start`. */
function endOfBlock(
  lines: readonly string[],
  start: number,
  startsInString: readonly boolean[],
): number {
  let end = start + 1;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (startsInString[index]) {
      end = index + 1;
      continue;
    }
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

/**
 * A push the file has opened and not closed: the line that closes it, and
 * the lines, as the file wrote them, that open it again.
 */
interface OpenPush {
  readonly pop: string;
  readonly push: readonly string[];
}

/** A well-formed stack statement in an existing file; anything else is null. */
function fileStatement(line: string): StackStatement | null {
  const statement = readStackStatement(line);
  return typeof statement === "object" ? statement : null;
}

/**
 * The `pushtag`/`pushmeta` scopes open where line `end` starts, oldest first.
 * A pop closes the latest push of its tag or key, as in Beancount; one that
 * closes nothing is the file's own error and changes nothing here.
 */
function openPushes(
  lines: readonly string[],
  end: number,
  startsInString: readonly boolean[],
): OpenPush[] {
  const open: OpenPush[] = [];
  for (let index = 0; index < end; index += 1) {
    if (startsInString[index]) continue;
    const line = lines[index];
    const statement = fileStatement(line);
    if (!statement) continue;
    const pop =
      "tag" in statement
        ? `poptag #${statement.tag}`
        : `popmeta ${statement.key}:`;
    if (statement.keyword.startsWith("push")) {
      let scan = scanLine(line);
      const push = [
        scan.inString ? line : line.slice(0, scan.comment).trimEnd(),
      ];
      while (scan.inString && index + 1 < end) {
        index += 1;
        const continuation = lines[index];
        scan = scanLine(continuation, true);
        push.push(
          scan.inString
            ? continuation
            : continuation.slice(0, scan.comment).trimEnd(),
        );
      }
      open.push({ pop, push });
    } else {
      const at = open.map((push) => push.pop).lastIndexOf(pop);
      if (at !== -1) open.splice(at, 1);
    }
  }
  return open;
}

/** A line a directive may step back over: a blank, a column-0 comment, a push. */
const precedesScope = (line: string) =>
  isBlank(line) ||
  (isComment(line) && !isContinuation(line)) ||
  fileStatement(line)?.keyword.startsWith("push") === true;

/**
 * Where a directive goes so that it is stored as written (w31/015). The
 * target file's `pushtag` and `pushmeta` apply by position, so a directive
 * placed by date inside a scope the file opened took its tag or metadata,
 * and the write still read "No new bean-check errors".
 *
 * Placed just past a scope's opening pushes, it steps back above them, and
 * above the comments and blank lines among them: that is before the scope's
 * first entry, so the file stays in date order. A scope still open there,
 * one it falls strictly inside, is closed around it: `open` holds the pushes
 * to pop before it and push again, in the same order and with the same
 * values, after it.
 */
function outsideScopes(
  lines: readonly string[],
  at: number,
  startsInString: readonly boolean[],
): { at: number; open: OpenPush[]; stepped: boolean } {
  const open = openPushes(lines, at, startsInString);
  if (open.length === 0) return { at, open, stepped: false };
  let start = at;
  while (start > 0) {
    if (startsInString[start - 1]) {
      let head = start - 1;
      while (head > 0 && startsInString[head]) head -= 1;
      if (fileStatement(lines[head])?.keyword === "pushmeta") {
        start = head;
        continue;
      }
      break;
    }
    if (!precedesScope(lines[start - 1])) break;
    start -= 1;
  }
  const outer = start < at ? openPushes(lines, start, startsInString) : open;
  return outer.length < open.length
    ? { at: start, open: outer, stepped: true }
    : { at, open, stepped: false };
}
