import { isBeancountFile } from "../../common/ledger-file-types";
import { isLedgerGone } from "../../common/graphql-error-codes";

/** Why a typed name can't be created, or the name it creates. */
export type LedgerFileNameCheck =
  | { ok: true; filename: string }
  | {
      ok: false;
      issue:
        | "empty"
        | "path"
        | "git"
        | "portable"
        | "extension"
        | "exists"
        | "folderExists";
      filename?: string;
      /**
       * For "exists", the file there already: "Main" clashes with main.bean,
       * and the message named a Main.bean that did not exist (w21/787).
       */
      existing?: string;
    };

/**
 * Extensions of files that are not ledgers: typed on a new file they are a
 * mistake to name, not a word of the name. Any other suffix ("Mr.Smith",
 * "acme.inc", "budget.march") is part of it.
 */
const OTHER_EXTENSIONS = new Set(
  (
    "txt text csv tsv md markdown json yaml yml toml xml html htm ini log " +
    "py js ts sh sql pdf doc docx xls xlsx ods odt rtf zip png jpg jpeg gif " +
    "ofx qif qfx"
  ).split(" "),
);

/**
 * The name with `.bean` added unless it already carries an extension. Only a
 * known non-ledger extension reads as one ("notes.txt", which the check then
 * refuses): a dot inside a name ("2024.q1", "Mr.Smith", "Jan. expenses") is
 * part of it, and the dialog promises `.bean` to a name with no extension
 * (w21/275, w21/429). A trailing dot ends no extension: it is dropped and the
 * rest judged, or "x.bean." became "x.bean.bean" and "x.txt." was let through
 * as "x.txt.bean" (w21/769).
 */
function withBeanExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return `${name}.bean`;
  if (isBeancountFile(name)) return name;
  const suffix = name.slice(dot + 1);
  if (suffix === "") return withBeanExtension(name.slice(0, -1));
  return OTHER_EXTENSIONS.has(suffix.toLowerCase()) ? name : `${name}.bean`;
}

/** Windows device names, with or without an extension (backend-v2's rule). */
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

