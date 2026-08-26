/**
 * Models commonly spell repo-relative paths like shell paths (`.` and
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

export function normalizeAgentDirPath(
  path: string | undefined,
): string | undefined {
  if (path === undefined || path === ".") return undefined;
  return normalizeAgentRepoPath(path);
}
