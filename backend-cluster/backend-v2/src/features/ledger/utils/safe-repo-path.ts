import { BadUserInputError } from "@/shared/errors";

/** Refuse `path` for breaking `rule`, quoting it (w23/054, w31/137). */
function refusePath(path: string, field: string, rule: string): never {
  throw new BadUserInputError(
    `File path ${JSON.stringify(path)} ${rule}`,
    field,
  );
}

/**
 * Reject repo-relative paths that could change the Gitea URL endpoint after
 * downstream URL parsing, and paths inside `.git`, which Gitea refuses at any
 * depth and in any case. Ledger-v2 repeats this check at its own boundary;
 * keeping it here prevents unsafe values from crossing the service boundary
 * and refuses dry runs that never reach Gitea (w23/027).
 *
 * Each refusal quotes the path and names the rule it broke. MCP carries the
 * message but not `field`, so the quoted value is what tells an agent which of
 * `oldPath` and `newPath`, or which `files[]` entry, to fix (w31/137).
 */
export function assertSafeRepoPath(
  path: unknown,
  field = "path",
): asserts path is string {
  if (typeof path !== "string" || path.length === 0) {
    throw new BadUserInputError("File path must not be empty", field);
  }
  const refuse = (rule: string) => refusePath(path, field, rule);
  if (path.includes("\0")) refuse("contains a NUL (U+0000) character");
  if (path.includes("\\")) refuse('uses "\\": separate folders with "/"');
  if (path.startsWith("/"))
    refuse('starts with "/": write it relative to the ledger root');
  if (path.endsWith("/")) refuse('ends with "/": remove the trailing "/"');
  const segments = path.split("/");
  if (segments.includes(""))
    refuse('has an empty part: remove the doubled "/"');
  if (segments.some((segment) => segment === "." || segment === ".."))
    refuse('has a "." or ".." part: write it relative to the ledger root');
  if (segments.some((segment) => segment.toLowerCase() === ".git"))
    refuse("is inside .git, which can't be read or written");
}

/** Windows device names, with or without an extension. */
const DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

/**
 * A path for a file being created: safe ({@link assertSafeRepoPath}) and
 * portable. A committed name with a control character, a bidi override, a
 * Windows-reserved character or device name, a segment ending in `.` or a
 * space, or a segment over 255 bytes made the ledger fail to clone on Windows,
 * display under another name, or resist an `include` (w23/054). Only new paths
 * are held to it, so a file already named that way stays readable and
 * deletable.
 */
export function assertPortableRepoPath(path: unknown, field = "path"): void {
  assertSafeRepoPath(path, field);
  const refuse = (rule: string) => refusePath(path, field, rule);
  if (/[\p{Cc}\u2028\u2029]/u.test(path))
    refuse("contains a control character");
  if (/\p{Bidi_Control}/u.test(path))
    refuse("contains a bidirectional text control");
  if (/[<>:"|?*]/.test(path))
    refuse('contains one of <>:"|?*, which Windows cannot store');
  for (const segment of path.split("/")) {
    if (/[. ]$/.test(segment)) refuse("has a part ending in a dot or a space");
    if (DEVICE_NAME.test(segment))
      refuse(`uses the Windows device name "${segment}"`);
    if (Buffer.byteLength(segment, "utf8") > 255)
      refuse("has a part longer than 255 bytes");
  }
}

/**
 * Percent-encode each segment of a repository-relative path while keeping `/`
 * separators, for URL templates such as Gitea's `repoGetContents` that
 * interpolate `filepath` directly into the request path.
 */
export function encodeRepoPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