/** UTF-8 length of a string, without needing `TextEncoder`. */
function utf8Length(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/**
 * Whether a new file's path breaks the server's portable-path rule, which
 * refuses what Windows cannot store or what resists an `include`: bidirectional
 * and control characters, `<>:"|?*`, a part ending in a dot or space, a Windows
 * device name, a part over 255 bytes. A copy of backend-v2's
 * `assertPortableRepoPath`, pinned by `check-ledger-file-name.test.ts`; without
 * it the dialog closed and a raw English toast followed (w21/565).
 */
function breaksPortablePath(path: string): boolean {
  if (/[\p{Cc}\u2028\u2029]/u.test(path)) return true;
  if (/\p{Bidi_Control}/u.test(path)) return true;
  if (/[<>:"|?*]/.test(path)) return true;
  return path
    .split("/")
    .some(
      (part) =>
        /[. ]$/.test(part) || DEVICE_NAME.test(part) || utf8Length(part) > 255,
    );
}

/**
 * Check a typed new-file name. A relative path into folders (`sub/notes`)
 * is allowed, as the server and the dashboard allow it (w3/196): each segment
 * must be non-empty and not `.` or `..`, and backslashes and control
 * characters are refused. A last segment with no extension gets `.bean`.
 * Each refusal says which rule it broke so the dialog can name it (w21/014).
 */
export function checkLedgerFileName(
  input: string,
  existingNames: readonly string[] = [],
): LedgerFileNameCheck {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, issue: "empty" };
  const segments = trimmed.split("/");
  if (
    trimmed.includes("\\") ||
    /[\u0000-\u001f]/.test(trimmed) ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    return { ok: false, issue: "path" };
  }
  // backend-v2's `assertSafeRepoPath` refuses `.git` at any depth and in any
  // case; passed here, Create closed the dialog for its English refusal
  // (w21/826). Its own reason: the path one named backslashes and `..`
  // (w21/832).
  if (segments.some((segment) => segment.toLowerCase() === ".git")) {
    return { ok: false, issue: "git" };
  }
  const last = segments[segments.length - 1]!;
  const named = withBeanExtension(last);
  if (/^\.(bean|beancount)$/i.test(named) || !isBeancountFile(named)) {
    return { ok: false, issue: "extension" };
  }
  const filename = [...segments.slice(0, -1), named].join("/");
  if (breaksPortablePath(filename)) return { ok: false, issue: "portable" };
  // A folder the path goes into, spelled as one already here but for its
  // letter case or Unicode form: a clone on macOS or Windows keeps one of the
  // two (w21/825), as it does for file names (w21/770).
  if (segments.length > 1) {
    const folder = segments[0]!;
    const twin = existingNames.find(
      (name) =>
        name !== folder && portableNameKey(name) === portableNameKey(folder),
    );
    if (twin !== undefined) {
      return { ok: false, issue: "folderExists", filename, existing: twin };
    }
  }
  const existing = existingNames.find(
    (name) => portableNameKey(name) === portableNameKey(filename),
  );
  if (existing !== undefined) {
    return { ok: false, issue: "exists", filename, existing };
  }
  return { ok: true, filename };
}

/**
 * The file a create clashed with, as the server names a case or Unicode twin
 * ("Main.bean already exists as main.bean", w21/770), else the name sent: the
 * toast named the typed file, which did not exist (w21/787).
 */
export function clashingFileName(error: unknown, sent: string): string {
  const graphQLErrors =
    typeof error === "object" && error !== null
      ? (error as { graphQLErrors?: unknown }).graphQLErrors
      : undefined;
  for (const graphQLError of Array.isArray(graphQLErrors)
    ? graphQLErrors
    : []) {
    const message = (graphQLError as { message?: unknown } | null)?.message;
    const twin =
      typeof message === "string"
        ? /already exists as (\S(?:.*\S)?)\s*$/u.exec(message)?.[1]
        : undefined;
    if (twin !== undefined) return twin;
  }
  return sent;
}

/** Characters that draw nothing: a name holding one looks like one without. */
const INVISIBLE = /[\u00ad\u200b-\u200d\u2060\ufeff]/gu;

/**
 * A file name as every checkout sees it, as backend-v2 compares a new path:
 * one letter case, composed Unicode, no invisible characters. "Main" beside
 * main.bean was offered, and a clone on macOS or Windows keeps only one of
 * the pair (w21/770).
 */
function portableNameKey(name: string): string {
  return name.normalize("NFC").replace(INVISIBLE, "").toLowerCase();
}

/**
 * Whether a listing of the folder a new file targets already holds it. The
 * name check only sees the current folder, so `sub/notes` passed at the root
 * even when `sub/notes.bean` existed, and the server refused the create after
 * the dialog had closed (w21/222).
 */
export function listingHasFile(
  entries: readonly { path: string; type: string }[],
  filePath: string,
): boolean {
  const wanted = portableNameKey(filePath.replace(/^\/+/, ""));
  return entries.some(
    (entry) =>
      entry.type !== "dir" &&
      portableNameKey(entry.path.replace(/^\/+/, "")) === wanted,
  );
}

/** The folder part of a relative path, or "" at the root. */
export function parentDirectory(path: string): string {
  const slash = path.replace(/\/+$/, "").lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

export function normalizeLedgerFileName(input: string): string | null {
  const check = checkLedgerFileName(input);
  return check.ok ? check.filename : null;
}

export function buildLedgerFilePath(
  directory: string,
  filename: string,
): string {
  const cleanDirectory = directory.replace(/^\/+|\/+$/g, "");
  return cleanDirectory ? `${cleanDirectory}/${filename}` : filename;
}

/**
 * Whether Files offers Delete for the file at `path`. Only the ledger's root
 * `main.bean` is protected, as the server's `deleteLedgerFile` rule is; a
 * folder's own `main.bean` used to be locked too because the bare name was
 * compared (w21/049, the dashboard's w3/626).
 */
export function canDeleteLedgerFile(path: string): boolean {
  return path.replace(/^\/+/, "") !== "main.bean";
}

type Entry = { name: string; type: string; path: string };

/**
 * Folders first, then names in natural order: month-numbered books list 1, 2,
 * 3 … 10, 11, 12 rather than 1, 10, 11, 12, 2 (w21/589).
 */
export function sortEntries<T extends Entry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

/** A directory stack together with the ledger it was built in. */
export type LedgerPathStack = { ledgerId: string; stack: string[] };

/**
 * The stack to browse with. One from another ledger starts over at the root:
 * the Files tab stays mounted across a ledger switch, and a folder remembered
 * from the previous ledger would list as empty and aim Create file at a path
 * the new ledger never had.
 */
export function pathStackForLedger(
  state: LedgerPathStack,
  ledgerId: string,
): string[] {
  return state.ledgerId === ledgerId ? state.stack : [""];
}

export function pushPathStack(stack: string[], path: string): string[] {
  return [...stack, path];
}

export function popPathStack(stack: string[]): string[] {
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}

/**
 * Step up from `folder`, but only if the browser is still in it. A delete that
 * empties a folder finishes some time after it was tapped, and the user may
 * have gone up meanwhile: popping the current top then landed one folder too
 * high (w21/448).
 */
export function popPathStackFrom(stack: string[], folder: string): string[] {
  return stack[stack.length - 1] === folder ? popPathStack(stack) : stack;
}

/**
 * Whether a listing failed because its folder no longer exists. Git keeps no
 * empty folders, so deleting a folder's last file removes the folder, and the
 * listing then answers NOT_FOUND; the browser read that as "Failed to load"
 * and pull to refresh could not clear it (w21/088). The root is never "gone":
 * a NOT_FOUND there is the ledger's, which the ledger guard reports.
 */
export function isFolderGone(error: unknown, stack: string[]): boolean {
  return stack.length > 1 && isLedgerGone(error);
}

/**
 * Whether deleting one row leaves its folder empty, and so removes it. The
 * browser steps up before refreshing rather than list a folder that is gone.
 */
export function deleteEmptiesFolder(
  stack: string[],
  rowsInFolder: number,
): boolean {
  return stack.length > 1 && rowsInFolder === 1;
}
