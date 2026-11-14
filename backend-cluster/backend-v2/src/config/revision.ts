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
const UNKNOWN_REVISION = "unknown";

const REVISION_SOURCES = ["BEANCOUNT_REVISION", "RENDER_GIT_COMMIT"] as const;
const REVISION_PATTERN = /^[0-9a-f]{7,40}$/;

const isRevision = (value: string | undefined): value is string =>
  value !== undefined && REVISION_PATTERN.test(value);

export function parseRevision(
  env: Readonly<Record<string, string | undefined>>,
): string {
  for (const name of REVISION_SOURCES) {
    const candidate = env[name]?.trim().toLowerCase();
    if (isRevision(candidate)) return candidate;
  }
  return UNKNOWN_REVISION;
}

/**
 * A revision as a public surface may print it: the value if it is one
 * `parseRevision` would accept, `unknown` for anything else. `config.revision`
 * already is one; this is the second lock on the door, and it also answers for
 * a config that carries none, as a test's partial one does.
 */
export function publishedRevision(revision: string | undefined): string {
  return isRevision(revision) ? revision : UNKNOWN_REVISION;
}

/**
 * The seven characters a semver build suffix carries (`1.0.0+2144cdb`), or
 * `undefined` when the revision is not known.
 */
export function shortRevision(
  revision: string | undefined,
): string | undefined {
  return isRevision(revision) ? revision.slice(0, 7) : undefined;
}
