import Router from "@koa/router";
import { once } from "node:events";
import { PassThrough, Transform, type Readable } from "node:stream";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { getBasicAuthHeader } from "@/features/auth/utils/auth";
import { bannedUserMessage } from "@/features/auth/utils/deployment-copy";
import type { User } from "@/features/auth/data/user-model";
import { createFavaApiWithAuthorization } from "@/foundation/fava";
import { invalidateUserFeed } from "@/shared/cache";
import {
  evaluateDirectiveLimit,
  logPushObservation,
  directiveLimitRefusal,
  directiveLimitExplanation,
  GATE_TIMEOUT_MS,
  HookResponseScanner,
  type DirectiveLimitVerdict,
} from "@/features/gitea/policy/directive-limit-gate";
import fetch, { type RequestInit } from "node-fetch";
import { logger } from "@/shared/logger";
import { createRateLimiter } from "@/shared/rate-limiter";
import {
  BadUserInputError,
  CATEGORY_HTTP_STATUS,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { clientAddress } from "@/server/client-address";
import {
  accountMayAuthenticate,
  identityAllowsLedgerScope,
  identityHasCapability,
  resolveApiKeyIdentity,
  type OperationClass,
} from "@/server/api/identity";
import { API_KEY_PLAINTEXT_PREFIX } from "@/features/apikeys/service/api-key-service";
import { gitHttpPasswordAuthTotal } from "@/metrics/metrics-definitions";
import { OTHER_LEDGER_HINT } from "@/server/api/authorization";

const proxyLogger = logger.child({ module: "git-proxy" });

/**
 * The only paths this proxy forwards.
 *
 * This route used to be a catch-all, which made it a general authenticated
 * Gitea REST API proxy rather than a git transport: `/git/api/v1/user`
 * returned the caller's Gitea profile, and
 * `DELETE /git/api/v1/repos/{owner}/{repo}/branch_protections/{name}` let a
 * user delete their own branch protection (verified 2026-08-15, HTTP 204).
 * Anything we express as Gitea repository state — the main-only branch policy,
 * and the free-tier quota lock designed in ADR 0001 — is only enforceable if
 * the user it applies to cannot reach the API that edits it.
 *
 * Git's smart HTTP protocol only ever issues these three requests, so the
 * allowlist is exhaustive rather than a heuristic:
 *
 *   GET  <owner>/<repo>[.git]/info/refs?service=git-(upload|receive)-pack
 *   POST <owner>/<repo>[.git]/git-upload-pack
 *   POST <owner>/<repo>[.git]/git-receive-pack
 *
 * The owner and repo segments must start alphanumeric, so `..` can never be a
 * segment and the path cannot traverse out of a repository. Dumb HTTP
 * (`/objects/...`, `/HEAD`) is deliberately not forwarded; git negotiates smart
 * HTTP by default and no client here needs the fallback.
 */
const GIT_SEGMENT = "[A-Za-z0-9][A-Za-z0-9._-]*";
const GIT_REF_ADVERTISEMENT = new RegExp(
  `^/${GIT_SEGMENT}/${GIT_SEGMENT}(?:\\.git)?/info/refs$`,
);
const GIT_PACK_SERVICE = new RegExp(
  `^/${GIT_SEGMENT}/${GIT_SEGMENT}(?:\\.git)?/git-(?:upload|receive)-pack$`,
);
const GIT_REPO_PATH = new RegExp(`^/(${GIT_SEGMENT})/(${GIT_SEGMENT})/`);

/**
 * Owner and repository from a forwarded git path. SSH gets the same pair from
 * `parseGitExecCommand`; both accept the same segment shape so a repository
 * cannot be addressable over one transport and not the other.
 *
 * The `.git` suffix is stripped here rather than matched away in the pattern.
 * An earlier version wrote the second segment as `(${GIT_SEGMENT}?)`, which
 * looks like an optional segment but is a **lazy quantifier** — and it was
 * load-bearing: laziness is what made the trailing `(?:\.git)?` consume the
 * suffix. Correct, but correct by regex trivia. Greedy plus an explicit strip
 * gives byte-identical results on every shape, including dotted repository
 * names like `my.book.git`, and reads as what it does.
 */
function parseGitRepoPath(
  path: string,
): { owner: string; repo: string } | null {
  const m = GIT_REPO_PATH.exec(path);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/, "");
  // The segment class starts with a mandatory character, so this cannot be
  // empty from the match alone — but it can be after stripping `.git`, from a
  // path like `/owner/.git/…`. `parseGitExecCommand` guards the same way.
  return repo ? { owner: m[1], repo } : null;
}

