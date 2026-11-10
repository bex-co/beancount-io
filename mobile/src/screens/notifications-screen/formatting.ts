import { isolateParts } from "../../common/bidi";
import { formatMoment } from "../../common/date-format";
import { errorHint, errorMessageWithHint } from "../../common/new-ledger-error";
export type LedgerError = {
  filename?: string | null;
  lineno?: number | null;
  message: string;
  hint?: string | null;
};

export function formatErrorLocation(error: LedgerError): string {
  if (!error.filename) return error.message;
  const line = error.lineno != null ? `:${error.lineno}` : "";
  return `${error.filename}${line}`;
}

/**
 * What copying an error row puts on the clipboard: the message, the engine's
 * hint when it has one, then where it is ("main.bean:12") on its own line, to
 * search for or send to someone (w21/432, w21/424).
 */
export function errorCopyText(error: LedgerError): string {
  const hint = errorHint(error);
  const text = hint ? `${error.message}\n${hint}` : error.message;
  return error.filename ? `${text}\n${formatErrorLocation(error)}` : text;
}

/** What a screen reader says for an error row: message, hint, then place. */
export function errorSpokenText(error: LedgerError): string {
  const head = errorMessageWithHint(error);
  return error.filename ? `${head}. ${formatErrorLocation(error)}` : head;
}

export function formatShortSha(sha: string, shortSha?: string | null): string {
  return shortSha ?? sha.slice(0, 7);
}

/**
 * What a commit row reads as one sentence, in the order it shows: the subject
 * (or `noMessage` for a commit with an empty message, which rendered a blank
 * row), then "author · date", then the short SHA. A label on a pressable
 * replaces its children, so with the subject alone VoiceOver spoke five
 * identical "qa: mobile remove" rows (w21/224).
 */
export function commitRowAccessibilityLabel(
  commit: {
    subject: string;
    sha: string;
    shortSha?: string | null;
    author: { name: string; date?: unknown };
  },
  noMessage: string,
  locale: string,
): string {
  return [
    commit.subject || noMessage,
    // Plain text: what is spoken needs no direction marks (w22/010).
    commitAuthorParts(commit.author.name, commit.author.date, locale).join(
      AUTHOR_SEPARATOR,
    ),
    formatShortSha(commit.sha, commit.shortSha),
  ].join(", ");
}

/**
 * The muted line under a commit: its author and, when the commit carries a
 * usable timestamp, the day and time it was made in the reader's locale and
 * zone, so same-day commits differ by more than their SHA (w21/487). A missing or
 * unparseable date shows the author alone, never "Invalid Date" or 1970.
 */
export function formatCommitAuthorLine(
  name: string,
  date: unknown,
  locale: string,
  timeZone?: string,
): string {
  return isolateParts(
    commitAuthorParts(name, date, locale, timeZone),
    AUTHOR_SEPARATOR,
  );
}

const AUTHOR_SEPARATOR = " · ";

/** The author and, when the commit has a usable date, when it was made. */
function commitAuthorParts(
  name: string,
  date: unknown,
  locale: string,
  timeZone?: string,
): string[] {
  const moment = formatMoment(date, locale, timeZone);
  return moment ? [name, moment] : [name];
}

const LIST_ITEM = /^\s*([-*+•] |\d+[.)] )/;
// Git trailers such as `Co-Authored-By: …` keep one per line.
const TRAILER_LINE = /^[A-Za-z][A-Za-z0-9-]*: \S/;

/**
 * Join one paragraph's hard-wrapped lines. A list item starts its own row and
 * absorbs its continuation lines, indented or not. Any other indented line
 * (code, quoted output) keeps its row, and prose never joins onto it.
 */
function reflowParagraph(lines: string[]): string {
  if (lines.every((line) => TRAILER_LINE.test(line))) return lines.join("\n");
  const out: string[] = [];
  let last: "prose" | "item" | "code" | null = null;
  for (const line of lines) {
    const kind = LIST_ITEM.test(line)
      ? "item"
      : /^\s/.test(line)
        ? "code"
        : "prose";
    const continues =
      kind !== "item" &&
      (last === "item" || (kind === "prose" && last === "prose"));
    if (continues) {
      out[out.length - 1] = `${out[out.length - 1].trimEnd()} ${line.trim()}`;
    } else {
      out.push(line.trimEnd());
      last = kind;
    }
  }
  return out.join("\n");
}

/**
 * A commit message as git writes it — a subject line, a blank line, then a
 * body hard-wrapped near 72 columns, usually ending in a newline — split for
 * display. The subject is the first non-blank line. The body is everything
 * after it, trimmed, or null when there is none. Its single line breaks are
 * joined so paragraphs reflow to the screen; blank-line paragraph breaks,
 * indented and list lines, and trailer blocks keep their own lines.
 */
export function splitCommitMessage(message: string): {
  subject: string;
  body: string | null;
} {
  const lines = message.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first === -1) return { subject: "", body: null };
  const rest = lines
    .slice(first + 1)
    .join("\n")
    .trim();
  const body = rest
    ? rest
        .split(/\n[ \t]*\n/)
        .map((paragraph) => paragraph.replace(/^\n+|\n+$/g, ""))
        .filter((paragraph) => paragraph.trim() !== "")
        .map((paragraph) => reflowParagraph(paragraph.split("\n")))
        .join("\n\n")
    : null;
  return { subject: lines[first].trim(), body };
}
