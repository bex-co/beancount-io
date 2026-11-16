import {
  fakeRedisCounter as mockFakeRedisCounter,
  fakeRedisCounterState,
  fakeRedisAdmission as mockFakeRedisAdmission,
  fakeRedisAdmissionState,
} from "@/foundation/redis/__tests__/fake-redis-counter";

jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
    warn: jest.fn(),
  },
}));
// The per-account wrong-password budget lives in Redis (w0/m7).
jest.mock("@/foundation/redis/redis-counter", () => mockFakeRedisCounter);
jest.mock("@/foundation/redis/redis-admission", () => mockFakeRedisAdmission);

import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig, GitPasswordAuthPolicy } from "@/config/config";
import { AuthService } from "@/features/auth/service/auth-service";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import { clearRateLimitStores } from "@/shared/rate-limiter";
import { setGitProxyHandler } from "../git-proxy-handler";

/**
 * Git over HTTPS as a real `git` client sees it (w3/m68): the proxy in front
 * of a stand-in Gitea that is `git http-backend`, so the 401 text, the 403
 * text, and the `remote:` hint are checked as git prints them, and a clone or
 * push that the proxy lets through actually completes.
 */
const run = promisify(execFile);

const ALICE = {
  id: "user-alice",
  email: "alice@example.com",
  // bcrypt of "password"
  password: "$2b$10$5mBgP06bwKPcyhp0Fg7sqeIACeCt.enWK4cu2U7FJjlUzB9as/vQS",
  ledger_username: "alice",
  ledger_password: "gitea-secret",
};

const keys = new Map<string, ApiKey>();
function key(plaintext: string, fields: Partial<ApiKey>): string {
  const now = new Date();
  keys.set(apiKeyDigest(plaintext), {
    id: `akey_${keys.size}`,
    userId: ALICE.id,
    name: "git",
    keyDigest: apiKeyDigest(plaintext),
    keyPrefix: plaintext.slice(0, 13),
    scopes: ["ledger.read"],
    createdAt: now,
    updatedAt: now,
    ...fields,
  });
  return plaintext;
}
const READ = key("bcio_readKey1111111111111111111111", {});
const WRITE = key("bcio_writeKey111111111111111111111", {
  scopes: ["ledger.write"],
});
const PINNED = key("bcio_pinnedKey11111111111111111111", {
  scopes: ["ledger.write"],
  ledgerScope: "alice/book",
});
const REVOKED = key("bcio_revokedKey1111111111111111111", {
  scopes: ["ledger.write"],
  revokedAt: new Date(Date.now() - 1000),
});

let root: string;
let gitea: http.Server;
const servers: http.Server[] = [];
const proxies = {} as Record<GitPasswordAuthPolicy, string>;
/** Authorization headers the stand-in Gitea received. */
const forwarded: string[] = [];

async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

/** `git http-backend` as a CGI behind a plain HTTP server. */
function httpBackend(req: http.IncomingMessage, res: http.ServerResponse) {
  forwarded.push(req.headers.authorization ?? "");
  const url = new URL(req.url ?? "/", "http://gitea");
  const header = (name: string) => {
    const value = req.headers[name];
    return typeof value === "string" ? value : "";
  };
  const child = spawn("git", ["http-backend"], {
    env: {
      PATH: process.env.PATH,
      GIT_PROJECT_ROOT: root,
      GIT_HTTP_EXPORT_ALL: "1",
      GIT_CONFIG_NOSYSTEM: "1",
      HOME: root,
      PATH_INFO: url.pathname,
      QUERY_STRING: url.search.slice(1),
      REQUEST_METHOD: req.method ?? "GET",
      CONTENT_TYPE: header("content-type"),
      HTTP_CONTENT_ENCODING: header("content-encoding"),
      GIT_PROTOCOL: header("git-protocol"),
      REMOTE_USER: "alice",
      REMOTE_ADDR: "127.0.0.1",
    },
  });
  req.pipe(child.stdin);
  let head = Buffer.alloc(0);
  let headersDone = false;
  child.stdout.on("data", (chunk: Buffer) => {
    if (headersDone) {
      res.write(chunk);
      return;
    }
    head = Buffer.concat([head, chunk]);
    const crlf = head.indexOf("\r\n\r\n");
    const lf = head.indexOf("\n\n");
    const end = crlf >= 0 ? crlf : lf;
    if (end < 0) return;
    const separator = crlf >= 0 ? 4 : 2;
    for (const line of head.subarray(0, end).toString().split(/\r?\n/)) {
      const colon = line.indexOf(":");
      const name = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      if (name.toLowerCase() === "status") res.statusCode = parseInt(value, 10);
      else res.setHeader(name, value);
    }
    headersDone = true;
    res.write(head.subarray(end + separator));
  });
  child.stdout.on("end", () => res.end());
}