/**
 * The only ref a client may update.
 *
 * This is the third expression of one policy: `BRANCH_RULES` in
 * beancount-ledger-v2's repo-branch-policy.ts provisions it as Gitea branch
 * protection for newly created ledgers, `_infra/backfill-branch-protection.sh`
 * would apply the same to existing ones, and this enforces it in the proxy.
 * They cannot share a module across the two services, so change them together.
 *
 * The proxy layer exists because it needs no per-repository state at all: one
 * code path covers every repository, with nothing to provision, backfill, or
 * let drift. That is why the ~6.9k existing repositories were deliberately not
 * backfilled.
 */
const ALLOWED_REF = "refs/heads/main";

/**
 * A command list longer than this is not a real client. Normal pushes carry a
 * single ~100-byte command; even a hundred refs stays under 10 KB.
 */
export const MAX_COMMAND_LIST_BYTES = 64 * 1024;

export interface RefUpdate {
  oldSha: string;
  newSha: string;
  ref: string;
}

/**
 * Progress through a receive-pack command list. `offset` is the first byte not
 * yet consumed, so a scan can resume where it stopped instead of re-reading the
 * pkt-lines it already parsed each time another chunk arrives.
 */
export interface CommandListScan {
  refs: RefUpdate[];
  capabilities: string[];
  complete: boolean;
  offset: number;
  /**
   * Set when parsing stopped on bytes that are not a pkt-line, as opposed to
   * reaching the flush packet. The distinction is the whole policy: a clean
   * scan means every ref was seen, while a malformed one means the rest of the
   * list is unread — and an unread ref is one the policy did not check.
   */
  malformed: boolean;
}

export function emptyScan(): CommandListScan {
  return {
    refs: [],
    capabilities: [],
    complete: false,
    offset: 0,
    malformed: false,
  };
}

/**
 * Consume as many complete pkt-lines from `head` as possible, updating `scan`
 * in place.
 *
 * The body of a `git-receive-pack` request is `command_list "PACK" <binary>`,
 * where the command list is pkt-lines — four hex length bytes (counting
 * themselves) followed by `<old-sha> <new-sha> <refname>`, capabilities
 * appended to the first line after a NUL — terminated by the `0000` flush
 * packet. All of it precedes the PACK data, so the refs are readable without
 * touching the packfile.
 *
 * `scan.complete` stays false while the buffer ends mid-command-list; callers
 * keep reading until it is true.
 */
export function advanceCommandListScan(
  head: Buffer,
  scan: CommandListScan,
): void {
  while (!scan.complete && scan.offset + 4 <= head.length) {
    const lengthHex = head
      .subarray(scan.offset, scan.offset + 4)
      .toString("ascii");
    if (lengthHex === "0000") {
      scan.complete = true;
      return;
    }
    const length = parseInt(lengthHex, 16);
    if (!Number.isFinite(length) || length < 4) {
      // Not a pkt-line at all. Stop rather than loop forever, and mark the scan
      // malformed so the caller refuses rather than forwarding a body whose
      // refs it admits it could not read.
      //
      // Measured against Gitea 1.24.7 rather than assumed: a `0001` packet and
      // a non-hex length were both probed, and Gitea stops in the same place we
      // do — so this was not an exploitable bypass, and forwarding happened to
      // be safe. It was safe only because two independent parsers agreed, which
      // is not a property either side promises to keep. Refusing what we cannot
      // read removes the dependency.
      scan.complete = true;
      scan.malformed = true;
      return;
    }
    if (scan.offset + length > head.length) {
      return;
    }

    const payload = head
      .subarray(scan.offset + 4, scan.offset + length)
      .toString("utf8");
    const nul = payload.indexOf("\0");
    if (scan.offset === 0 && nul >= 0) {
      // Capabilities ride on the first command only.
      scan.capabilities = payload
        .slice(nul + 1)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }
    const line = (nul >= 0 ? payload.slice(0, nul) : payload).trim();
    const parts = line.split(" ");
    if (parts.length >= 3) {
      scan.refs.push({ oldSha: parts[0], newSha: parts[1], ref: parts[2] });
    }
    scan.offset += length;
  }
}

/** Scan a complete body in one shot. */
export function parseReceivePackRefs(head: Buffer): CommandListScan {
  const scan = emptyScan();
  advanceCommandListScan(head, scan);
  return scan;
}

/**
 * Encode one pkt-line: four hex length bytes covering themselves, then data.
 *
 * The length is a **byte** count, not a character count. They only differ once
 * the payload leaves ASCII — and a rejection reason is exactly where non-ASCII
 * shows up, since it is prose. Using `line.length` there would understate the
 * length and corrupt the rest of the response; pairing that with a latin1
 * encode would also drop the character itself. Both were live in the
 * directive-limit refusal until w1/m17 t008 caught it on a real client.
 */
export function pktLine(line: string): string {
  return (Buffer.byteLength(line) + 4).toString(16).padStart(4, "0") + line;
}

