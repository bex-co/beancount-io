/**
 * Parsing of the exec request a git client sends over SSH.
 *
 * Git over SSH is not a shell session: the client runs
 * `ssh git@host "git-receive-pack '/owner/repo.git'"` and then speaks the raw
 * pack protocol on that exec channel. Everything the proxy needs to route and
 * authorize the request is in that one command string.
 *
 * Kept free of any SSH library so the decision is testable on its own — the
 * library only has to hand over a string.
 */

export type GitService = "git-upload-pack" | "git-receive-pack";

export interface GitExecRequest {
  service: GitService;
  owner: string;
  repo: string;
}

/** Same shape the HTTP proxy allows, so one policy covers both transports. */
const SEGMENT = "[A-Za-z0-9][A-Za-z0-9._-]*";
const COMMAND = new RegExp(
  `^(git-upload-pack|git-receive-pack)\\s+'?/?(${SEGMENT})/(${SEGMENT}?)(?:\\.git)?/?'?$`,
);

/**
 * Parse an exec command, or return null if it is not a git request we serve.
 *
 * Returning null rather than throwing keeps the caller's shape simple: anything
 * unparsed is refused, which is the same answer we want for a shell request, a
 * `scp`, or a crafted command.
 */
export function parseGitExecCommand(command: string): GitExecRequest | null {
  const match = COMMAND.exec(command.trim());
  if (!match) return null;

  const [, service, owner, repo] = match;
  // The owner/repo pattern already forbids a segment starting with a dot, so
  // `..` can never appear as one and the path cannot escape a repository.
  if (!repo) return null;

  return { service: service as GitService, owner, repo };
}

/** Writes are the only thing the ref policy applies to. */
export function isWrite(request: GitExecRequest): boolean {
  return request.service === "git-receive-pack";
}
