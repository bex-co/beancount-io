/**
 * Client-side path rules mirroring backend `assertSafeRepoPath`:
 * reject empty paths, null bytes, backslashes, and empty/`.`/`..` segments.
 * Nested paths like `a/b/c.bean` are allowed.
 */
export function isSafeCreateFilePath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) {
    return false;
  }
  if (path.includes("\0") || path.includes("\\")) {
    return false;
  }
  for (const segment of path.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      return false;
    }
  }
  return true;
}

/**
 * Whether `filename` (possibly nested under `dirPath`) collides with an
 * existing directory entry name at the create target.
 */
export function createFileNameCollides(
  filename: string,
  existingNames: ReadonlyArray<string>,
): boolean {
  const trimmed = filename.trim();
  if (!trimmed) return false;
  // Nested paths (a/b/c.bean) create into missing dirs; only collide when the
  // typed name is a single segment in the current directory listing.
  if (trimmed.includes("/")) {
    return false;
  }
  return existingNames.some((name) => name === trimmed);
}

export type CreateFileNameIssue = "empty" | "unsafe" | "exists" | null;

export function createFileNameIssue(
  filename: string,
  existingNames: ReadonlyArray<string>,
): CreateFileNameIssue {
  const trimmed = filename.trim();
  if (!trimmed) return "empty";
  if (!isSafeCreateFilePath(trimmed)) return "unsafe";
  if (createFileNameCollides(trimmed, existingNames)) return "exists";
  return null;
}