/** Text as band-2 packets, which git prints as `remote:` lines, one per line. */
function sidebandProgress(text: string): string {
  return text
    .split("\n")
    .map((line) => pktLine("\x02" + line + "\n"))
    .join("");
}

/**
 * Build the receive-pack response that reports each ref as rejected.
 *
 * Answering a rejected push with plain HTTP 403 makes git print only
 * `error: RPC failed; HTTP 403`, which tells the user nothing. Speaking the
 * protocol instead gets the reason rendered next to the ref, the way the
 * pre-receive hook's stderr used to appear:
 *
 *   ! [remote rejected] dump -> dump (only refs/heads/main may be pushed)
 *
 * When the client asked for side-band-64k the report has to travel on band 1,
 * otherwise it is sent unframed.
 */
export function buildRejectionReport(
  rejected: string[],
  capabilities: string[],
  /** Defaults to the main-only policy, the first rule that used this path. */
  reason: string = `only ${ALLOWED_REF} may be pushed`,
  /**
   * Longer text for the progress sideband, where there is room to say what to do
   * next. Dropped when the client did not ask for side-band, since sending it
   * unframed would corrupt the report.
   */
  explanation?: string,
): Buffer {
  let report = pktLine("unpack ok\n");
  for (const ref of rejected) {
    report += pktLine(`ng ${ref} ${reason}\n`);
  }
  report += "0000";

  const useSideband = capabilities.some((c) => c.startsWith("side-band"));
  // UTF-8, not latin1: the band prefixes are single bytes either way, and
  // anything above U+00FF in the reason would otherwise be replaced.
  if (!useSideband) return Buffer.from(report, "utf8");

  // Band 2 is the progress channel git prints as `remote:` lines; band 1 carries
  // the packfile-data channel, which is where report-status goes. The
  // explanation goes out first so it reads above the per-ref line.
  const progress = explanation ? sidebandProgress(explanation) : "";
  return Buffer.from(progress + pktLine("\x01" + report) + "0000", "utf8");
}

/** Refs the main-only policy rejects. Empty means the push is allowed. */
export function disallowedRefs(refs: RefUpdate[]): string[] {
  return refs.filter((r) => r.ref !== ALLOWED_REF).map((r) => r.ref);
}

/**
 * Read just far enough into `stream` to cover the command list, then push the
 * bytes back so the stream can still be forwarded to Gitea untouched.
 *
 * `unshift` is what makes this safe: the consumed bytes go back to the front of
 * the readable buffer, so node-fetch later sends a byte-identical body and the
 * client's Content-Length still matches.
 */
async function peekCommandList(
  stream: NodeJS.ReadableStream,
): Promise<CommandListScan> {
  const scan = emptyScan();
  // Accumulate into one buffer and reuse it for the unshift. The command list
  // almost always arrives whole in the first chunk, so the common case does no
  // copying at all and parses ~100 bytes once.
  let head: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  while (!scan.complete && head.length < MAX_COMMAND_LIST_BYTES) {
    const chunk = stream.read() as Buffer | null;
    if (chunk === null) {
      if ((stream as Readable).readableEnded) break;
      // Resolves on data or end; a stream error also settles it, and the
      // unreadable-body path below then rejects the push.
      await once(stream, "readable").catch(() => undefined);
      continue;
    }
    head = head.length === 0 ? chunk : Buffer.concat([head, chunk]);
    advanceCommandListScan(head, scan);
  }

  if (head.length > 0) {
    stream.unshift(head);
  }
  return scan;
}

/**
 * Apply the main-only push policy, replacing the per-repository
 * `restrict-to-main-branch.sh`.
 *
 * Returns true when it has answered the request and the caller must stop.
 *
 * Only HTTP passes through here. Git over SSH reaches Gitea directly, where the
 * policy holds only for repositories that carry Gitea branch protection — that
 * is every ledger created since `applyMainOnlyPolicy` shipped, plus whichever
 * older ones still have the pre-receive hook installed. Closing SSH for the
 * rest is a separate decision (ADR 0001), not something this layer can reach.
 */
