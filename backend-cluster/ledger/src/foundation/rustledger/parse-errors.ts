import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";

/** The engine's one-per-file summary of a syntax error: no file, no line. */
const LOAD_PARSE_SUMMARY = /^parse errors in /;

type LocatingModule = {
  parseMultiFile?: (
    files: FileMap,
    entryPoint: string,
  ) => { errors?: BeancountError[] } | BeancountError[];
};

/**
 * Replace the engine's located-nowhere "parse errors in main.bean" summaries
 * with the parse errors themselves, each with its file and line. A syntax
 * error in any file collapsed to one `LOAD` error per file with `file: null`
 * and `line: null`, so no client could show or jump to the bad line (w21/187).
 * `parseMultiFile` returns the same errors located (`P0012`, the file, line
 * and column); its messages lead with the file name, which is a field here.
 *
 * The engine can report one bad line twice with the same message, which read
 * as several problems and counted several times on the bell: an error repeating
 * a file, line and message goes once (w21/899).
 *
 * Errors stay as they were when there is no summary, when the module cannot
 * locate, or when it finds nothing to replace them with.
 */
export function locateParseErrors(
  errors: readonly BeancountError[],
  files: FileMap,
  entryPoint: string,
  engine: LocatingModule,
): BeancountError[] {
  const summaries = errors.filter(
    (error) => error.code === "LOAD" && LOAD_PARSE_SUMMARY.test(error.message),
  );
  if (summaries.length === 0 || typeof engine.parseMultiFile !== "function") {
    return [...errors];
  }
  let located: BeancountError[];
  try {
    const result = engine.parseMultiFile(files, entryPoint);
    located = (Array.isArray(result) ? result : (result.errors ?? [])).filter(
      (error) => error.severity === "error" && error.file !== null,
    );
  } catch {
    return [...errors];
  }
  if (located.length === 0) return [...errors];
  const rest = errors.filter((error) => !summaries.includes(error));
  const unprefixed = located.map((error) => ({
    ...error,
    message: error.file
      ? error.message.replace(`${error.file}: `, "")
      : error.message,
  }));
  const seen = new Set<string>();
  const distinct = unprefixed.filter((error) => {
    const key = JSON.stringify([error.file, error.line, error.message]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...distinct, ...rest];
}

const TRANSACTION_HEADER = /^(\d{4}-\d{2}-\d{2})\s+[*!]/;

/**
 * Drop the half-parsed transactions of a header that failed to parse. The
 * engine's error recovery keeps the header it could read (`2026-10-22 * "Joe"s"`
 * gives payee "Joe") and loses its postings, so a transaction the ledger never
 * accepted was listed with no amount while the error pointed at the same line.
 * Beancount drops such an entry: only its error remains (w21/900).
 *
 * A directive goes only when a located parse error sits on a transaction header
 * line of its date, it has no postings, and its payee or narration is written
 * on that line. A transaction written with no postings elsewhere stays.
 */
export function dropUnparsedTransactions(
  directives: DirectiveJson[],
  errors: readonly BeancountError[],
  files: FileMap,
): DirectiveJson[] {
  const dropped = new Set<DirectiveJson>();
  for (const error of errors) {
    if (error.code !== "P0012" || error.file === null || error.line === null) {
      continue;
    }
    const text = files[error.file]?.split(/\r\n|\r|\n/)[error.line - 1];
    const date = text === undefined ? null : TRANSACTION_HEADER.exec(text)?.[1];
    if (text === undefined || !date) continue;
    const half = directives.find(
      (directive) =>
        directive.type === "transaction" &&
        directive.date === date &&
        directive.postings.length === 0 &&
        !dropped.has(directive) &&
        [directive.payee, directive.narration].some(
          (name) => !!name && text.includes(name),
        ),
    );
    if (half) dropped.add(half);
  }
  return dropped.size === 0
    ? directives
    : directives.filter((directive) => !dropped.has(directive));
}
