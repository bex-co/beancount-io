import "reflect-metadata";
import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import { ApolloServer } from "@apollo/server";
import { koaMiddleware } from "@as-integrations/koa";
import { buildSchema } from "type-graphql";
import { getNamedType, isObjectType } from "graphql";
import {
  fakeRedisAdmission as mockAdmission,
  fakeRedisAdmissionState,
  fakeRedisCounter as mockCounter,
  fakeRedisCounterState,
} from "@/foundation/redis/__tests__/fake-redis-counter";
import { AuthResolver } from "../auth-resolver";
import { AuthService } from "@/features/auth/service/auth-service";
import { AuthMailService } from "@/features/auth/service/auth-mail-service";
import { AuthSessionWorkflow } from "@/features/auth/workflow/auth-session-workflow";
import type { AuthMail } from "@/features/auth/data/auth-mail-model";
import { createContext, type IContext } from "@/server/graphql/context";
import { graphqlRateLimitMiddleware } from "@/server/graphql/rate-limit-middleware";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { clearRateLimitShadows } from "@/server/api/rate-limit";
import { formatError } from "@/server/graphql/format-error";
import { trustProxyHops } from "@/server/client-address";
import { COOKIE_NAME } from "@/shared/cookie-utils";
import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";

jest.mock("@/foundation/redis/redis-admission", () => mockAdmission);
jest.mock("@/foundation/redis/redis-counter", () => mockCounter);
jest.mock("@/foundation/redis/redis-utils", () => ({
  getRedisClient: () => mockProofRedis,
}));

// Only Redis storage/script execution is substituted. The production proof
// helpers perform all HMAC, account binding, challenge derivation and parsing;
// the scripts themselves also run against real Redis in redis-admission's
// integration suite. Each fake script transition is atomic before yielding.
const mockProofRedis = {
  down: false,
  records: new Map<string, { value: string; expiresAt: number }>(),
  async eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown> {
    if (this.down) throw new Error("synthetic Redis unavailable");
    const now = Date.now();
    const [proofKey, spentKey] = options.keys;
    const args = options.arguments;
    for (const key of options.keys) {
      if ((this.records.get(key)?.expiresAt ?? Infinity) <= now)
        this.records.delete(key);
    }
    if (script.includes("redis.call('EXISTS'")) {
      if (this.records.has(spentKey)) return 0;
      const existing = this.records.get(proofKey);
      if (existing) return existing.value === args[0] ? 1 : 0;
      this.records.set(proofKey, {
        value: args[0],
        expiresAt: now + Number(args[1]),
      });
      return 1;
    }
    if (script.includes("cjson.decode")) {
      const stored = this.records.get(proofKey);
      if (!stored) return "";
      const proof = JSON.parse(stored.value) as {
        account: string;
        code: string;
        userId: string;
      };
      if (proof.account !== args[0] || proof.code !== args[1]) return "";
      this.records.set(spentKey, {
        value: "spent",
        expiresAt: stored.expiresAt,
      });
      this.records.delete(proofKey);
      return proof.userId;
    }
    throw new Error("Unsupported synthetic Redis script");
  },
};

const ACCOUNT = {
  id: "usr_recovery_contract",
  email: "owner@example.com",
  password: "synthetic-stored-password-hash",
  isBlocked: false,
};
const config = {
  env: "test",
  jwt: { secret: "synthetic-http-recovery-test-secret" },
  dashboard: { url: "https://dashboard.example.com" },
} as AppConfig;

