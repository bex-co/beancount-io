import {
  fakeRedisCounter as mockFakeRedisCounter,
  fakeRedisCounterState,
  fakeRedisAdmission as mockFakeRedisAdmission,
  fakeRedisAdmissionState,
} from "@/foundation/redis/__tests__/fake-redis-counter";

const mockProxyLog = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock("@/shared/logger", () => ({
  logger: { child: () => mockProxyLog, warn: jest.fn() },
}));
const mockFetch = jest.fn();
jest.mock("node-fetch", () => mockFetch);
jest.mock("@/foundation/redis/redis-counter", () => mockFakeRedisCounter);
jest.mock("@/foundation/redis/redis-admission", () => mockFakeRedisAdmission);

import Router from "@koa/router";
import { Readable } from "node:stream";
import type { AppConfig, GitPasswordAuthPolicy } from "@/config/config";
import { AuthService } from "@/features/auth/service/auth-service";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import type { ApiKey } from "@/features/apikeys/data/api-key-model";
import { gitHttpPasswordAuthTotal } from "@/metrics/metrics-definitions";
import { clearRateLimitStores } from "@/shared/rate-limiter";
import {
  gitOperationFor,
  pktLine,
  setGitProxyHandler,
  SidebandMessageInjector,
} from "../git-proxy-handler";

/**
 * How the Git HTTPS proxy signs a request in (w3/m68): a personal access token
 * authorized like REST authorizes it, and the two password paths under each
 * `gitHttp.passwordAuth` value.
 */
const USER = {
  id: "user-1",
  email: "a@example.com",
  password: "stored-hash",
  ledger_username: "a",
  ledger_password: "gitea-secret",
  isBlocked: false,
};
const GITEA_AUTH = `Basic ${Buffer.from("a:gitea-secret").toString("base64")}`;

const keys = new Map<string, ApiKey>();
function key(plaintext: string, fields: Partial<ApiKey>): string {
  const now = new Date();
  keys.set(apiKeyDigest(plaintext), {
    id: `akey_${keys.size}`,
    userId: USER.id,
    name: "k",
    keyDigest: apiKeyDigest(plaintext),
    keyPrefix: plaintext.slice(0, 13),
    scopes: ["ledger.read"],
    createdAt: now,
    updatedAt: now,
    ...fields,
  });
  return plaintext;
}
const TOKENS = {
  read: key("bcio_read00000000000000000000000000", {}),
  write: key("bcio_write0000000000000000000000000", {
    scopes: ["ledger.write"],
  }),
  admin: key("bcio_admin0000000000000000000000000", {
    scopes: ["ledger.admin"],
  }),
};
const PINNED = key("bcio_pinned000000000000000000000000", {
  scopes: ["ledger.admin"],
  ledgerScope: "a/x",
});
const REVOKED = key("bcio_revoked00000000000000000000000", {
  scopes: ["ledger.admin"],
  revokedAt: new Date(Date.now() - 1000),
});
const EXPIRED = key("bcio_expired00000000000000000000000", {
  scopes: ["ledger.admin"],
  expiresAt: new Date(Date.now() - 1000),
});
const UNKNOWN = "bcio_unknown00000000000000000000000";

/** Each of git's four smart-HTTP requests, and the operation it performs. */
const ENDPOINTS = [
  {
    name: "info/refs for upload-pack",
    method: "GET",
    path: "info/refs",
    query: "service=git-upload-pack",
    operation: "read",
  },
  {
    name: "git-upload-pack",
    method: "POST",
    path: "git-upload-pack",
    query: "",
    operation: "read",
  },
  {
    name: "info/refs for receive-pack",
    method: "GET",
    path: "info/refs",
    query: "service=git-receive-pack",
    operation: "write",
  },
  {
    name: "git-receive-pack",
    method: "POST",
    path: "git-receive-pack",
    query: "",
    operation: "write",
  },
] as const;

const models = {
  user: {
    getById: jest.fn(async (_db: unknown, id: string) =>
      id === USER.id ? USER : null,
    ),
    getByMail: jest.fn(async (_db: unknown, email: string) =>
      email === USER.email ? USER : null,
    ),
    verifyPassword: jest.fn(
      async (_db: unknown, _id: string, password: string) =>
        password === "hunter2-pw",
    ),
    getUserByUsername: jest.fn(
      async (_db: unknown, _name: string): Promise<typeof USER | null> => null,
    ),
  },
  apiKey: {
    findByDigest: jest.fn(
      async (_db: unknown, digest: string) => keys.get(digest) ?? null,
    ),
    touchLastUsedAt: jest.fn(async () => undefined),
  },
};

