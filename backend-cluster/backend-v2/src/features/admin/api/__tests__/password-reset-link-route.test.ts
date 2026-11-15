import "reflect-metadata";
import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { config } from "@/config/config";
import { AdminService } from "../../service/admin-service";
import { AuthService } from "@/features/auth/service/auth-service";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { BadUserInputError } from "@/shared/errors";
import { registerPasswordResetLinkRoute } from "../password-reset-link-handler";

// Every log call from every module, so the test can prove the reset token
// never reaches a log line (ADR029 rejected printing reset links to the log).
const logCalls: unknown[][] = [];
jest.mock("@/shared/logger", () => {
  const record =
    (level: string) =>
    (...args: unknown[]) =>
      logCalls.push([level, ...args]);
  const make = (): Record<string, unknown> => ({
    child: () => make(),
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  });
  return { logger: make() };
});

const ADMIN_TOKEN = "synthetic-admin-token";
const DASHBOARD = "https://books.example.test";
const ACCOUNT = {
  id: "usr_ada",
  email: "ada@example.test",
  ledger_username: "ada",
  isBlocked: false,
};

type Issued = { userId: string; token: string; expireAt: string };

/**
 * The reset-token store with the real model's contract: a token redeems once,
 * and a completed reset spends every other token the user holds.
 */
function tokenStore() {
  const live = new Map<string, Issued>();
  return {
    issueToken: jest.fn(
      async (userId: string, token: string, expiresAt: Date) => {
        const record = { userId, token, expireAt: expiresAt.toISOString() };
        live.set(token, record);
        return record;
      },
    ),
    findOne: jest.fn(async (token: string) => live.get(token) ?? null),
    findOneAndDelete: jest.fn(async (token: string) => {
      const record = live.get(token) ?? null;
      live.delete(token);
      return record;
    }),
    deleteByUserId: jest.fn(async (userId: string) => {
      for (const [token, record] of live)
        if (record.userId === userId) live.delete(token);
    }),
  };
}

describe("POST /api/admin/password-reset-link", () => {
  let server: http.Server;
  let url: string;
  let auth: AuthService;
  let passwords: Map<string, string>;
  const savedAdminToken = config.adminToken;

  beforeAll(async () => {
    config.adminToken = ADMIN_TOKEN;
    const emailToken = tokenStore();
    passwords = new Map([[ACCOUNT.id, "old-password"]]);
    const user = {
      getByMail: jest.fn(async (_db: unknown, email: string) =>
        email === ACCOUNT.email ? ACCOUNT : null,
      ),
      getById: jest.fn(async (_db: unknown, id: string) =>
        id === ACCOUNT.id ? ACCOUNT : null,
      ),
      updatePassword: jest.fn(
        async (_db: unknown, id: string, password: string) => {
          passwords.set(id, password);
        },
      ),
    };
    const db = {
      transaction: async <T>(run: (tx: unknown) => Promise<T>) => run({}),
    };
    const admin = new AdminService(
      { user, emailToken } as never,
      db as never,
      { dashboard: { url: `${DASHBOARD}/` } } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    auth = new AuthService(
      {
        user,
        emailToken,
        jwt: { deleteByUserId: jest.fn() },
        oauthGrant: { revokeAllForUser: jest.fn() },
      } as never,
      db as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      async () => false,
    );

    const router = new Router();
    router.use(restErrorMiddleware());
    registerPasswordResetLinkRoute(router, admin);
    const app = new Koa();
    app.use(router.routes());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };
    url = `http://127.0.0.1:${address.port}/api/admin/password-reset-link`;
  });

  afterAll(async () => {
    config.adminToken = savedAdminToken;
    await new Promise((resolve) => server.close(resolve));
  });

  const post = (body: unknown, token?: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token === undefined ? {} : { "x-admin-token": token }),
      },
      body: JSON.stringify(body),
    });

  it.each([
    ["missing", undefined],
    ["wrong", "not-the-admin-token"],
  ])("refuses a %s ADMIN_TOKEN", async (_label, token) => {
    const response = await post({ email: ACCOUNT.email }, token);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { ok: boolean; resetUrl?: string };
    expect(body.ok).toBe(false);
    expect(body.resetUrl).toBeUndefined();
  });

  it("answers an unknown user with a not-found admin error", async () => {
    const response = await post({ email: "nobody@example.test" }, ADMIN_TOKEN);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("issues a link that sets a new password once and never reaches a log", async () => {
    logCalls.length = 0;
    const response = await post({ email: ACCOUNT.email }, ADMIN_TOKEN);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as {
      ok: true;
      resetUrl: string;
      expireAt: string;
    };
    const link = new URL(body.resetUrl);
    expect(`${link.origin}${link.pathname}`).toBe(
      `${DASHBOARD}/auth/reset-password/`,
    );
    const token = link.searchParams.get("token")!;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const lifetime = Date.parse(body.expireAt) - Date.now();
    expect(lifetime).toBeGreaterThan(55 * 60_000);
    expect(lifetime).toBeLessThanOrEqual(60 * 60_000);

    await auth.resetPassword(token, "a brand-new correct horse battery");
    expect(passwords.get(ACCOUNT.id)).toBe("a brand-new correct horse battery");
    await expect(
      auth.resetPassword(token, "another fresh staple passphrase"),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(passwords.get(ACCOUNT.id)).toBe("a brand-new correct horse battery");

    expect(JSON.stringify(logCalls)).not.toContain(token);
  });
});
