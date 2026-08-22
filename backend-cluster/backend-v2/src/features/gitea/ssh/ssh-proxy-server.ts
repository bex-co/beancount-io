import { Server, utils } from "ssh2";
import type { Connection, ServerChannel, AuthContext } from "ssh2";
import { logger } from "@/shared/logger";
import { checkRateLimit } from "@/shared/rate-limiter";
import { RateLimitedError } from "@/shared/errors";
import {
  parseGitExecCommand,
  isWrite,
  type GitExecRequest,
} from "./ssh-command";
import type { SshAuthenticator, SshIdentity } from "./ssh-authenticator";
import { createFavaApiWithAuthorization } from "@/foundation/fava";
import type { DirectiveLimitLookupDeps } from "@/features/ledger/operations/directive-limit-lookup";
import {
  evaluateDirectiveLimit,
  logPushObservation,
  directiveLimitRefusal,
  directiveLimitExplanation,
  GATE_TIMEOUT_MS,
  HookResponseScanner,
  type DirectiveLimitVerdict,
} from "@/features/gitea/policy/directive-limit-gate";
import {
  advanceCommandListScan,
  disallowedRefs,
  emptyScan,
  buildRejectionReport,
  // Shared with the HTTP path on purpose: two transports enforcing the same
  // policy must not be able to drift apart in what they accept.
  MAX_COMMAND_LIST_BYTES,
} from "@/features/gitea/api/git-proxy-handler";

/**
 * How much of a fetch request to buffer before giving up.
 *
 * Deliberately not `MAX_COMMAND_LIST_BYTES`. That constant is a protocol bound
 * — a receive-pack command list is a few hundred bytes and anything larger is
 * not one. A fetch is different: git sends one `want` line per ref it asks for,
 * around fifty bytes each, so a repository with a few thousand refs legitimately
 * exceeds 64 KB and reusing that cap would refuse to clone it. This is a
 * denial-of-service bound rather than a protocol one, and it is sized so that no
 * real repository reaches it.
 */
const MAX_FETCH_REQUEST_BYTES = 8 * 1024 * 1024;
import {
  stripServicePreamble,
  parseGitProtocol,
  findRequestEnd,
  type GitProtocol,
} from "./git-http-bridge";

const log = logger.child({ module: "ssh-proxy" });

export interface SshProxyOptions {
  port: number;
  /** PEM or OpenSSH host key. Presented to every client, so changing it warns them. */
  hostKeys: string[];
  /** Internal Gitea HTTP endpoint — the same one the HTTPS git path uses. */
  gitea: { host: string; port: number };
  /** ledger-v2's base URL, which the directive-limit gate asks for the count. */
  ledgerApiBaseUrl: string;
}

/**
 * The SSH half of the git control plane (ADR 0004).
 *
 * Git over SSH otherwise connects to Gitea directly, so the main-only rule and
 * every application-layer check apply only to HTTP. This server takes over the
 * published port, authenticates the client against the keys Gitea holds, and
 * then speaks git-over-HTTP to Gitea on the internal network with that user's
 * own credentials — the same translation the HTTPS git path performs, so
 * authorization stays Gitea's and no key of ours is stored or registered.
 *
 * The transports carry the same pack protocol; only the framing differs, and
 * that difference lives in `git-http-bridge` where it can be tested on bytes.
 *
 * Everything above the transport lives in plain functions elsewhere in this
 * directory (`ssh-command`, `ssh-authenticator`) and is tested without ssh2.
 * This class is the adapter that feeds them.
 */
export class SshProxyServer {
  private server: Server | null = null;

  constructor(
    private readonly options: SshProxyOptions,
    private readonly authenticator: SshAuthenticator,
    /** What the directive-limit gate needs to resolve an owner's allowance. */
    private readonly limitDeps: DirectiveLimitLookupDeps,
  ) {}

  async listen(): Promise<void> {
    const server = new Server({ hostKeys: this.options.hostKeys }, (client) =>
      this.onClient(client),
    );
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.options.port, "0.0.0.0", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
    log.info("ssh proxy listening", { port: this.options.port });
  }