function proxyFor(policy: GitPasswordAuthPolicy, giteaUrl: string) {
  const models = {
    user: {
      getById: async (_db: unknown, id: string) =>
        id === ALICE.id ? ALICE : null,
      getByMail: async (_db: unknown, email: string) =>
        email === ALICE.email ? ALICE : null,
      verifyPassword: async (_db: unknown, _id: string, password: string) =>
        password === "password",
      getUserByUsername: async () => null,
    },
    apiKey: {
      findByDigest: async (_db: unknown, digest: string) =>
        keys.get(digest) ?? null,
      touchLastUsedAt: async () => undefined,
    },
  };
  const router = new Router();
  setGitProxyHandler(
    router,
    {
      database: { db: {}, models },
      services: {
        stripe: {},
        auth: new AuthService(
          models as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          {} as never,
          async () => false,
        ),
      },
      clients: { cacheHelper: {} },
    } as never,
    {
      gitea: { internalBaseUrl: giteaUrl },
      gitHttp: { passwordAuth: policy },
      dashboard: { url: "https://app.example.com" },
      favaApi: { baseUrl: "http://127.0.0.1:9" },
    } as unknown as AppConfig,
  );
  const app = new Koa();
  app.silent = true;
  app.use(router.routes());
  return http.createServer(app.callback());
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "git-proxy-real-git-"));
  for (const repo of ["book", "other"]) {
    const dir = path.join(root, "alice", `${repo}.git`);
    await run("git", ["init", "--bare", "-q", "-b", "main", dir]);
    await run("git", ["-C", dir, "config", "http.receivepack", "true"]);
  }
  // Something to clone.
  const seed = path.join(root, "seed");
  await git(["init", "-q", "-b", "main", seed]);
  await writeFile(path.join(seed, "main.beancount"), "; ledger\n");
  await git(["-C", seed, "add", "."]);
  await git(["-C", seed, "commit", "-q", "-m", "seed"]);
  for (const repo of ["book", "other"]) {
    await git([
      "-C",
      seed,
      "push",
      "-q",
      path.join(root, "alice", `${repo}.git`),
      "main",
    ]);
  }

  gitea = http.createServer(httpBackend);
  const giteaUrl = await listen(gitea);
  for (const policy of ["allow", "warn", "deny"] as const) {
    proxies[policy] = await listen(proxyFor(policy, giteaUrl));
  }
});

beforeEach(() => {
  forwarded.length = 0;
  clearRateLimitStores();
  fakeRedisCounterState.reset();
  fakeRedisAdmissionState.reset();
});

afterAll(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await rm(root, { recursive: true, force: true });
});

async function git(args: string[]) {
  return run("git", ["-c", "credential.helper=", ...args], {
    env: {
      PATH: process.env.PATH,
      HOME: root,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@example.com",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@example.com",
    },
  });
}

/** Run git and return how it ended and what it printed, never throwing. */
async function attempt(args: string[]) {
  try {
    const { stderr } = await git(args);
    return { ok: true, stderr };
  } catch (error) {
    return { ok: false, stderr: (error as { stderr: string }).stderr };
  }
}

function remote(
  policy: GitPasswordAuthPolicy,
  username: string,
  password: string,
  repo = "book",
) {
  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  return `${proxies[policy].replace("//", `//${credentials}@`)}/git/alice/${repo}.git`;
}