type Handler = (ctx: Router.RouterContext) => Promise<void>;
function handlerFor(policy: GitPasswordAuthPolicy): Handler {
  let handler: Handler | undefined;
  const router = {
    all: (_path: string, _limiter: unknown, h: Handler) => {
      handler = h;
    },
  } as unknown as Router;
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
      gitea: { internalBaseUrl: "http://gitea:3000" },
      gitHttp: { passwordAuth: policy },
      dashboard: { url: "https://app.example.com" },
      favaApi: { baseUrl: "http://ledger" },
    } as unknown as AppConfig,
  );
  return handler!;
}

/** A receive-pack body for main, so the ref policy lets it through. */
function pushBody() {
  return Readable.from([
    Buffer.from(
      pkt(
        `${"0".repeat(40)} ${"1".repeat(40)} refs/heads/main\0report-status side-band-64k\n`,
      ) + "0000",
    ),
  ]);
}
const pkt = pktLine;

function request(
  endpoint: (typeof ENDPOINTS)[number],
  username: string,
  password: string,
  repo = "a/x",
) {
  const headers = new Map<string, string>([
    [
      "Authorization",
      `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    ],
  ]);
  const set = new Map<string, string>();
  return {
    params: { path: `${repo}.git/${endpoint.path}` },
    method: endpoint.method,
    querystring: endpoint.query,
    get: (name: string) => headers.get(name) ?? "",
    set: (name: string, value: string) => set.set(name, value),
    responseHeaders: set,
    headers: {},
    req: endpoint.path === "git-receive-pack" ? pushBody() : Readable.from([]),
    res: { once: jest.fn() },
    ip: "127.0.0.1",
    status: 0,
    body: null as unknown,
  } as unknown as Router.RouterContext & {
    responseHeaders: Map<string, string>;
  };
}

/** A Gitea pack response: band-1 data, then the closing flush. */
function giteaPackResponse() {
  return {
    ok: true,
    status: 200,
    headers: {
      forEach: (cb: (value: string, key: string) => void) => {
        cb("application/x-git-upload-pack-result", "content-type");
        cb("123", "content-length");
      },
    },
    body: Readable.from([Buffer.from(pkt("\x01PACK") + "0000")]),
  };
}

async function drain(body: unknown): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function passwordCount(path: string): Promise<number> {
  const metric = await gitHttpPasswordAuthTotal.get();
  return metric.values.find((v) => v.labels.path === path)?.value ?? 0;
}

beforeEach(() => {
  jest.clearAllMocks();
  clearRateLimitStores();
  fakeRedisCounterState.reset();
  fakeRedisAdmissionState.reset();
  gitHttpPasswordAuthTotal.reset();
  mockFetch.mockImplementation(async () => giteaPackResponse());
});

describe("gitOperationFor", () => {
  it.each(ENDPOINTS)("$name is a $operation", ({ path, query, operation }) => {
    expect(gitOperationFor(`/a/x.git/${path}`, query)).toBe(operation);
  });
});

describe("a personal access token as the Git password", () => {
  const handle = handlerFor("deny");
  const allowed: Record<keyof typeof TOKENS, readonly string[]> = {
    read: ["read"],
    write: ["read", "write"],
    admin: ["read", "write"],
  };

  for (const endpoint of ENDPOINTS) {
    for (const scope of Object.keys(TOKENS) as (keyof typeof TOKENS)[]) {
      const ok = allowed[scope].includes(endpoint.operation);
      it(`${endpoint.name} with a ledger.${scope} key is ${ok ? "forwarded" : "refused"}`, async () => {
        const ctx = request(endpoint, "anything", TOKENS[scope]);
        await handle(ctx);
        if (ok) {
          expect(ctx.status).toBe(200);
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`/a/x.git/${endpoint.path}`),
            expect.objectContaining({
              headers: expect.objectContaining({ Authorization: GITEA_AUTH }),
            }),
          );
        } else {
          expect(ctx.status).toBe(403);
          expect(ctx.body).toContain(`"ledger.${endpoint.operation}" scope`);
          expect(mockFetch).not.toHaveBeenCalled();
        }
      });
    }

    it(`${endpoint.name} with a key pinned to a/x is refused on a/y and forwarded on a/x`, async () => {
      const other = request(endpoint, "x", PINNED, "a/y");
      await handle(other);
      expect(other.status).toBe(403);
      expect(other.body).toContain("not authorized for this ledger");
      expect(mockFetch).not.toHaveBeenCalled();

      const own = request(endpoint, "x", PINNED, "a/x");
      await handle(own);
      expect(own.status).toBe(200);
    });
  }

  it("answers revoked, expired, and unknown keys identically", async () => {
    const answers = [];
    for (const token of [REVOKED, EXPIRED, UNKNOWN]) {
      const ctx = request(ENDPOINTS[0], "x", token);
      await handle(ctx);
      answers.push({
        status: ctx.status,
        body: ctx.body,
        headers: [...ctx.responseHeaders],
      });
    }
    expect(answers[0]).toEqual({
      status: 401,
      body: "Invalid credentials",
      headers: [["WWW-Authenticate", 'Basic realm="Git"']],
    });
    expect(answers[1]).toEqual(answers[0]);
    expect(answers[2]).toEqual(answers[0]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("is never tried as a password, so the failed-password budget is untouched", async () => {
    // An email username too: the token prefix decides before the `@` does.
    for (const token of [TOKENS.read, UNKNOWN]) {
      await handle(request(ENDPOINTS[0], USER.email, token));
    }
    expect(models.user.getByMail).not.toHaveBeenCalled();
    expect(models.user.verifyPassword).not.toHaveBeenCalled();
    expect(fakeRedisAdmissionState.windows.size).toBe(0);
    expect(fakeRedisAdmissionState.failures.size).toBe(0);
    expect(fakeRedisCounterState.counters.size).toBe(0);
  });

  it("is refused when its account is gone", async () => {
    models.user.getById.mockResolvedValueOnce(null);
    const ctx = request(ENDPOINTS[0], "x", TOKENS.admin);
    await handle(ctx);
    expect(ctx.status).toBe(401);
  });
});

describe("gitHttp.passwordAuth", () => {
  const PASSWORDS = [
    { path: "email", username: USER.email, password: "hunter2-pw" },
    { path: "gitea", username: "a", password: "gitea-secret" },
  ] as const;
  const clone = ENDPOINTS[1];
  const refs = ENDPOINTS[0];

  for (const { path, username, password } of PASSWORDS) {
    it(`allow: the ${path} password signs in with no log, count, or hint`, async () => {
      const ctx = request(clone, username, password);
      await handlerFor("allow")(ctx);
      expect(ctx.status).toBe(200);
      expect(mockProxyLog.warn).not.toHaveBeenCalledWith(
        "Git password sign-in",
        expect.anything(),
      );
      expect(await passwordCount(path)).toBe(0);
      expect(await drain(ctx.body)).toBe(pkt("\x01PACK") + "0000");
      expect(ctx.responseHeaders.get("content-length")).toBe("123");
    });

    it(`warn: the ${path} password signs in, is logged and counted once, and the pack carries the hint`, async () => {
      const ctx = request(clone, username, password);
      await handlerFor("warn")(ctx);
      expect(ctx.status).toBe(200);
      const logged = mockProxyLog.warn.mock.calls.filter(
        ([message]) => message === "Git password sign-in",
      );
      expect(logged).toEqual([
        [
          "Git password sign-in",
          { credential: path, path: "/a/x.git/git-upload-pack" },
        ],
      ]);
      expect(JSON.stringify(logged)).not.toContain(password);
      expect(await passwordCount(path)).toBe(1);
      const body = await drain(ctx.body);
      expect(body.startsWith(pkt("\x01PACK"))).toBe(true);
      expect(body).toContain(
        pkt("\x02https://app.example.com/settings/api-keys\n") + "0000",
      );
      // The body grew, so Gitea's length must not be passed on.
      expect(ctx.responseHeaders.has("content-length")).toBe(false);
    });

    it(`warn: the ${path} password's ref advertisement is left untouched`, async () => {
      const ctx = request(refs, username, password);
      await handlerFor("warn")(ctx);
      expect(await drain(ctx.body)).toBe(pkt("\x01PACK") + "0000");
    });

    it(`deny: the ${path} password gets a 401 naming the token page, and nothing is forwarded`, async () => {
      const ctx = request(clone, username, password);
      await handlerFor("deny")(ctx);
      expect(ctx.status).toBe(401);
      expect(ctx.responseHeaders.get("WWW-Authenticate")).toBe(
        'Basic realm="Git"',
      );
      expect(ctx.body).toContain("https://app.example.com/settings/api-keys");
      expect(mockFetch).not.toHaveBeenCalled();
      expect(models.user.verifyPassword).not.toHaveBeenCalled();
    });
  }

  it.each(["allow", "warn", "deny"] as const)(
    "%s: a token still clones and pushes, with no hint",
    async (policy) => {
      for (const endpoint of [clone, ENDPOINTS[3]]) {
        const ctx = request(endpoint, "x", TOKENS.write);
        await handlerFor(policy)(ctx);
        expect(ctx.status).toBe(200);
        expect(await drain(ctx.body)).toBe(pkt("\x01PACK") + "0000");
      }
      expect(await passwordCount("email")).toBe(0);
    },
  );
});

