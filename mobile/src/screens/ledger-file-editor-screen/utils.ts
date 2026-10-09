import type { ColorTheme } from "@/types/theme-props";

type FileError = {
  message: string;
  lineno?: number | null;
  filename?: string | null;
};

export function filterFileErrors(
  allErrors: FileError[],
  filePath: string,
): FileError[] {
  const fileName = filePath.split("/").pop() ?? filePath;
  return allErrors.filter((e) => {
    if (e.filename != null && e.filename !== "") {
      return (
        e.filename === filePath ||
        e.filename === fileName ||
        e.filename.endsWith("/" + fileName)
      );
    }
    // `getLedgerErrors` can return a null filename and name the file in the
    // message instead ("parse errors in main.bean"). Verified against a live
    // ledger: without this fallback the banner matched nothing and never
    // rendered for any file, however broken the ledger was.
    return typeof e.message === "string" && e.message.includes(fileName);
  });
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