let checkout = 0;
async function clone(url: string) {
  const dir = path.join(root, `checkout-${checkout++}`);
  return { dir, ...(await attempt(["clone", url, dir])) };
}

async function commitAndPush(dir: string) {
  await writeFile(path.join(dir, `entry-${checkout++}.beancount`), "; x\n");
  await git(["-C", dir, "add", "."]);
  await git(["-C", dir, "commit", "-q", "-m", "entry"]);
  return attempt(["-C", dir, "push", "origin", "main"]);
}

const giteaCredential = `Basic ${Buffer.from("alice:gitea-secret").toString("base64")}`;
const HINT =
  "remote: Signing in to Git over HTTPS with a password is being phased out.";

describe("Git over HTTPS with a real git client", () => {
  it("clones with a read token under any username, forwarding the owner's Gitea credential", async () => {
    const result = await clone(remote("deny", "anything", READ));
    expect(result).toMatchObject({ ok: true });
    expect(result.stderr).not.toContain("remote: Signing in");
    expect(forwarded.length).toBeGreaterThan(0);
    expect(new Set(forwarded)).toEqual(new Set([giteaCredential]));
  });

  it("refuses a read token's push with the scope git prints", async () => {
    const { dir } = await clone(remote("allow", "x", READ));
    const result = await commitAndPush(dir);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain(
      'remote: This operation requires the "ledger.write" scope.',
    );
  });

  it("pushes with a write token", async () => {
    const { dir } = await clone(remote("deny", "x", WRITE));
    expect(await commitAndPush(dir)).toMatchObject({ ok: true });
  });

  it("refuses a pinned token on another ledger and accepts it on its own", async () => {
    expect(await clone(remote("allow", "x", PINNED, "book"))).toMatchObject({
      ok: true,
    });
    const other = await clone(remote("allow", "x", PINNED, "other"));
    expect(other.ok).toBe(false);
    expect(other.stderr).toContain(
      "remote: This credential is not authorized for this ledger",
    );
  });

  it("answers a revoked token like a wrong password, without charging the password budget", async () => {
    const revoked = await clone(remote("allow", "x", REVOKED));
    const wrong = await clone(
      remote("allow", "x", "bcio_neverExisted111111111111111"),
    );
    expect(revoked.ok).toBe(false);
    expect(revoked.stderr).toContain("Authentication failed");
    expect(wrong.stderr.replace(/checkout-\d+|bcio_\w+/g, "")).toBe(
      revoked.stderr.replace(/checkout-\d+|bcio_\w+/g, ""),
    );
    expect(fakeRedisAdmissionState.failures.size).toBe(0);
    expect(fakeRedisAdmissionState.windows.size).toBe(0);
  });

  it("under warn, a password clone and push still work and print the switch-to-token hint", async () => {
    const result = await clone(remote("warn", ALICE.email, "password"));
    expect(result.ok).toBe(true);
    expect(result.stderr).toContain(HINT);
    expect(result.stderr).toContain(
      "remote: https://app.example.com/settings/api-keys",
    );
    const push = await commitAndPush(result.dir);
    expect(push.ok).toBe(true);
    expect(push.stderr).toContain(HINT);
  });

  it("under allow, a password clone prints no hint", async () => {
    const result = await clone(remote("allow", ALICE.email, "password"));
    expect(result.ok).toBe(true);
    expect(result.stderr).not.toContain("remote: Signing in");
  });

  it("under deny, a password clone is refused with the token page git prints", async () => {
    for (const [username, password] of [
      [ALICE.email, "password"],
      ["alice", "gitea-secret"],
    ]) {
      const result = await clone(remote("deny", username, password));
      expect(result.ok).toBe(false);
      expect(result.stderr).toContain(
        "remote: Password sign-in for Git over HTTPS is turned off.",
      );
      expect(result.stderr).toContain(
        "remote: Create one at https://app.example.com/settings/api-keys",
      );
    }
    expect(forwarded).toEqual([]);
  });
});