type MailInput = Pick<AuthMail, "id" | "kind" | "payload" | "expiresAt">;
function createFixture() {
  const rows = new Map<string, AuthMail>();
  const sessions = new Map<
    string,
    { userId: string; tokenId: string; issuedAt: number; expiresAt: number }
  >();
  let lease = 0;
  const owns = (mail: AuthMail) =>
    rows.get(mail.id)?.leaseToken === mail.leaseToken;
  const authMail = {
    enqueue: jest.fn(async (_db: unknown, input: MailInput) => {
      rows.set(input.id, {
        ...input,
        attempts: 0,
        availableAt: new Date(Date.now()),
        leaseToken: null,
        leaseUntil: null,
        createdAt: new Date(Date.now()),
      });
    }),
    claim: async () => {
      const mail = [...rows.values()].find(
        (row) =>
          row.availableAt.getTime() <= Date.now() &&
          (!row.leaseUntil || row.leaseUntil.getTime() <= Date.now()),
      );
      if (!mail) return null;
      mail.attempts++;
      mail.leaseToken = `synthetic-lease-${++lease}`;
      mail.leaseUntil = new Date(Date.now() + 60_000);
      return { ...mail };
    },
    savePayload: async (_db: unknown, mail: AuthMail, payload: string) => {
      if (!owns(mail)) return false;
      rows.get(mail.id)!.payload = payload;
      return true;
    },
    complete: async (_db: unknown, mail: AuthMail) => {
      if (owns(mail)) rows.delete(mail.id);
    },
    retry: async (_db: unknown, mail: AuthMail) => {
      if (!owns(mail)) return;
      Object.assign(rows.get(mail.id)!, {
        leaseToken: null,
        leaseUntil: null,
        availableAt: new Date(Date.now() + 5000),
      });
    },
    cleanup: async () => {
      for (const [id, row] of rows) {
        if (row.expiresAt.getTime() <= Date.now()) rows.delete(id);
      }
    },
  };
  const user = {
    getByMail: jest.fn(async (_db: unknown, email: string) =>
      email === ACCOUNT.email ? { ...ACCOUNT } : null,
    ),
    getByIdForUpdate: jest.fn(async (_db: unknown, id: string) =>
      id === ACCOUNT.id ? { ...ACCOUNT } : null,
    ),
    getById: jest.fn(async (_db: unknown, id: string) =>
      id === ACCOUNT.id ? { ...ACCOUNT } : null,
    ),
    verifyPassword: jest.fn(
      async (_db: unknown, _id: string, password: string) =>
        password === "correct-password",
    ),
    updateLastSeenAt: jest.fn(async () => undefined),
  };
  const jwt = {
    create: jest.fn(async (_db: unknown, userId: string) => {
      const token = `synthetic-session-${sessions.size + 1}`;
      sessions.set(token, {
        userId,
        tokenId: `synthetic-session-id-${sessions.size + 1}`,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      });
      return { token, expireAt: new Date(Date.now() + 3_600_000) };
    }),
    verify: jest.fn(async (_db: unknown, token: string) => sessions.get(token)),
  };
  const models = {
    authMail,
    user,
    jwt,
    emailToken: {
      issueToken: async (userId: string, token: string, expires: Date) => ({
        userId,
        token,
        expireAt: expires.toISOString(),
      }),
    },
  };
  const db = {
    transaction: async <T>(run: (tx: unknown) => Promise<T>) => run({}),
  };
  const database = { models, db } as unknown as DatabaseLayer;
  const sendgrid = {
    sendMail: jest.fn(
      async (_mail: {
        to: string;
        text?: string;
        html?: string;
      }): Promise<void> => undefined,
    ),
  };
  const mail = new AuthMailService(
    models as never,
    db as never,
    sendgrid as never,
    config.jwt.secret,
    config.dashboard.url,
  );
  const service = new AuthService(
    models as never,
    db as never,
    sendgrid as never,
    {} as never,
    {} as never,
    config,
    async () => false,
    mail.enqueue,
  );
  const ensureFollowing = jest.fn();
  const workflow = new AuthSessionWorkflow(
    service,
    { ensureFollowing },
    models as never,
    db as never,
  );
  return {
    database,
    rows,
    authMail,
    user,
    jwt,
    sendgrid,
    mail,
    ensureFollowing,
    resolver: new AuthResolver(service, workflow),
  };
}

