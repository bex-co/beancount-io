import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
} from "node:http";
import { Client } from "ssh2";
import { SshProxyServer } from "../ssh-proxy-server";
import { generateTestKeyPair } from "./test-keys";
import { sshFingerprint, SshAuthenticator } from "../ssh-authenticator";
import { buildRejectionReport } from "@/features/gitea/api/git-proxy-handler";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

/**
 * The bridge is the part that cannot be reasoned about from a unit test: a real
 * git client's session has to come apart into HTTP requests and back together
 * without losing framing. So these drive a real ssh2 client through the proxy
 * into a real HTTP server standing in for Gitea, and assert on the bytes each
 * side actually saw.
 */

const pkt = (s: string) => (s.length + 4).toString(16).padStart(4, "0") + s;

/** HTTP's advertisement carries a preamble that SSH's does not. */
const ADVERT_PREAMBLE = (service: string) =>
  pkt(`# service=${service}\n`) + "0000";
const ADVERT_BODY = pkt("cafe HEAD\0report-status side-band-64k\n") + "0000";

interface FakeGitea {
  port: number;
  close: () => Promise<void>;
  /** Every POST body received, in order. */
  posts: Buffer[];
  paths: string[];
  protocols: (string | undefined)[];
  auth: (string | undefined)[];
  /** Override the next POST response. */
  postStatus: number;
  postBody: string;
}

