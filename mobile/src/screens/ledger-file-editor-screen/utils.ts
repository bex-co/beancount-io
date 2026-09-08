export function isConflictError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("sha") || m.includes("conflict") || m.includes("409");
}

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