const REQUEST = `mutation($email: String!, $returnTo: String) {
  requestSignInRecovery(email: $email, returnTo: $returnTo) { success }
}`;
const REQUEST_RESET = `mutation($email: String!) {
  sendForgotPasswordLink(email: $email) { success }
}`;
const RECOVER = `mutation($email: String!, $challengeId: String!, $code: String!, $password: String!) {
  signInWithEmailCode(email: $email, challengeId: $challengeId, code: $code, password: $password) { token expireAt }
}`;
const SIGN_IN = `mutation($email: String!, $password: String!) {
  signIn(email: $email, password: $password) { token }
}`;
type Reply = {
  data?: Record<string, unknown> | null;
  errors?: {
    path?: string[];
    extensions: { code?: string; retryAfter?: number };
  }[];
};
let fixture: ReturnType<typeof createFixture>;
let now: number;
let server: http.Server;
let apollo: ApolloServer<IContext>;
let base: string;
let recoveryResponseFields: string[];

async function post(
  query: string,
  variables: Record<string, unknown> = {},
  options: { ip?: string; spoofedIp?: string; cookie?: string } = {},
) {
  const response = await fetch(base, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `${options.spoofedIp ?? "192.0.2.9"}, ${options.ip ?? "198.51.100.1"}`,
      "x-real-ip": options.spoofedIp ?? "192.0.2.9",
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json()) as Reply,
  };
}

beforeAll(async () => {
  const schema = await buildSchema({
    resolvers: [AuthResolver],
    container: { get: () => fixture.resolver },
    globalMiddlewares: [
      graphqlRateLimitMiddleware(),
      graphqlScopeMiddleware("enforce"),
    ],
    validate: true,
  });
  const recoveryResponse = getNamedType(
    schema.getMutationType()!.getFields().requestSignInRecovery.type,
  );
  if (!isObjectType(recoveryResponse))
    throw new Error("Recovery response must be an object");
  recoveryResponseFields = Object.keys(recoveryResponse.getFields());
  apollo = new ApolloServer<IContext>({
    schema,
    formatError,
    includeStacktraceInErrorResponses: false,
  });
  await apollo.start();
  const app = new Koa();
  trustProxyHops(app, 1);
  app.use(bodyParser());
  app.use(
    koaMiddleware(apollo, {
      context: async ({ ctx }) => createContext(ctx, fixture.database, config),
    }),
  );
  server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  base = `http://127.0.0.1:${port}/api-gateway/`;
});