async function rejectNonMainPush(
  ctx: Router.RouterContext,
  path: string,
): Promise<{ handled: boolean; scan: CommandListScan | null }> {
  if (!path.endsWith("/git-receive-pack"))
    return { handled: false, scan: null };

  // One rule for every body we cannot read, rather than a branch per shape.
  // Content-Encoding is client-controlled, so skipping the check on it would
  // let any client turn the policy off by claiming its body is compressed.
  // Git does not compress receive-pack, so rejecting costs nothing real.
  const encoding = (ctx.get("Content-Encoding") || "").trim();
  const scan = encoding ? null : await peekCommandList(ctx.req);

  if (scan === null || !scan.complete || scan.malformed) {
    proxyLogger.warn("unreadable receive-pack command list", {
      path,
      encoding: encoding || undefined,
    });
    ctx.status = 400;
    ctx.body = "Could not read the ref updates in this push.\n";
    return { handled: true, scan: null };
  }

  const rejected = disallowedRefs(scan.refs);
  // The scan travels back either way: the directive-limit rule needs the same
  // refs and capabilities, and peeking the body a second time would mean
  // unshifting it twice — the kind of subtlety that broke this path once before.
  if (rejected.length === 0) return { handled: false, scan };

  proxyLogger.info("rejected a push to a non-main ref", {
    path,
    refs: rejected,
  });
  // HTTP 200 carrying a protocol-level rejection: git then prints the reason
  // beside each ref instead of a bare "RPC failed; HTTP 403".
  ctx.status = 200;
  ctx.set("Content-Type", "application/x-git-receive-pack-result");
  ctx.body = buildRejectionReport(rejected, scan.capabilities);
  return { handled: true, scan };
}

/**
 * @param method HTTP method of the incoming request
 * @param path   Path after the `/git` prefix, with a leading slash
 */
function isGitSmartHttpRequest(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD") {
    return GIT_REF_ADVERTISEMENT.test(path);
  }
  if (verb === "POST") {
    return GIT_PACK_SERVICE.test(path);
  }
  return false;
}

/**
 * Parse Basic Auth credentials from Authorization header
 * @returns [username, password] or null if invalid/missing
 */
function parseBasicAuth(
  authHeader: string | undefined,
): [string, string] | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "utf-8",
    );
    const [username, ...passwordParts] = credentials.split(":");
    const password = passwordParts.join(":"); // Handle passwords with colons

    if (!username || !password) {
      return null;
    }

    return [username, password];
  } catch {
    return null;
  }
}

/** The operation a smart-HTTP request performs: a push writes, anything else reads. */
export function gitOperationFor(
  path: string,
  querystring: string | undefined,
): OperationClass {
  if (path.endsWith("/git-receive-pack")) return "write";
  if (path.endsWith("/info/refs")) {
    const service = new URLSearchParams(querystring ?? "").get("service");
    return service === "git-receive-pack" ? "write" : "read";
  }
  return "read";
}

/**
 * The three ways a Git HTTPS request may sign in, told apart by the
 * credential. `email` and `gitea` are passwords, which `gitHttp.passwordAuth`
 * governs; a token is not.
 */
type GitCredentialKind = "token" | "email" | "gitea";

function gitCredentialKind(
  username: string,
  password: string,
): GitCredentialKind {
  // The prefix decides first: a token may arrive under any username, including
  // an email address, and must never be tried as a password.
  if (password.startsWith(API_KEY_PLAINTEXT_PREFIX)) return "token";
  return username.includes("@") ? "email" : "gitea";
}

/** What a request authenticated as, or why it did not. */
type GitAuthentication =
  | {
      ok: true;
      /** The Authorization header to forward to Gitea. */
      authorization: string;
      /** The app user, when known without a lookup. */
      appUserId?: string;
    }
  | { ok: false; status: 401 | 403; message: string };

const invalidCredentials: GitAuthentication = {
  ok: false,
  status: 401,
  message: "Invalid credentials",
};

/**
 * A blocked account whose credential was verified: told why, in dashboard
 * sign-in's words. A credential not yet verified gets `invalidCredentials`
 * instead, so the proxy never says which usernames are blocked.
 */
const accountBlocked = (): GitAuthentication => ({
  ok: false,
  status: 403,
  message: `${bannedUserMessage()}\n`,
});

/** Where a user mints the token that replaces their Git password. */
function gitTokenSettingsUrl(config: Pick<AppConfig, "dashboard">) {
  return `${config.dashboard.url}/settings/api-keys`;
}

/** The `remote:` lines a password sign-in gets while the policy is `warn`. */
function passwordAuthWarning(settingsUrl: string): string {
  return [
    "Signing in to Git over HTTPS with a password is being phased out.",
    "Use a personal access token as the password instead (any username works):",
    settingsUrl,
  ].join("\n");
}

/** The 401 body a password sign-in gets once the policy is `deny`. */
function passwordAuthRefusal(settingsUrl: string): string {
  return [
    "Password sign-in for Git over HTTPS is turned off.",
    "Use a personal access token as the password (any username works).",
    `Create one at ${settingsUrl}`,
    "",
  ].join("\n");
}

const FLUSH_PKT = Buffer.from("0000", "ascii");
const NO_BYTES = Buffer.alloc(0);

