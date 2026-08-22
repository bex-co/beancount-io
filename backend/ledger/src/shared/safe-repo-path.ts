import { BadUserInputError } from "@/shared/errors";

/**
 * Guards for user-supplied repo file paths that get interpolated into Gitea
 * REST URL paths (`/repos/{owner}/{repo}/contents/{filepath}`).
 *
 * The generated client splices the string RAW into the URL template, and
 * fetch's URL parser collapses dot segments — so an un-validated
 * `../../../../user/emails` rewrites the request to a DIFFERENT API endpoint
 * (`GET /api/v1/user/emails`), and `../../other/repo/contents/x` reads another
 * repository — both executed with the caller's Gitea credential. Paths reach
 * these call sites from the dashboard, the MCP surface, and the AI agent's
 * tool arguments (i.e. prompt-injectable), so every URL-path interpolation
 * must go through {@link toSafeRepoUrlPath}.
 *
 * (Paths sent in JSON bodies — `repoChangeFiles` — are validated server-side
 * by Gitea and are not URL-parsed; validating them too is harmless and keeps
 * one rule everywhere.)
 */

/**
 * Reject a repo-relative path containing traversal / absolute / empty
 * segments, NULs, or backslashes. Throws {@link BadUserInputError}.
 */
export function assertSafeRepoPath(path: string, field = "path"): void {
  if (path.length === 0) {
    throw new BadUserInputError("File path must not be empty", field);
  }
  if (path.includes("\0") || path.includes("\\")) {
    throw new BadUserInputError(`Invalid file path: ${path}`, field);
  }
  for (const segment of path.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new BadUserInputError(`Invalid file path: ${path}`, field);
    }
  }
}

/**
 * Validate ({@link assertSafeRepoPath}) then URL-encode each segment, so
 * `?`/`#`/`%`/unicode in legitimate filenames reach Gitea as literals instead
 * of being interpreted by the URL parser. Use the RETURN VALUE in the client
 * call; keep the original string for maps/messages.
 */
export function toSafeRepoUrlPath(path: string, field = "path"): string {
  assertSafeRepoPath(path, field);
  return path.split("/").map(encodeURIComponent).join("/");
}
