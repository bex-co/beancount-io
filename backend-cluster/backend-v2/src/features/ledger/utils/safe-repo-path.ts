import { BadUserInputError } from "@/shared/errors";

/**
 * Reject repo-relative paths that could change the Gitea URL endpoint after
 * downstream URL parsing. Ledger-v2 repeats this check at its own boundary;
 * keeping it here prevents unsafe values from crossing the service boundary.
 */
export function assertSafeRepoPath(
  path: unknown,
  field = "path",
): asserts path is string {
  if (typeof path !== "string" || path.length === 0) {
    throw new BadUserInputError("File path must not be empty", field);
  }
  if (path.includes("\0") || path.includes("\\")) {
    throw new BadUserInputError("Invalid file path", field);
  }
  for (const segment of path.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new BadUserInputError("Invalid file path", field);
    }
  }
}