/**
 * Add progress lines to a sideband response, just before its closing flush.
 *
 * Git prints band-2 packets as `remote:` lines, so this is how the proxy talks
 * to a user mid-clone. It is only safe inside a sideband stream, and pkt-lines
 * carry no marker saying they are one — so this parses the packet framing as it
 * passes (lengths only; payloads are streamed, never buffered) and inserts the
 * lines only when the response both carried band-1 data and ended on a flush.
 * That holds for a v0 or v2 packfile response and a push report, and for
 * nothing else: refs, ACK/NAK negotiation rounds, and `ls-refs` never start a
 * packet with byte 0x01. A stream that stops parsing as pkt-lines (raw pack
 * data without side-band) passes through unchanged.
 */
export class SidebandMessageInjector extends Transform {
  /** Header bytes not yet passed on: a partial header, or a trailing flush. */
  private pending: Buffer = NO_BYTES;
  private payloadLeft = 0;
  private atPayloadStart = false;
  private sawBand1 = false;
  private framingLost = false;

  constructor(private readonly message: string) {
    super();
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    // A flush held back at the end of the last chunk was not the last packet.
    if (this.pending.length === 4) {
      this.push(this.pending);
      this.pending = NO_BYTES;
    }
    if (this.framingLost) {
      this.push(chunk);
      done();
      return;
    }

    let offset = 0;
    let passFrom = 0;
    while (offset < chunk.length) {
      if (this.payloadLeft > 0) {
        if (this.atPayloadStart) {
          if (chunk[offset] === 0x01) this.sawBand1 = true;
          this.atPayloadStart = false;
        }
        const take = Math.min(this.payloadLeft, chunk.length - offset);
        offset += take;
        this.payloadLeft -= take;
        continue;
      }

      // Header bytes are held until the header is whole, so a trailing flush
      // can be kept back without having passed on half of it.
      if (offset > passFrom) this.push(chunk.subarray(passFrom, offset));
      const need = 4 - this.pending.length;
      const part = chunk.subarray(offset, offset + need);
      this.pending = Buffer.concat([this.pending, part]);
      offset += part.length;
      passFrom = offset;
      if (this.pending.length < 4) break;

      const hex = this.pending.toString("ascii");
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
        this.framingLost = true;
        this.push(this.pending);
        this.push(chunk.subarray(offset));
        this.pending = NO_BYTES;
        offset = passFrom = chunk.length;
        break;
      }
      const length = parseInt(hex, 16);
      if (length === 0 && offset === chunk.length) break; // maybe the last
      this.push(this.pending);
      this.pending = NO_BYTES;
      if (length >= 4) {
        this.payloadLeft = length - 4;
        this.atPayloadStart = this.payloadLeft > 0;
      }
    }
    if (offset > passFrom) this.push(chunk.subarray(passFrom, offset));
    done();
  }

  override _flush(done: (error?: Error | null) => void): void {
    const endsOnFlush =
      this.pending.length === 4 && this.pending.equals(FLUSH_PKT);
    // A lost framing empties `pending`, so it never reaches this branch.
    if (endsOnFlush && this.sawBand1) {
      this.push(Buffer.from(sidebandProgress(this.message), "utf8"));
    }
    if (this.pending.length > 0) this.push(this.pending);
    done();
  }
}

/**
 * Set up git HTTP proxy routes that translate app credentials to Gitea credentials.
 *
 * The Basic Auth password decides how a request signs in (`gitCredentialKind`):
 * 1. A personal access token (`bcio_…`), under any username: authorized the way
 *    REST authorizes the key — `ledger.read` to clone and fetch, `ledger.write`
 *    to push, and a ledger-pinned key only on its own ledger — then forwarded
 *    with the key owner's Gitea credential. This is the credential to use.
 * 2. App email + password: verified like dashboard sign-in, against the same
 *    per-account budget, and forwarded with the user's Gitea credential.
 * 3. Gitea username + password: passed straight through to Gitea.
 *
 * The two password paths are governed by `gitHttp.passwordAuth` in
 * `config.ts`: `allow`, `warn` (accepted, logged, counted, and answered with a
 * switch-to-token hint), or `deny` (refused with a 401 naming the token page).
 *
 * Usage:
 *   git clone https://<host>/git/<owner>/<ledger>.git
 *   # Username: anything. Password: a personal access token from
 *   # /settings/api-keys.
 *
 * Only Git's three smart-HTTP requests are forwarded:
 * - /git/:owner/:repo/info/refs
 * - /git/:owner/:repo/git-upload-pack
 * - /git/:owner/:repo/git-receive-pack
 */
