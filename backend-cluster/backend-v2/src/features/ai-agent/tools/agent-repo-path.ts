/**
 * Models commonly spell repo-relative paths like shell paths (`.`, `./`, and
 * `./main.bean`). Canonicalize that harmless notation before the request
 * reaches the ledger service, whose strict path validator intentionally
 * rejects every dot segment.
 *
 * Do not resolve `..`, absolute paths, backslashes, or empty paths here. Those
 * continue to reach the service unchanged and are rejected at its security
 * boundary.
 */
export function normalizeAgentRepoPath(path: string): string {
  let normalized = path;
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

/**
 * A directory may also end in one `/`, as `ls -F` and shell completion print
 * it, so `Reports/` lists `Reports` (w31/137). A bare `/`, a doubled `//`, and
 * a trailing `/` on `.` or `..` are not that spelling and stay as sent.
 */
export function normalizeAgentDirPath(
  path: string | undefined,
): string | undefined {
  if (path === undefined) return undefined;
  if (path === "") return "";
  let normalized = normalizeAgentRepoPath(path);
  if (normalized.endsWith("/")) {
    const dir = normalized.slice(0, -1);
    const name = dir.split("/").at(-1);
    if (name && name !== "." && name !== "..") normalized = dir;
  }
  return normalized === "" || normalized === "." ? undefined : normalized;
}
