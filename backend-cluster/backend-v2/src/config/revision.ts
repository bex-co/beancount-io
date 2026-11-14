/**
 * Which commit this deployment runs, for a client that wants to know which
 * build it is talking to.
 *
 * Read from `BEANCOUNT_REVISION`, then `RENDER_GIT_COMMIT` (a Render-compatible
 * platform sets that one at runtime, so a deployment that cannot pass a build
 * argument still reports it). Only a 7–40 character hexadecimal string is
 * accepted, lowercased and trimmed: the value ends up in a public discovery
 * document, so it never carries arbitrary text.
 *
 * Anything else counts as unset and the next source is tried. That includes the
 * literal `unknown` a Dockerfile default sets, so a build without a commit never
 * shadows the platform's own variable. With no usable source the answer is
 * `unknown`.
 */
export const UNKNOWN_REVISION = "unknown";

const REVISION_SOURCES = ["BEANCOUNT_REVISION", "RENDER_GIT_COMMIT"] as const;
const REVISION_PATTERN = /^[0-9a-f]{7,40}$/;

export function parseRevision(
  env: Readonly<Record<string, string | undefined>>,
): string {
  for (const name of REVISION_SOURCES) {
    const candidate = env[name]?.trim().toLowerCase();
    if (candidate !== undefined && REVISION_PATTERN.test(candidate)) {
      return candidate;
    }
  }
  return UNKNOWN_REVISION;
}