beforeEach(() => {
  now = Date.parse("2026-01-01T00:00:00Z");
  jest.spyOn(Date, "now").mockImplementation(() => now);
  fakeRedisAdmissionState.reset();
  fakeRedisCounterState.reset();
  clearRateLimitShadows();
  mockProofRedis.records.clear();
  mockProofRedis.down = false;
  fixture = createFixture();
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  await apollo.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function ownershipProofFromMail(sent: { text?: string }, jobId: string) {
  const code = /\b\d{6}\b/.exec(sent.text ?? "")?.[0];
  const links = (sent.text?.match(/https:\/\/\S+/g) ?? []).map(
    (url) => new URL(url),
  );
  const link = links.find(
    (url) =>
      url.pathname === "/auth/login/" && url.searchParams.has("recovery"),
  );
  expect(code).toEqual(expect.stringMatching(/^\d{6}$/));
  expect(link).toBeDefined();
  const challengeId = link!.searchParams.get("recovery")!;
  expect(challengeId).toMatch(/^rcv_[a-f0-9]{64}$/);
  expect(challengeId).not.toBe(jobId);
  return {
    jobId,
    code: code!,
    challengeId,
    link: link!,
    email: ACCOUNT.email,
    password: "correct-password",
  };
}

async function deliveredRecovery(
  returnTo?: string,
  kind: "reset" | "sign-in-recovery" = "sign-in-recovery",
) {
  const response = await post(kind === "reset" ? REQUEST_RESET : REQUEST, {
    email: ACCOUNT.email,
    returnTo,
  });
  expect(response.body).toEqual({
    data: {
      [kind === "reset" ? "sendForgotPasswordLink" : "requestSignInRecovery"]: {
        success: true,
      },
    },
  });
  const jobId = fixture.authMail.enqueue.mock.calls.at(-1)![1].id;
  await fixture.mail.processBatch();
  const sent = fixture.sendgrid.sendMail.mock.calls.at(-1)![0];
  return { response, ...ownershipProofFromMail(sent, jobId) };
}

describe("sign-in recovery over HTTP GraphQL", () => {
  it("queues identical opaque success responses for known and unknown addresses without waiting for the provider", async () => {
    expect(recoveryResponseFields).toEqual(["success"]);
    const known = await post(REQUEST, { email: " OWNER@EXAMPLE.COM " });
    const unknown = await post(REQUEST, { email: "unknown@example.com" });
    expect(known.body).toEqual({
      data: { requestSignInRecovery: { success: true } },
    });
    expect(unknown.body).toEqual(known.body);
    expect(known.headers.get("set-cookie")).toBeNull();
    expect(fixture.rows).toHaveProperty("size", 2);
    expect(fixture.user.getByMail).not.toHaveBeenCalled();
    expect(fixture.sendgrid.sendMail).not.toHaveBeenCalled();
    const receipts = [...fixture.rows.keys()];
    for (const receipt of receipts)
      expect(JSON.stringify(known.body)).not.toContain(receipt);
    let release: () => void = () => undefined;
    const delivery = new Promise<void>((resolve) => {
      release = resolve;
    });
    fixture.sendgrid.sendMail.mockImplementation(() => delivery);
    const processing = fixture.mail.processBatch();
    try {
      for (
        let turn = 0;
        turn < 30 && !fixture.sendgrid.sendMail.mock.calls.length;
        turn++
      ) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect(fixture.sendgrid.sendMail).toHaveBeenCalledTimes(1);
      const lookups = fixture.user.getByMail.mock.calls.length;
      expect((await post(REQUEST, { email: ACCOUNT.email })).body).toEqual(
        known.body,
      );
      expect(
        (await post(REQUEST, { email: "another@example.com" })).body,
      ).toEqual(known.body);
      expect(fixture.user.getByMail).toHaveBeenCalledTimes(lookups);
    } finally {
      release();
      await processing;
    }
  });

  it("recovers through exhausted ordinary budgets, sets a session cookie and follows once without clearing request volume", async () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const result = await post(
        SIGN_IN,
        { email: ACCOUNT.email, password: "wrong" },
        { ip: `192.0.2.${attempt + 1}` },
      );
      expect(result.body.errors?.[0].extensions.code).toBe(
        attempt < 10 ? "BAD_USER_INPUT" : "RATE_LIMITED",
      );
    }
    const proof = await deliveredRecovery(
      "/ledger/default?view=journal#latest",
    );
    expect(proof.link.searchParams.get("next")).toBe(
      "/ledger/default?view=journal#latest",
    );
    const result = await post(
      RECOVER,
      { ...proof, email: " OWNER@EXAMPLE.COM " },
      { ip: "203.0.113.1" },
    );
    expect(result.status).toBe(200);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.signInWithEmailCode).toMatchObject({
      token: "synthetic-session-1",
      expireAt: expect.any(String),
    });
    const cookie = result.headers.get("set-cookie")!;
    expect(cookie).toContain(`${COOKIE_NAME}=synthetic-session-1`);
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("samesite=lax");
    expect(fixture.jwt.create).toHaveBeenCalledTimes(1);
    expect(fixture.ensureFollowing).toHaveBeenCalledTimes(1);
    expect(fixture.ensureFollowing).toHaveBeenCalledWith(
      "open_ledger",
      expect.objectContaining({ userId: ACCOUNT.id, method: "session" }),
    );
    const ordinary = await post(
      SIGN_IN,
      { email: ACCOUNT.email, password: "correct-password" },
      { ip: "203.0.113.2", cookie: cookie.split(";")[0] },
    );
    expect(ordinary.body.errors?.[0].extensions.code).toBe("RATE_LIMITED");
    const replay = await post(RECOVER, proof, { ip: "203.0.113.3" });
    expect(replay.body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
    expect(replay.headers.get("set-cookie")).toBeNull();
    expect(fixture.jwt.create).toHaveBeenCalledTimes(1);
    expect(fixture.ensureFollowing).toHaveBeenCalledTimes(1);
  });

  it.each(
    (["sign-in-recovery", "reset"] as const).flatMap((mailKind) =>
      (["wrong code", "wrong email", "expired", "wrong password"] as const).map(
        (kind) => [mailKind, kind] as const,
      ),
    ),
  )(
    "refuses %s mail with %s without issuing a session",
    async (mailKind, kind) => {
      const proof = await deliveredRecovery(undefined, mailKind);
      fixture.user.getByMail.mockClear();
      const input = { ...proof };
      if (kind === "wrong code")
        input.code = proof.code === "000000" ? "000001" : "000000";
      if (kind === "wrong email") input.email = "other@example.com";
      if (kind === "expired") now += 10 * 60_000 + 1;
      if (kind === "wrong password") input.password = "wrong";
      const result = await post(RECOVER, input);
      expect(result.body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
      expect(result.headers.get("set-cookie")).toBeNull();
      expect(fixture.jwt.create).not.toHaveBeenCalled();
      expect(fixture.ensureFollowing).not.toHaveBeenCalled();
      if (kind !== "wrong password")
        expect(fixture.user.getByMail).not.toHaveBeenCalled();
      else {
        expect(fixture.user.verifyPassword).toHaveBeenCalledTimes(1);
        const retry = await post(RECOVER, proof);
        expect(retry.body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
        expect(fixture.user.verifyPassword).toHaveBeenCalledTimes(1);
      }
    },
  );

  it("recovers from delivered reset mail after shared delivery and ordinary sign-in quotas are exhausted", async () => {
    let lastJobId = "";
    for (let delivery = 0; delivery < 5; delivery++) {
      const response = await post(REQUEST_RESET, { email: ACCOUNT.email });
      expect(response.body).toEqual({
        data: { sendForgotPasswordLink: { success: true } },
      });
      lastJobId = fixture.authMail.enqueue.mock.calls.at(-1)![1].id;
      await fixture.mail.processBatch();
      expect(fixture.sendgrid.sendMail).toHaveBeenCalledTimes(delivery + 1);
      const mail = fixture.sendgrid.sendMail.mock.calls.at(-1)![0];
      expect(mail.text).toMatch(
        /https:\/\/dashboard\.example\.com\/auth\/reset-password\/\?token=[a-f0-9]{64}/,
      );
      // Expire the one-minute cooldown after the fifth mail as well, so the
      // refused sixth delivery proves the hourly cap remains in force.
      now += 60_000;
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      const result = await post(
        SIGN_IN,
        { email: ACCOUNT.email, password: "wrong" },
        { ip: `192.0.2.${attempt + 1}` },
      );
      expect(result.body.errors?.[0].extensions.code).toBe(
        attempt < 10 ? "BAD_USER_INPUT" : "RATE_LIMITED",
      );
    }
    const alreadyDelivered = fixture.sendgrid.sendMail.mock.calls.at(-1)![0];
    const request = await post(REQUEST, { email: ACCOUNT.email });
    expect(request.body).toEqual({
      data: { requestSignInRecovery: { success: true } },
    });
    await fixture.mail.processBatch();
    expect(fixture.sendgrid.sendMail).toHaveBeenCalledTimes(5);
    expect(fixture.rows.size).toBe(0);

    const proof = ownershipProofFromMail(alreadyDelivered, lastJobId);
    const result = await post(RECOVER, proof, { ip: "203.0.113.1" });
    expect(result.body.errors).toBeUndefined();
    expect(result.headers.get("set-cookie")).toContain(
      `${COOKIE_NAME}=synthetic-session-1`,
    );
    expect(fixture.jwt.create).toHaveBeenCalledTimes(1);
    expect(fixture.ensureFollowing).toHaveBeenCalledTimes(1);
    const ordinary = await post(
      SIGN_IN,
      { email: ACCOUNT.email, password: "correct-password" },
      { ip: "203.0.113.2" },
    );
    expect(ordinary.body.errors?.[0].extensions.code).toBe("RATE_LIMITED");
    const replay = await post(RECOVER, proof, { ip: "203.0.113.3" });
    expect(replay.body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
    expect(replay.headers.get("set-cookie")).toBeNull();
    expect(fixture.jwt.create).toHaveBeenCalledTimes(1);
    expect(fixture.ensureFollowing).toHaveBeenCalledTimes(1);
    expect(fixture.sendgrid.sendMail).toHaveBeenCalledTimes(5);
  });

  it("keeps the public job receipt from exhausting the mailed ownership challenge", async () => {
    const proof = await deliveredRecovery();
    fixture.user.getByMail.mockClear();
    for (let attempt = 0; attempt < 6; attempt++) {
      const result = await post(
        RECOVER,
        { ...proof, challengeId: proof.jobId },
        { ip: `192.0.2.${attempt + 1}` },
      );
      expect(result.body.errors?.[0].extensions.code).toBe(
        attempt < 5 ? "BAD_USER_INPUT" : "RATE_LIMITED",
      );
    }
    expect(fixture.user.getByMail).not.toHaveBeenCalled();
    const valid = await post(RECOVER, proof, { ip: "203.0.113.1" });
    expect(valid.body.errors).toBeUndefined();
    expect(fixture.jwt.create).toHaveBeenCalledTimes(1);
  });

  it("returns uniform retryable errors when shared admission is unavailable", async () => {
    fakeRedisAdmissionState.down = true;
    const known = await post(REQUEST, { email: ACCOUNT.email });
    const unknown = await post(REQUEST, { email: "unknown@example.com" });
    expect(known.body.errors?.[0].extensions).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      retryAfter: 5,
    });
    expect(unknown.body).toEqual(known.body);
    expect(fixture.authMail.enqueue).not.toHaveBeenCalled();
    expect(fixture.user.getByMail).not.toHaveBeenCalled();
    expect(fixture.sendgrid.sendMail).not.toHaveBeenCalled();
  });

  it.each(["sign-in-recovery", "reset"] as const)(
    "fails closed when the proof store becomes unavailable after %s mail delivery",
    async (mailKind) => {
      const proof = await deliveredRecovery(undefined, mailKind);
      fixture.user.getByMail.mockClear();
      mockProofRedis.down = true;
      const result = await post(RECOVER, proof);
      expect(result.body.errors?.[0].extensions).toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        retryAfter: 5,
      });
      expect(fixture.user.getByMail).not.toHaveBeenCalled();
      expect(fixture.jwt.create).not.toHaveBeenCalled();
      expect(fixture.ensureFollowing).not.toHaveBeenCalled();
      expect(result.headers.get("set-cookie")).toBeNull();
    },
  );

  it("charges request aliases individually and keeps spoofed forwarding entries out of the source identity", async () => {
    const aliases = Array.from(
      { length: 11 },
      (_, index) =>
        `attempt${index}: requestSignInRecovery(email: "person${index}@example.com") { success }`,
    ).join("\n");
    const result = await post(
      `mutation { ${aliases} }`,
      {},
      { ip: "198.51.100.99" },
    );
    expect(result.body.errors?.[0].path).toEqual(["attempt10"]);
    expect(result.body.errors?.[0].extensions).toMatchObject({
      code: "RATE_LIMITED",
      retryAfter: 60,
    });
    expect(fixture.authMail.enqueue).toHaveBeenCalledTimes(10);
    const spoofed = await post(
      REQUEST,
      { email: "another@example.com" },
      { ip: "198.51.100.99", spoofedIp: "203.0.113.250" },
    );
    expect(spoofed.body.errors?.[0].extensions.code).toBe("RATE_LIMITED");
    const independent = await post(
      REQUEST,
      { email: "another@example.com" },
      { ip: "198.51.100.100" },
    );
    expect(independent.body.errors).toBeUndefined();
    expect(fixture.authMail.enqueue).toHaveBeenCalledTimes(11);
  });
});
