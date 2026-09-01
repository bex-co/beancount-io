import Router from "@koa/router";
import { once } from "node:events";
import { PassThrough, type Readable } from "node:stream";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { createFavaApiWithAuthorization } from "@/foundation/fava";
import {
  evaluateDirectiveLimit,
  logPushObservation,
  directiveLimitRefusal,
  directiveLimitExplanation,
  GATE_TIMEOUT_MS,
  HookResponseScanner,
  type DirectiveLimitVerdict,
} from "@/features/gitea/policy/directive-limit-gate";
import fetch from "node-fetch";
import { logger } from "@/shared/logger";
import { createRateLimiter, checkRateLimit } from "@/shared/rate-limiter";
import { CATEGORY_HTTP_STATUS, RateLimitedError } from "@/shared/errors";

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
  const progress = explanation
    ? explanation
        .split("\n")
        .map((line) => pktLine("\x02" + line + "\n"))
        .join("")
    : "";
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

/**
 * Set up git HTTP proxy routes that translate app credentials to Gitea credentials.
 *
 * This proxy supports two authentication methods:
 * 1. App email + password: The proxy looks up the user by email, verifies the password,
 *    and translates to the Gitea-specific credentials stored in the database.
 * 2. Gitea username + password: Credentials are passed directly through to Gitea.
 *
 * The auth method is determined by whether the username contains "@":
 * - Contains "@" → app email + password (translated to Gitea credentials)
 * - No "@" → Gitea username + password (passed through directly)
 *
 * Usage:
 *   git clone http://localhost:4104/git/<username>/<repo>.git
 *   # When prompted, enter your app email and password, or Gitea username and password
 *
 * The proxy handles all git smart HTTP protocol endpoints:
 * - /git/:owner/:repo/info/refs
 * - /git/:owner/:repo/git-upload-pack
 * - /git/:owner/:repo/git-receive-pack
 * - /git/:owner/:repo/* (other git objects/files)
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

      if (username.includes("@")) {
        // App email + password: look up user and translate to Gitea credentials
        const user = await layers.database.models.user.getByMail(
          layers.database.db,
          username,
        );
        if (!user) {
          proxyLogger.warn("Git proxy auth failed: user not found", {
            email: username,
          });
          checkRateLimit(`git-auth-fail:${ctx.ip}`, {
            max: 5,
            windowMs: 60_000,
            message:
              "Too many failed authentication attempts, please try again later.",
          });
          ctx.status = 401;
          ctx.set("WWW-Authenticate", 'Basic realm="Git"');
          ctx.body = "Invalid credentials";
          return;
        }

        const passwordValid = await layers.database.models.user.verifyPassword(
          layers.database.db,
          user.id,
          password,
        );
        if (!passwordValid) {
          proxyLogger.warn("Git proxy auth failed: invalid password", {
            email: username,
            userId: user.id,
          });
          checkRateLimit(`git-auth-fail:${ctx.ip}`, {
            max: 5,
            windowMs: 60_000,
            message:
              "Too many failed authentication attempts, please try again later.",
          });
          ctx.status = 401;
          ctx.set("WWW-Authenticate", 'Basic realm="Git"');
          ctx.body = "Invalid credentials";
          return;
        }

        const ledgerAuth = Buffer.from(
          `${user.ledger_username}:${user.ledger_password}`,
        ).toString("base64");
        forwardHeaders["Authorization"] = `Basic ${ledgerAuth}`;

        proxyLogger.debug("Proxying git request (app auth)", {
          path,
          method: ctx.method,
          ledgerUsername: user.ledger_username,
        });
      } else {
        // Gitea username + password: pass credentials directly through
        forwardHeaders["Authorization"] = authHeader;

        proxyLogger.debug("Proxying git request (gitea auth)", {
          path,
          method: ctx.method,
          giteaUsername: username,
        });
      }

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

      // Make the request to Gitea
      const response = await fetch(giteaUrl, {
        method: ctx.method,
        headers: forwardHeaders,
        body:
          ctx.method !== "GET" && ctx.method !== "HEAD" ? ctx.req : undefined,
      });

      // Forward response status
      ctx.status = response.status;

      // Forward response headers
      const headersToSkip = new Set([
        "connection",
        "keep-alive",
        "transfer-encoding",
        "content-encoding",
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
        ctx.body = observed;
      } else {
        ctx.body = response.body;
      }
    } catch (error) {
      if (error instanceof RateLimitedError) {
        // Respond in git's plain-text idiom rather than the JSON the shared REST
        // error middleware would produce.
        ctx.status = CATEGORY_HTTP_STATUS[error.category];
        ctx.body = error.message;
        return;
      }
      const err = error as Error;
      proxyLogger.error("Git proxy error", { error: err.message, path });
      ctx.status = 502;
      ctx.body = "Bad Gateway";
    }
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
