export type CreateFileNameIssue =
  | "empty"
  | "unsafe"
  | "emptySegment"
  | "git"
  | "exists"
  /** The folder's names are not known yet, so a clash cannot be ruled out. */
  | "unchecked"
  | null;

function createFilePathIssue(path: string): CreateFileNameIssue {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\0") ||
    path.includes("\\")
  ) {
    return "unsafe";
  }
  for (const segment of path.split("/")) {
    if (segment === "") return "emptySegment";
    if (segment === "." || segment === "..") return "unsafe";
    if (segment.toLowerCase() === ".git") return "git";
  }
  return null;
}

/**
 * Reject empty paths, null bytes, backslashes, empty/`.`/`..` segments and
 * reserved `.git` segments. Ordinary nested paths remain allowed.
 */
export function isSafeCreateFilePath(path: string): boolean {
  return createFilePathIssue(path) === null;
}

/**
 * What stops `filename` (possibly nested under `dirPath`) from being created.
 * `existingNames` is the target folder's listing, or null while it is unknown.
 */
export function createFileNameIssue(
  filename: string,
  existingNames: ReadonlyArray<string> | null,
  dirPath = "",
): CreateFileNameIssue {
  const trimmed = filename.trim();
  if (!trimmed) return "empty";
  const fullPath = dirPath ? `${dirPath}/${trimmed}` : trimmed;
  const pathIssue = createFilePathIssue(fullPath);
  if (pathIssue) return pathIssue;
  // Nested paths (a/b/c.bean) create into missing dirs; only a single
  // segment can collide with the current directory listing.
  if (trimmed.includes("/")) return null;
  if (existingNames === null) return "unchecked";
  return existingNames.includes(trimmed) ? "exists" : null;
}