export function setGitProxyHandler(
  router: Router,
  layers: Pick<AppLayers, "database" | "services" | "clients">,
  config: AppConfig,
): void {
  /**
   * Is this ledger already over its owner's directive limit?
   *
   * The verdict is always computed, always logged beside what the pre-receive
   * hook then did, and — when the ledger is already over — refuses the push
   * before it reaches Gitea.
   *
   * `authorization` is the header the proxy just built for Gitea, so ledger-v2
   * sees the same identity Gitea will (ADR 0004).
   */
  async function directiveLimitVerdict(
    path: string,
    authorization: string | undefined,
  ): Promise<DirectiveLimitVerdict | null> {
    if (!path.endsWith("/git-receive-pack")) return null;
    const repo = parseGitRepoPath(path);
    if (!repo || !authorization) return null;

    return evaluateDirectiveLimit(
      {
        models: layers.database.models,
        db: layers.database.db,
        stripe: layers.services.stripe,
        cacheHelper: layers.clients.cacheHelper,
        ledgerClient: createFavaApiWithAuthorization(
          config.favaApi.baseUrl,
          authorization,
          GATE_TIMEOUT_MS,
        ),
      },
      repo.owner,
      repo.repo,
    );
  }

  const passwordAuth = config.gitHttp.passwordAuth;
  const settingsUrl = gitTokenSettingsUrl(config);

  /**
   * Forward as the app user's generated Gitea credential — unless the account
   * is blocked, which every path that reaches here has to refuse (w3/651).
   */
  const signedInAs = (user: User): GitAuthentication =>
    !accountMayAuthenticate(user)
      ? accountBlocked()
      : {
          ok: true,
          authorization: getBasicAuthHeader(
            user.ledger_username,
            user.ledger_password,
          ).Authorization,
          appUserId: user.id,
        };

  /** Sign a request in by whichever credential it carries. */
  async function authenticate(
    ctx: Router.RouterContext,
    path: string,
    kind: GitCredentialKind,
    username: string,
    password: string,
    authHeader: string,
  ): Promise<GitAuthentication> {
    if (kind !== "token" && passwordAuth === "deny") {
      return {
        ok: false,
        status: 401,
        message: passwordAuthRefusal(settingsUrl),
      };
    }
    switch (kind) {
      case "token":
        return authenticateToken(ctx, path, password);
      case "email":
        return authenticateEmail(ctx, username, password);
      case "gitea":
        return authenticateGitea(username, authHeader);
    }
  }

  /**
   * A Gitea username and password. Gitea checks the credential itself, so the
   * header goes through unchanged — but a blocked account is refused first,
   * since Gitea knows nothing about blocking. That refusal is the same 401 a
   * wrong password gets: the password is unverified here.
   */
  async function authenticateGitea(
    username: string,
    authHeader: string,
  ): Promise<GitAuthentication> {
    const user = await layers.database.models.user.getUserByUsername(
      layers.database.db,
      username,
    );
    if (user && !accountMayAuthenticate(user)) return invalidCredentials;
    return { ok: true, authorization: authHeader, appUserId: user?.id };
  }

  /**
   * A personal access token, resolved by the same function REST uses, so a
   * key REST refuses (revoked, expired, unknown, or its account gone) is
   * refused here with the same undistinguished 401. It is not a password and
   * is never charged against the account's failed-password budget.
   */
  async function authenticateToken(
    ctx: Router.RouterContext,
    path: string,
    token: string,
  ): Promise<GitAuthentication> {
    const identity = await resolveApiKeyIdentity(token, layers.database);
    if (!identity) return invalidCredentials;

    const operation = gitOperationFor(path, ctx.querystring);
    if (!identityHasCapability(identity, operation)) {
      return {
        ok: false,
        status: 403,
        // REST's wording for the same refusal (`credentialDenial`).
        message: `This operation requires the "ledger.${operation}" scope. Use a credential that holds the "ledger.${operation}" scope.\n`,
      };
    }
    const repo = parseGitRepoPath(path);
    if (
      !repo ||
      !identityAllowsLedgerScope(identity, `${repo.owner}/${repo.repo}`)
    ) {
      return {
        ok: false,
        status: 403,
        message: `This credential is not authorized for this ledger. ${OTHER_LEDGER_HINT}\n`,
      };
    }

    const user = await layers.database.models.user.getById(
      layers.database.db,
      identity.userId,
    );
    return user ? signedInAs(user) : invalidCredentials;
  }

  /**
   * App email + password, verified the way dashboard sign-in verifies it and
   * against the same per-account budget (w0/m7). A spent budget is a
   * RateLimitedError, answered as a 429 by the caller's catch.
   */
  async function authenticateEmail(
    ctx: Router.RouterContext,
    email: string,
    password: string,
  ): Promise<GitAuthentication> {
    let user;
    try {
      user = await layers.services.auth.verifyPasswordCredentials(
        email,
        password,
        clientAddress(ctx),
      );
    } catch (error) {
      if (!(error instanceof BadUserInputError)) throw error;
      proxyLogger.warn("Git proxy auth failed", { email });
      return invalidCredentials;
    }
    return signedInAs(user);
  }

  // Helper function to handle git proxy requests
  async function handleGitProxy(ctx: Router.RouterContext, path: string) {
    // Reject before authenticating: there is no reason to translate
    // credentials for a request we will not forward, and this keeps the
    // rejection from depending on whether the credentials were valid.
    if (!isGitSmartHttpRequest(ctx.method, path)) {
      proxyLogger.warn("Git proxy rejected a non-git path", {
        path,
        method: ctx.method,
      });
      ctx.status = 404;
      ctx.body = "Not Found";
      return;
    }

    const authHeader = ctx.get("Authorization");
    const credentials = parseBasicAuth(authHeader);

    // Git requires authentication - send WWW-Authenticate header if missing
    if (!credentials) {
      ctx.status = 401;
      ctx.set("WWW-Authenticate", 'Basic realm="Git"');
      ctx.body = "Authentication required";
      return;
    }

    const [username, password] = credentials;
    const kind = gitCredentialKind(username, password);
    const warnPassword = kind !== "token" && passwordAuth === "warn";

    try {
      // Forward headers, excluding host and authorization
      const forwardHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(ctx.headers)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey !== "host" &&
          lowerKey !== "authorization" &&
          lowerKey !== "connection" &&
          typeof value === "string"
        ) {
          forwardHeaders[key] = value;
        }
      }

      const auth = await authenticate(
        ctx,
        path,
        kind,
        username,
        password,
        authHeader,
      );
      if (!auth.ok) {
        ctx.status = auth.status;
        if (auth.status === 401) {
          ctx.set("WWW-Authenticate", 'Basic realm="Git"');
        }
        ctx.body = auth.message;
        return;
      }
      // Who the push is by, for the feed cache: known at once for a token or
      // an app sign-in, looked up from the Gitea username otherwise.
      const appUserId = auth.appUserId;
      forwardHeaders["Authorization"] = auth.authorization;

      if (warnPassword) {
        // The credential and the username stay out of the log: the count by
        // path is what decides when `deny` can ship.
        proxyLogger.warn("Git password sign-in", { credential: kind, path });
        gitHttpPasswordAuthTotal.inc({ path: kind });
      }
      proxyLogger.debug("Proxying git request", {
        path,
        method: ctx.method,
        credential: kind,
      });

      const refPolicy = await rejectNonMainPush(ctx, path);
      if (refPolicy.handled) return;

      // Observation only until t008 — it must not be able to stop a push, so a
      // failure here is swallowed rather than falling into the 502 below.
      const verdict = await directiveLimitVerdict(
        path,
        forwardHeaders["Authorization"],
      ).catch((err: Error) => {
        // A gate that throws must not be able to stop a push: an over-limit
        // user's only way back under is the app write path, and refusing here
        // on our own bug would lock that argument out of reach.
        proxyLogger.warn("directive limit: check threw", {
          path,
          err: err.message,
        });
        return null;
      });

      // Refusing here, before forwarding, is what makes the proxy the first
      // enforcement point: an already-over-limit push never reaches Gitea, so
      // the hook never sees it and the user reads our wording, not the hook's.
      if (verdict?.decision === "over" && refPolicy.scan) {
        proxyLogger.info("directive limit: refused a push", {
          path,
          count: verdict.count,
          limit: verdict.limit,
        });
        ctx.status = 200;
        ctx.set("Content-Type", "application/x-git-receive-pack-result");
        ctx.body = buildRejectionReport(
          refPolicy.scan.refs.map((r) => r.ref),
          refPolicy.scan.capabilities,
          directiveLimitRefusal(verdict.count, verdict.limit),
          directiveLimitExplanation(verdict.count, verdict.limit),
        );
        return;
      }

      // Construct the Gitea URL (include query string for git smart HTTP protocol)
      const giteaBaseUrl = config.gitea.internalBaseUrl;
      const queryString = ctx.querystring ? `?${ctx.querystring}` : "";
      const giteaUrl = `${giteaBaseUrl}${path}${queryString}`;

      // A client that hangs up must end the Gitea request too. Destroying
      // node-fetch's body, which is all Koa does, leaves the upstream socket
      // open while Gitea keeps building a pack nobody reads (w0/056).
      const upstream = new AbortController();
      ctx.res.once("close", () => {
        if (!ctx.res.writableFinished) upstream.abort();
      });

      // Make the request to Gitea
      const response = await fetch(giteaUrl, {
        method: ctx.method,
        headers: forwardHeaders,
        body:
          ctx.method !== "GET" && ctx.method !== "HEAD" ? ctx.req : undefined,
        // @types/node-fetch predates AbortSignal's `reason`; the runtime accepts Node's.
        signal: upstream.signal as RequestInit["signal"],
      });
      // node-fetch reports that abort as an `error` on a body the client is no
      // longer reading, which may have no listener left.
      response.body.on("error", () => {});

      // A push that Gitea accepted is a commit; Latest Updates must show it.
      if (path.endsWith("/git-receive-pack") && response.ok) {
        response.body.once("end", () => {
          void (async () => {
            const userId =
              appUserId ??
              (
                await layers.database.models.user.getUserByUsername(
                  layers.database.db,
                  username,
                )
              )?.id;
            if (userId) {
              await invalidateUserFeed(layers.clients.cacheHelper, userId);
            }
          })().catch((err: Error) =>
            proxyLogger.warn("feed cache invalidation failed", {
              err: err.message,
            }),
          );
        });
      }

      // Forward response status
      ctx.status = response.status;

      // Forward response headers
      // A pack response the hint is added to grows, so its length is not
      // Gitea's any more.
      const addHint = warnPassword && ctx.method === "POST";
      const headersToSkip = new Set([
        "connection",
        "keep-alive",
        "transfer-encoding",
        "content-encoding",
        ...(addHint ? ["content-length"] : []),
      ]);

      response.headers.forEach((value, key) => {
        if (!headersToSkip.has(key.toLowerCase())) {
          ctx.set(key, value);
        }
      });

      // Stream the response body. When a verdict is in hand, the bytes are also
      // read on their way past, so the hook's own answer — which exists only
      // inside Gitea, past this proxy — can be recorded beside it. Observing,
      // not buffering: the client still gets each chunk as it arrives.
      const repo = parseGitRepoPath(path);
      if (verdict && response.body && repo) {
        const scanner = new HookResponseScanner();
        const observed = new PassThrough();
        // `pipe` does not forward source errors. Verified: destroying the source
        // leaves the PassThrough with neither `end` nor `error`, so a
        // receive-pack response Gitea aborts mid-stream would hang this response
        // until the socket times out — and the observation would go missing with
        // no trace, leaving a silent gap in the window t013 reads.
        response.body.on("error", (err: Error) => {
          proxyLogger.warn("directive limit: observation lost mid-response", {
            path,
            err: err.message,
          });
          observed.destroy(err);
        });
        response.body.pipe(observed);
        observed.on("data", (chunk: Buffer) => scanner.observe(chunk));
        observed.on("end", () =>
          logPushObservation(verdict, scanner.signal(), {
            ...repo,
            transport: "https",
          }),
        );
        ctx.body = addHint ? withHint(observed) : observed;
      } else {
        ctx.body = addHint ? withHint(response.body) : response.body;
      }
    } catch (error) {
      if (
        error instanceof RateLimitedError ||
        error instanceof ServiceUnavailableError
      ) {
        // Respond in git's plain-text idiom rather than the JSON the shared REST
        // error middleware would produce.
        ctx.status = CATEGORY_HTTP_STATUS[error.category];
        ctx.body = error.message;
        if (error.metadata?.retryAfter) {
          ctx.set("Retry-After", String(error.metadata.retryAfter));
        }
        return;
      }
      const err = error as Error;
      // The client hung up before Gitea answered; there is nobody to tell.
      if (err.name === "AbortError") return;
      proxyLogger.error("Git proxy error", { error: err.message, path });
      ctx.status = 502;
      ctx.body = "Bad Gateway";
    }
  }

  /** The `warn` policy's switch-to-token lines, added to a pack response. */
  function withHint(body: NodeJS.ReadableStream): Readable {
    const injector = new SidebandMessageInjector(
      passwordAuthWarning(settingsUrl),
    );
    // `pipe` does not forward source errors; see the observation path above.
    body.on("error", (err: Error) => injector.destroy(err));
    return body.pipe(injector);
  }

  // Rate limit: 60 requests/minute per IP for all git operations
  const gitRateLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 60,
    message: "Too many git requests, please try again later.",
  });

  // Route pattern: /git{/*path} (wildcard catch-all).
  //
  // The route still matches everything so that rate limiting applies to junk
  // traffic too; `handleGitProxy` then rejects anything outside
  // `isGitSmartHttpRequest` with 404. Forwarded paths look like:
  //   /git/user/repo.git/info/refs
  //   /git/user/repo/info/refs
  //   /git/user/repo.git/git-upload-pack
  //   /git/user/repo/git-receive-pack
  // Notably NOT forwarded: /git/api/v1/**, /git/user/repo/objects/** and any
  // other Gitea path. See isGitSmartHttpRequest above for why.
  //
  // Note: path-to-regexp v8 uses {/*name} syntax for optional catch-all
  // and /*name for required catch-all (one or more segments)

  router.all("/git{/*path}", gitRateLimiter, async (ctx) => {
    // Extract the path after /git/
    // ctx.params.path contains the matched path (without leading slash in v8)
    const pathParam = ctx.params.path || "";
    const gitPath = "/" + pathParam;
    await handleGitProxy(ctx, gitPath);
  });
}
