import type { ColorTheme } from "@/types/theme-props";
import { sameLedgerFile } from "../../common/ledger-file-path";

type FileError = {
  message: string;
  lineno?: number | null;
  filename?: string | null;
  hint?: string | null;
};

/**
 * Whether a message names this file. A path in the message must be this
 * file's whole path, so `2023/x.bean` is not `2024/x.bean` (w21/089). The
 * engine always writes the full repository path, so a bare filename names a
 * root-level file and nothing in a folder: `parse errors in main.bean` is not
 * `sub/main.bean`'s (w21/310).
 */
function messageNamesFile(message: string, filePath: string): boolean {
  const fileName = filePath.split("/").pop() ?? filePath;
  let from = message.indexOf(fileName);
  while (from >= 0) {
    const start = message.slice(0, from).search(/\S*$/);
    const end = from + fileName.length;
    // A quoted name keeps its quote: `parsed: "sub.beancount"` never matched
    // (w21/773).
    const named = message
      .slice(start, end)
      .replace(/^["'\u201c\u2018«([]+/u, "");
    // The name must end there: `main.bean` is not the start of `main.beancount`
    // or `main.bean.bak` (w21/447). A sentence's own full stop does not count.
    const continues = /^(?:[\w-]|\.[\w-])/.test(message.slice(end));
    if (
      !continues &&
      ((named === fileName && fileName === filePath) ||
        sameLedgerFile(named, filePath))
    )
      return true;
    from = message.indexOf(fileName, from + 1);
  }
  return false;
}

export function filterFileErrors<T extends FileError>(
  allErrors: T[],
  filePath: string,
): T[] {
  return allErrors.filter((e) => {
    if (e.filename != null && e.filename !== "") {
      return sameLedgerFile(e.filename, filePath);
    }
    // `getLedgerErrors` can return a null filename and name the file in the
    // message instead ("parse errors in main.bean"). Verified against a live
    // ledger: without this fallback the banner matched nothing and never
    // rendered for any file, however broken the ledger was.
    return (
      typeof e.message === "string" && messageNamesFile(e.message, filePath)
    );
  });
}

/**
 * The rows the editor's error banner shows for this file: message, line and the
 * engine's fix hint. The hint was dropped here, so the banner never showed what
 * Notifications showed for the same error (w21/521).
 */
export function fileBannerErrors(
  allErrors: FileError[],
  filePath: string,
): {
  message: string;
  lineno: number | null | undefined;
  hint?: string | null;
}[] {
  return filterFileErrors(allErrors, filePath).map((e) => ({
    message: e.message,
    lineno: e.lineno,
    hint: e.hint,
  }));
}

/**
 * The line that says where a nested file lives, or null at the root. The
 * header shows the file name only, so `books/2025/jan.bean` and
 * `books/2026/jan.bean` looked the same before saving (w21/590).
 */
export function editorPathLine(path: string): string | null {
  return path.includes("/") ? path : null;
}

/**
 * Colors for the read-only notice. It is an explanatory sentence, not a
 * disabled control, so it uses the secondary-text role (`black80`) rather than
 * the placeholder/disabled ramp: light `black60` on the `black10` inset band
 * measured 1.62:1, unreadable at 13pt.
 */
export function readOnlyNoticeColors(theme: ColorTheme): {
  background: string;
  foreground: string;
} {
  return { background: theme.black10, foreground: theme.black80 };
}