describe("a blocked account (w3/651)", () => {
  const clone = ENDPOINTS[1];
  const push = ENDPOINTS[3];
  const CREDENTIALS = [
    { kind: "token", username: "x", password: TOKENS.write },
    { kind: "email", username: USER.email, password: "hunter2-pw" },
    { kind: "gitea", username: "a", password: "gitea-secret" },
  ] as const;

  beforeEach(() => {
    // The Gitea username is the app user's, so the passthrough can find it.
    models.user.getUserByUsername.mockImplementation(
      async (_db: unknown, name: string) =>
        name.toLowerCase() === USER.ledger_username ? USER : null,
    );
  });
  afterEach(() => {
    USER.isBlocked = false;
    models.user.getUserByUsername.mockImplementation(async () => null);
  });

  for (const { kind, username, password } of CREDENTIALS) {
    it(`is refused with a ${kind} credential, and works again once unblocked`, async () => {
      const handle = handlerFor("allow");
      USER.isBlocked = true;
      for (const endpoint of [clone, push]) {
        const ctx = request(endpoint, username, password);
        await handle(ctx);
        // Only a verified password learns why; a token or an unverified Gitea
        // password gets the answer any wrong credential gets.
        if (kind === "email") {
          expect(ctx.status).toBe(403);
          expect(ctx.body).toContain("User is banned");
        } else {
          expect(ctx.status).toBe(401);
          expect(ctx.body).toBe("Invalid credentials");
        }
      }
      expect(mockFetch).not.toHaveBeenCalled();

      USER.isBlocked = false;
      for (const endpoint of [clone, push]) {
        const ctx = request(endpoint, username, password);
        await handle(ctx);
        expect(ctx.status).toBe(200);
      }
    });
  }

  it("a Gitea username with no app account still goes to Gitea", async () => {
    const ctx = request(clone, "gitea-admin", "secret");
    await handlerFor("allow")(ctx);
    expect(ctx.status).toBe(200);
  });
});

