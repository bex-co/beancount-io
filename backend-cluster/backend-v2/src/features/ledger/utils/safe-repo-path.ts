import { BadUserInputError } from "@/shared/errors";

/**
 * Reject repo-relative paths that could change the Gitea URL endpoint after
 * downstream URL parsing, and paths inside `.git`, which Gitea refuses at any
 * depth and in any case. Ledger-v2 repeats this check at its own boundary;
 * keeping it here prevents unsafe values from crossing the service boundary
 * and refuses dry runs that never reach Gitea (w23/027).
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
    if (segment.toLowerCase() === ".git") {
      throw new BadUserInputError(
        "Paths inside .git can't be read or written",
        field,
      );
    }
  }
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
  const refuse = (rule: string) => {
    throw new BadUserInputError(
      `File path ${JSON.stringify(path)} ${rule}`,
      field,
    );
  };
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