  async close(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = null;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private onClient(client: Connection): void {
    let identity: SshIdentity | null = null;

    client.on("authentication", (ctx: AuthContext) => {
      // Every path must answer the context. An unanswered auth request leaves
      // the client waiting forever, which is worse than a refusal and looks
      // like a hung server — so a thrown lookup (an unreachable database, a
      // missing migration) is caught here and refused.
      void this.authenticate(ctx, client)
        .then((resolved) => {
          identity = resolved;
        })
        .catch((err) => {
          log.error("ssh authentication failed unexpectedly", {
            err: (err as Error).message,
          });
          identity = null;
          try {
            ctx.reject();
          } catch {
            // Already answered; nothing to do.
          }
        });
    });

    client.on("ready", () => {
      client.on("session", (accept) => {
        const session = accept();

        // Gitea refuses interactive access over git SSH and so do we: a shell
        // or PTY here would be a foothold on the proxy itself.
        session.on("pty", (_a, reject) => reject?.());
        session.on("shell", (_a, reject) => reject?.());
        session.on("subsystem", (_a, reject) => reject?.());

        // git announces the protocol version it wants through GIT_PROTOCOL,
        // sent before the exec request. It decides whether an incremental
        // fetch can be carried over HTTP at all, so it is the one environment
        // variable worth reading; everything else is ignored rather than
        // forwarded, since a client should not be able to set the server's
        // environment.
        let protocol: GitProtocol = "v0";
        session.on("env", (accept, _reject, info) => {
          if (info.key === "GIT_PROTOCOL")
            protocol = parseGitProtocol(info.val);
          (accept as (() => void) | undefined)?.();
        });

        session.on("exec", (accept, reject, info) => {
          const request = parseGitExecCommand(info.command);
          if (!request || !identity) {
            log.warn("refused an exec request", {
              command: info.command.slice(0, 120),
              identified: Boolean(identity),
            });
            reject?.();
            return;
          }
          const stream = accept();
          void this.serve(stream, request, identity, protocol);
        });
      });
    });

    client.on("error", (err) => {
      // A client hanging up mid-transfer is ordinary, not an incident.
      log.debug("client connection error", { err: err.message });
    });
  }

  private async authenticate(
    ctx: AuthContext,
    client: Connection,
  ): Promise<SshIdentity | null> {
    if (ctx.method !== "publickey") {
      // Gitea's git SSH is publickey-only; offering anything else would just be
      // a surface with no way to succeed.
      ctx.reject(["publickey"]);
      return null;
    }

    const remote = (client as unknown as { _sock?: { remoteAddress?: string } })
      ._sock?.remoteAddress;

    // Only refusals are charged against the limit. The edge cannot help here —
    // Cloudflare does not carry this port — so this is the only brute-force
    // guard on SSH auth, but charging every attempt would police the wrong
    // people: ssh2 asks twice per connection (once to check the key is
    // acceptable, then again with a signature), so a legitimate push burned two
    // of ten, and behind a shared egress IP colleagues would evict each other.
    // Someone guessing keys fails every time and still trips it after ten.
    const refuse = (reason: string) => {
      try {
        checkRateLimit(`ssh-auth:${remote ?? "unknown"}`, {
          max: 10,
          windowMs: 60_000,
          message: "Too many SSH authentication attempts.",
        });
      } catch (err) {
        // Already over the limit — the answer is the same refusal either way.
        if (!(err instanceof RateLimitedError)) throw err;
      }
      log.info("refused an ssh key", { remote, reason });
      ctx.reject();
      return null;
    };

    const identity = await this.authenticator.identify(
      Buffer.from(ctx.key.data),
    );
    if (!identity) return refuse("gitea does not have this key");

    // ssh2 asks twice: once to check the key is acceptable, then again with a
    // signature to prove the client holds the private half. Accepting the first
    // round without verifying the second would authenticate anyone who knows a
    // public key.
    if (ctx.signature) {
      const parsed = utils.parseKey(
        `${ctx.key.algo} ${Buffer.from(ctx.key.data).toString("base64")}`,
      );
      if (parsed instanceof Error) return refuse("unparseable key");
      if (!parsed.verify(ctx.blob as Buffer, ctx.signature, ctx.hashAlgo)) {
        return refuse("bad signature");
      }
    }

    ctx.accept();
    return identity;
  }

  /**
   * Serve one git request by translating it to git-over-HTTP against Gitea.
   *
   * The advertisement comes from `GET /info/refs`, minus HTTP's `# service=`
   * preamble which SSH does not use. After that, each complete request the
   * client sends becomes one POST. Protocol v2 makes that exact: every v2
   * command is self-contained, so one command is one POST with nothing carried
   * between them.
   */
  private async serve(
    stream: ServerChannel,
    request: GitExecRequest,
    identity: SshIdentity,
    protocol: GitProtocol,
  ): Promise<void> {
    const base = `http://${this.options.gitea.host}:${this.options.gitea.port}/${request.owner}/${request.repo}.git`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${identity.giteaAuth}`,
    };
    if (protocol === "v2") headers["Git-Protocol"] = "version=2";

    // A cancelled push or fetch must not leave a request in flight against
    // Gitea with nobody to receive it.
    const cancel = new AbortController();
    stream.on("close", () => cancel.abort());

    try {
      const advert = await fetch(
        `${base}/info/refs?service=${request.service}`,
        { headers, signal: cancel.signal },
      );
      if (!advert.ok) {
        // 401/403 here is Gitea's answer about this user and this repository —
        // the authorization we deliberately did not reimplement.
        this.fail(
          stream,
          `Git backend refused the request (${advert.status}).`,
        );
        return;
      }
      stream.write(
        stripServicePreamble(Buffer.from(await advert.arrayBuffer())),
      );

      await this.pumpRequests(stream, request, protocol, base, headers, cancel);
      stream.exit(0);
      stream.end();
    } catch (err) {
      if (cancel.signal.aborted) return;
      log.error("failed to serve an ssh git request", {
        userId: identity.userId,
        err: (err as Error).message,
      });
      this.fail(stream, "Could not reach the git backend.");
    }
  }

  /**
   * Is this ledger already over its owner's directive limit?
   *
   * Always worked out and always logged; an already-over ledger is refused
   * before the push reaches Gitea.
   */
  private async directiveLimitVerdict(
    request: GitExecRequest,
    headers: Record<string, string>,
  ): Promise<DirectiveLimitVerdict> {
    return evaluateDirectiveLimit(
      {
        ...this.limitDeps,
        ledgerClient: createFavaApiWithAuthorization(
          this.options.ledgerApiBaseUrl,
          headers.Authorization,
          GATE_TIMEOUT_MS,
        ),
      },
      request.owner,
      request.repo,
    );
  }

  /** Ends the channel with a failure. Returns false so callers can `return` it. */
  private fail(stream: ServerChannel, message: string): boolean {
    stream.stderr.write(`${message}\n`);
    stream.exit(1);
    stream.end();
    return false;
  }

  /**
   * Read complete requests off the channel and POST each one, writing the
   * response back, until the client stops asking.
   *
   * The ref policy is applied here rather than after the fact: a push is only
   * forwarded once its command list has been read and found to touch nothing
   * but `main`, so a rejected push never reaches Gitea at all.
   */
  private async pumpRequests(
    stream: ServerChannel,
    request: GitExecRequest,
    protocol: GitProtocol,
    base: string,
    headers: Record<string, string>,
    cancel: AbortController,
  ): Promise<boolean> {
    const write = isWrite(request);
    let buf = Buffer.alloc(0);
    let ended = false;

    const chunks: Buffer[] = [];
    let notify: (() => void) | null = null;
    stream.on("data", (c: Buffer) => {
      chunks.push(c);
      notify?.();
    });
    stream.on("end", () => {
      ended = true;
      notify?.();
    });

    const more = () =>
      new Promise<void>((resolve) => {
        if (chunks.length > 0 || ended) return resolve();
        notify = () => {
          notify = null;
          resolve();
        };
      });

    for (;;) {
      const boundary = findRequestEnd(buf, protocol, write);

      if (boundary === undefined) {
        return this.fail(stream, "Could not read this request.");
      }
      if (boundary === null) {
        // Client finished mid-request, or dropped the connection: nothing more
        // to send, and the channel is already closing.
        if (ended) return true;
        if (
          buf.length >
          (write ? MAX_COMMAND_LIST_BYTES : MAX_FETCH_REQUEST_BYTES)
        ) {
          return this.fail(
            stream,
            write
              ? "Could not read the ref updates in this push."
              : "This request is larger than this server will read.",
          );
        }
        await more();
        buf = Buffer.concat([buf, ...chunks.splice(0)]);
        continue;
      }

      if (boundary.needsNegotiation) {
        // A v0 client that closed a round of `have` lines and is waiting for
        // an ACK before saying more. Over SSH the server would answer on the
        // same connection; over HTTP there is no conversation to continue, so
        // refusing is the only honest answer — forwarding half a negotiation
        // would corrupt the transfer, which is far worse than a readable error.
        //
        // Fresh clones do not reach here — they have no `have` lines. What
        // does is an incremental fetch under protocol.version=0, which git
        // defaulted away from in 2.26.
        return this.fail(
          stream,
          "An incremental fetch needs protocol v2 here; retry with " +
            "-c protocol.version=2, or set protocol.version=2 in your git " +
            "config.",
        );
      }

      const body = buf.subarray(0, boundary.end);
      buf = buf.subarray(boundary.end);

      if (write) {
        const scan = emptyScan();
        advanceCommandListScan(body, scan);
        if (!scan.complete || scan.malformed) {
          return this.fail(
            stream,
            "Could not read the ref updates in this push.",
          );
        }
        const rejected = disallowedRefs(scan.refs);
        if (rejected.length > 0) {
          // Answered in the protocol so git prints the reason beside each ref,
          // identically to the HTTP path — the wording is shared code.
          stream.write(buildRejectionReport(rejected, scan.capabilities));
          stream.exit(0);
          stream.end();
          return false;
        }

        // After the ref policy, before forwarding — the same position the HTTP
        // path checks from, so a push that breaks both rules is reported
        // identically on either transport.
        //
        // The client sends its pack straight after the command list without
        // waiting, and the `data` handler above appends every chunk to `chunks`
        // with no cap — so awaiting here would let a large push pile up in
        // memory for the whole call. Pausing hands backpressure back to ssh2's
        // channel window, where it belongs; `GATE_TIMEOUT_MS` bounds how long
        // the pause can last.
        stream.pause();
        const verdict = await this.directiveLimitVerdict(
          request,
          headers,
        ).catch((err: Error) => {
          // A gate that throws must not stop a push: an over-limit user's only
          // way back under is the app write path, and refusing on our own bug
          // would take that away too.
          log.warn("directive limit: check threw", {
            owner: request.owner,
            repo: request.repo,
            err: err.message,
          });
          return null;
        });
        stream.resume();

        // Refused before forwarding, so the push never reaches Gitea and the
        // hook never sees it — which is why the user reads our wording. Same
        // position as the HTTP path, using the same report builder.
        if (verdict?.decision === "over") {
          log.info("directive limit: refused a push", {
            owner: request.owner,
            repo: request.repo,
            count: verdict.count,
            limit: verdict.limit,
          });
          stream.write(
            buildRejectionReport(
              scan.refs.map((r) => r.ref),
              scan.capabilities,
              directiveLimitRefusal(verdict.count, verdict.limit),
              directiveLimitExplanation(verdict.count, verdict.limit),
            ),
          );
          stream.exit(0);
          stream.end();
          return false;
        }
        // A push carries its pack after the command list, and the client sends
        // it without waiting, so the rest of the channel is the body.
        await this.forward(
          stream,
          base,
          request,
          headers,
          cancel,
          body,
          verdict,
          {
            // `ended` is now also set by close/error, so an abandoned push ends
            // this generator instead of leaving the request body waiting on bytes
            // that will never arrive.
            rest: async function* () {
              yield buf;
              for (;;) {
                if (chunks.length === 0) {
                  if (ended) return;
                  await more();
                  continue;
                }
                for (const c of chunks.splice(0)) yield c;
              }
            },
          },
        );
        // The push is one request; the channel still needs its exit-status.
        return true;
      }

      await this.forward(stream, base, request, headers, cancel, body, null);
      if (ended && buf.length === 0 && chunks.length === 0) return true;
    }
  }

  /** POST one request body and stream Gitea's response back to the client. */
  private async forward(
    stream: ServerChannel,
    base: string,
    request: GitExecRequest,
    headers: Record<string, string>,
    cancel: AbortController,
    head: Buffer,
    /** Non-null only for a push, which is the only request a hook rules on. */
    verdict: DirectiveLimitVerdict | null,
    streaming?: { rest: () => AsyncGenerator<Buffer> },
  ): Promise<void> {
    // A large push must flow through rather than accumulate, so the body is a
    // stream whenever the pack follows.
    const body = streaming
      ? new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(head);
            try {
              for await (const chunk of streaming.rest())
                controller.enqueue(chunk);
            } finally {
              controller.close();
            }
          },
        })
      : head;

    const response = await fetch(`${base}/${request.service}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": `application/x-${request.service}-request`,
      },
      body: body as BodyInit,
      signal: cancel.signal,
      // Required by Node whenever the body is a stream.
      ...(streaming ? { duplex: "half" } : {}),
    } as RequestInit);

    if (!response.ok || !response.body) {
      this.fail(
        stream,
        `Git backend refused the request (${response.status}).`,
      );
      return;
    }

    // The hook lives inside Gitea, past this proxy, so its verdict is only
    // visible in the bytes coming back. They are read on their way past rather
    // than held, so the observation costs the push nothing.
    const scanner = verdict ? new HookResponseScanner() : null;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      scanner?.observe(chunk);
      if (!stream.write(chunk)) {
        await new Promise<void>((resolve) => stream.once("drain", resolve));
      }
    }
    if (verdict && scanner) {
      logPushObservation(verdict, scanner.signal(), {
        owner: request.owner,
        repo: request.repo,
        transport: "ssh",
      });
    }
  }
}