describe("SidebandMessageInjector", () => {
  const HINT = pkt("\x02one\n") + pkt("\x02two\n");

  /** Feed `input` split at every byte boundary, and check every split agrees. */
  async function inject(input: string | Buffer): Promise<Set<string>> {
    const bytes = Buffer.from(input);
    const outputs = new Set<string>();
    for (let split = 0; split <= bytes.length; split += 1) {
      const injector = new SidebandMessageInjector("one\ntwo");
      const parts = [bytes.subarray(0, split), bytes.subarray(split)].filter(
        (part) => part.length > 0,
      );
      outputs.add(await drain(Readable.from(parts).pipe(injector)));
    }
    return outputs;
  }

  it("adds the lines before the closing flush of a band-1 stream, however it is chunked", async () => {
    const stream = pkt("\x01PACKdata") + pkt("\x02progress\n") + "0000";
    expect(await inject(stream)).toEqual(
      new Set([pkt("\x01PACKdata") + pkt("\x02progress\n") + HINT + "0000"]),
    );
  });

  it("adds them to a v2 fetch response only after its packfile section", async () => {
    const v2 =
      pkt("acknowledgments\n") +
      pkt("NAK\n") +
      "0001" +
      pkt("packfile\n") +
      pkt("\x01PACK") +
      "0000";
    expect(await inject(v2)).toEqual(
      new Set([v2.slice(0, -4) + HINT + "0000"]),
    );
  });

  it.each([
    [
      "a v2 ls-refs answer",
      pkt(`${"a".repeat(40)} refs/heads/main\n`) + "0000",
    ],
    ["a negotiation round", pkt("acknowledgments\n") + pkt("NAK\n") + "0000"],
    ["a v0 NAK", pkt("NAK\n")],
    ["a stream that is not pkt-lines", "PACK\x00\x00\x00\x02raw0000"],
    ["a band-1 stream that does not end on a flush", pkt("\x01PACK")],
  ])("leaves %s byte-identical", async (_name, stream) => {
    expect(await inject(stream)).toEqual(new Set([stream]));
  });

  it("passes on a flush that is not the last packet", async () => {
    const stream = pkt("\x01a") + "0000" + pkt("\x01b") + "0000";
    expect(await inject(stream)).toEqual(
      new Set([pkt("\x01a") + "0000" + pkt("\x01b") + HINT + "0000"]),
    );
  });
});