async function startFakeGitea(): Promise<FakeGitea> {
  const state: Partial<FakeGitea> = {
    posts: [],
    paths: [],
    protocols: [],
    auth: [],
    postStatus: 200,
    postBody: "upstream-reply",
  };

  const server: HttpServer = createServer((req: IncomingMessage, res) => {
    state.paths!.push(req.url ?? "");
    state.protocols!.push(req.headers["git-protocol"] as string | undefined);
    state.auth!.push(req.headers.authorization as string | undefined);

    if (req.method === "GET") {
      const service =
        new URL(req.url ?? "", "http://x").searchParams.get("service") ?? "";
      res.writeHead(200);
      res.end(ADVERT_PREAMBLE(service) + ADVERT_BODY);
      return;
    }
    const body: Buffer[] = [];
    req.on("data", (c: Buffer) => body.push(c));
    req.on("end", () => {
      state.posts!.push(Buffer.concat(body));
      res.writeHead(state.postStatus!);
      res.end(state.postBody!);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  state.port = (server.address() as { port: number }).port;
  state.close = () => new Promise((r) => server.close(() => r()));
  return state as FakeGitea;
}

interface Harness {
  port: number;
  clientKey: { publicKey: string; privateKey: string };
  close: () => Promise<void>;
}

async function startProxy(giteaPort: number): Promise<Harness> {
  const clientKey = generateTestKeyPair("client");
  const blob = Buffer.from(clientKey.publicKey.split(" ")[1], "base64");
  const giteaFactory = {
    getAdminApiClient: () => ({
      user: {
        userCurrentListKeys: jest
          .fn()
          .mockImplementation(
            async ({ fingerprint }: { fingerprint: string }) => ({
              data:
                fingerprint === sshFingerprint(blob)
                  ? [{ fingerprint, user: { login: "un_alice" } }]
                  : [],
            }),
          ),
      },
    }),
  };
  const userModel = {
    getUserByUsername: jest.fn().mockResolvedValue({
      id: "usr_1",
      ledger_username: "un_alice",
      ledger_password: "pw",
    }),
  };
  const server = new SshProxyServer(
    {
      port: 0,
      hostKeys: [generateTestKeyPair("test-host").privateKey],
      gitea: { host: "127.0.0.1", port: giteaPort },
      ledgerApiBaseUrl: "http://ledger.invalid",
    },
    new SshAuthenticator(
      giteaFactory as never,
      userModel as never,
      {} as never,
    ),
    // No user matches the repo owner, so the shadow directive-limit check fails
    // open on every push here. Deliberate: these tests assert the transport, and
    // a verdict must never be able to change whether a push is forwarded.
    {
      models: { user: { getUserByUsername: async () => null } },
      db: {},
      stripe: {},
      cacheHelper: {},
    } as never,
  );
  await server.listen();
  return {
    port: (
      server as unknown as { server: { address(): { port: number } } }
    ).server.address().port,
    clientKey,
    close: () => server.close(),
  };
}

interface ExecResult {
  stdout: Buffer;
  stderr: string;
  code: number | null;
  exitBeforeClose: boolean;
}

function run(
  harness: Harness,
  command: string,
  body: string | Buffer,
  opts: { env?: Record<string, string> } = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.once("error", reject);
    client.once("ready", () => {
      client.exec(command, { env: opts.env }, (err, stream) => {
        if (err) return reject(err);
        const stdout: Buffer[] = [];
        let stderr = "";
        let code: number | null = null;
        let sawExit = false;
        let exitBeforeClose = false;

        stream.on("data", (c: Buffer) => stdout.push(c));
        stream.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
        stream.on("exit", (c: number) => {
          sawExit = true;
          code = c;
        });
        stream.on("close", () => {
          exitBeforeClose = sawExit;
          client.end();
          resolve({
            stdout: Buffer.concat(stdout),
            stderr,
            code,
            exitBeforeClose,
          });
        });

        stream.write(body);
        stream.end();
      });
    });
    client.connect({
      host: "127.0.0.1",
      port: harness.port,
      username: "git",
      privateKey: harness.clientKey.privateKey,
      readyTimeout: 5000,
    });
  });
}

const MAIN_PUSH =
  pkt("old new refs/heads/main\0report-status side-band-64k\n") +
  "0000PACKDATA";
const BRANCH_PUSH =
  pkt("old new refs/heads/wip\0report-status side-band-64k\n") + "0000PACKDATA";
const TAG_PUSH =
  pkt("old new refs/tags/v1\0report-status side-band-64k\n") + "0000PACKDATA";

describe("SSH to HTTP bridge", () => {
  jest.setTimeout(20000);

  let gitea: FakeGitea;
  let proxy: Harness;

  beforeEach(async () => {
    gitea = await startFakeGitea();
    proxy = await startProxy(gitea.port);
  });

  afterEach(async () => {
    await proxy?.close();
    await gitea?.close();
  });

  it("sends the advertisement without HTTP's service preamble", async () => {
    // SSH clients do not expect `# service=`; leaving it in makes git bail out
    // before it has said anything.
    const result = await run(
      proxy,
      "git-upload-pack '/alice/ledger.git'",
      "0000",
    );
    expect(result.stdout.toString()).toContain("cafe HEAD");
    expect(result.stdout.toString()).not.toContain("# service=");
    expect(gitea.paths[0]).toBe(
      "/alice/ledger.git/info/refs?service=git-upload-pack",
    );
  });

  it("authenticates to Gitea as the user, not as us", async () => {
    await run(proxy, "git-upload-pack '/alice/ledger.git'", "0000");
    const expected = "Basic " + Buffer.from("un_alice:pw").toString("base64");
    expect(gitea.auth[0]).toBe(expected);
  });

  it("forwards a push to main and returns the upstream's reply", async () => {
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );

    expect(gitea.posts).toHaveLength(1);
    expect(gitea.posts[0].toString()).toBe(MAIN_PUSH);
    expect(result.stdout.toString()).toContain("upstream-reply");
    expect(result.code).toBe(0);
  });

  it("delivers exit-status before closing the channel", async () => {
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );
    expect(result.exitBeforeClose).toBe(true);
  });

  it.each([
    ["a branch", BRANCH_PUSH, "refs/heads/wip"],
    ["a tag", TAG_PUSH, "refs/tags/v1"],
  ])("rejects %s without POSTing anything", async (_l, body, ref) => {
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      body,
    );

    // The point of the proxy: the pack never reaches Gitea.
    expect(gitea.posts).toHaveLength(0);
    expect(result.stdout.toString()).toContain(
      `ng ${ref} only refs/heads/main may be pushed`,
    );
  });

  it("rejects with bytes identical to the HTTP path", async () => {
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      BRANCH_PUSH,
    );
    const http = buildRejectionReport(
      ["refs/heads/wip"],
      ["report-status", "side-band-64k"],
    );
    expect(result.stdout.subarray(result.stdout.length - http.length)).toEqual(
      http,
    );
  });

  it("passes protocol v2 through to Gitea", async () => {
    // v2 is what makes incremental fetch expressible as stateless POSTs.
    await run(proxy, "git-upload-pack '/alice/ledger.git'", "0000", {
      env: { GIT_PROTOCOL: "version=2" },
    });
    expect(gitea.protocols[0]).toBe("version=2");
  });

  it("turns each v2 command into its own POST", async () => {
    const lsRefs = pkt("command=ls-refs\n") + "0000";
    const fetch = pkt("command=fetch\n") + "0000";
    await run(proxy, "git-upload-pack '/alice/ledger.git'", lsRefs + fetch, {
      env: { GIT_PROTOCOL: "version=2" },
    });

    expect(gitea.posts.map((p) => p.toString())).toEqual([lsRefs, fetch]);
  });

  it("refuses a v0 incremental fetch instead of silently fetching nothing", async () => {
    // The real shape: wants, flush, haves, flush — the second flush is the
    // client closing a round and waiting for an ACK. HTTP has no conversation
    // to continue, so the only honest answer is an error the user can read.
    const result = await run(
      proxy,
      "git-upload-pack '/alice/ledger.git'",
      pkt("want cafe\n") + "0000" + pkt("have dead\n") + pkt("done\n"),
    );

    expect(gitea.posts).toHaveLength(0);
    expect(result.stderr).toContain("protocol v2");
    expect(result.code).toBe(1);
  });

  it("carries a fresh v0 clone: wants, flush, then done", async () => {
    // Byte order matters and an earlier version of this test had it wrong,
    // putting `done` before the flush. It passed while real v0 clones were
    // refused, which only a real Gitea exposed.
    const body = pkt("want cafe\n") + "0000" + pkt("done\n");
    const result = await run(
      proxy,
      "git-upload-pack '/alice/ledger.git'",
      body,
    );

    expect(gitea.posts.map((p) => p.toString())).toEqual([body]);
    expect(result.code).toBe(0);
  });

  it("reports Gitea's refusal rather than pretending to succeed", async () => {
    gitea.postStatus = 403;
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );
    expect(result.stderr).toContain("403");
    expect(result.code).toBe(1);
  });

  it("answers when Gitea is unreachable rather than leaving the client hanging", async () => {
    await gitea.close();
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );
    expect(result.stderr).toContain("Could not reach the git backend");
    expect(result.code).toBe(1);
  });

  it("refuses a command list that never completes", async () => {
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      Buffer.from("0010" + "x".repeat(64 * 1024 + 16)),
    );
    expect(gitea.posts).toHaveLength(0);
    expect(result.code).toBe(1);
  });

  it("carries a pack far larger than any buffer we would want to hold", async () => {
    // Correctness under size, and the reason the body is a stream rather than a
    // string: a real pack is megabytes, and a push must not depend on the proxy
    // being willing to hold all of it at once.
    const pack = "P".repeat(2 * 1024 * 1024);
    const body =
      pkt("old new refs/heads/main\0report-status\n") + "0000PACK" + pack;

    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      body,
    );

    expect(gitea.posts).toHaveLength(1);
    expect(gitea.posts[0].length).toBe(Buffer.byteLength(body));
    expect(gitea.posts[0].toString()).toBe(body);
    expect(result.code).toBe(0);
  });

  it("survives a client that disconnects mid-push", async () => {
    // A cancelled push closes the channel without ending it, and during the
    // command-list read nothing has been forwarded yet. The half-read request
    // must not reach Gitea, and the proxy must still serve whoever comes next.
    const client = new Client();
    await new Promise<void>((resolve, reject) => {
      client.once("error", reject);
      client.once("ready", resolve);
      client.connect({
        host: "127.0.0.1",
        port: proxy.port,
        username: "git",
        privateKey: proxy.clientKey.privateKey,
        readyTimeout: 5000,
      });
    });
    await new Promise<void>((resolve, reject) => {
      client.exec("git-receive-pack '/alice/ledger.git'", (err, stream) => {
        if (err) return reject(err);
        stream.write(MAIN_PUSH.slice(0, 20));
        setTimeout(() => {
          client.destroy();
          resolve();
        }, 50);
      });
    });

    expect(gitea.posts).toHaveLength(0);

    const after = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );
    expect(after.code).toBe(0);
  });

  it("reports a rejected push as a failure, not a success", async () => {
    // Every failure path ends the channel with exit(1); serve() used to follow
    // that with an unconditional exit(0). It worked only because SSH honours
    // the first exit-status — one library change from reporting a refused
    // request as success, on the path where success means the policy lapsed.
    gitea.postStatus = 403;
    const result = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );

    expect(result.code).toBe(1);
    expect(result.code).not.toBe(0);
  });

  it("stays healthy across repeated abrupt disconnects", async () => {
    // An abrupt disconnect fires close, often error, and never end. Waiting only
    // on end parked the pump forever, holding its buffer and listeners for the
    // life of the process — one leak per abandoned push, on exactly the path a
    // flaky network exercises.
    //
    // The parked promise itself is not observable from here: the client is gone,
    // so only the server knows. What this asserts is the consequence that is
    // observable — nothing half-read reaches Gitea, and the proxy keeps serving.
    // The fix is structural: close and error set `ended` and wake the waiter.
    for (let i = 0; i < 5; i++) {
      const client = new Client();
      await new Promise<void>((resolve, reject) => {
        client.once("error", reject);
        client.once("ready", resolve);
        client.connect({
          host: "127.0.0.1",
          port: proxy.port,
          username: "git",
          privateKey: proxy.clientKey.privateKey,
          readyTimeout: 5000,
        });
      });
      await new Promise<void>((resolve, reject) => {
        client.exec("git-receive-pack '/alice/ledger.git'", (err, stream) => {
          if (err) return reject(err);
          stream.write(MAIN_PUSH.slice(0, 20));
          setTimeout(() => {
            client.destroy();
            resolve();
          }, 20);
        });
      });
    }

    expect(gitea.posts).toHaveLength(0);
    const after = await run(
      proxy,
      "git-receive-pack '/alice/ledger.git'",
      MAIN_PUSH,
    );
    expect(after.code).toBe(0);
    expect(gitea.posts).toHaveLength(1);
  });
});
