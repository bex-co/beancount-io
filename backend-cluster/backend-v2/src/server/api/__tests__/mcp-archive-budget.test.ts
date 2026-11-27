/**
 * w31/112: the MCP streaming archive route spent two archive-budget tokens per
 * download for a personal API key. The shared REST limiter charged the matched
 * op, then the handler charged the same op again, so the documented 30
 * downloads a minute stopped at 15, and the shared bucket starved the v1
 * download too. The shared identity middleware also resolved every bearer
 * against the application audience, so an MCP OAuth token had no identity
 * there: its requests on both MCP mounts were charged to the caller's IP
 * instead of to the credential.
 *
 * Driven through the real composition root (`assembleApi`) with only Redis
 * replaced by an in-memory counter, so the middleware stack, the fragments'
 * declared audiences and the limiter's budgets are the ones production runs.
 */
import "reflect-metadata";

const counter = jest.fn();
jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: (...args: unknown[]) => counter(...args),
}));

import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { config as baseConfig, type AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { apiKeyDigest } from "@/features/apikeys/service/api-key-service";
import {
  archiveServiceFor,
  startArchiveOrigin,
  type ArchiveOrigin,
} from "@/features/ledger/service/__tests__/archive-origin";
import { AuthorizationService } from "@/server/api/authorization";
import {
  clearRateLimitShadows,
  MCP_HANDSHAKE_OP_ID,
  MCP_TRANSPORT_OP_ID,
} from "@/server/api/rate-limit";
import { bodyParserMiddleware } from "@/server/middleware/body-parser-middleware";
import { assembleApi } from "../composition-root";

const ISSUER = "https://issuer.test";
const KEY = "bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN";
const STREAM = "/api-gateway/mcp/archive/alice/main/main.zip";
const V1 = "/api-gateway/v1/ledgers/alice/main/archive/main.zip";
const ARCHIVE_BUCKET = "REST archive-download";

const counts = new Map<string, number>();

/** Answers any property access, call, or construction with itself. */
const stub: unknown = new Proxy(function stub() {}, {
  get: (_target, prop) => (prop === "then" ? undefined : stub),
  apply: () => stub,
  construct: () => stub as object,
});

/** `layers` whose named members are real and whose every other member is {@link stub}. */
function partial<T extends object>(members: Record<string, unknown>): T {
  return new Proxy({} as T, {
    get: (_target, prop) =>
      prop === "then"
        ? undefined
        : typeof prop === "string" && prop in members
          ? members[prop]
          : stub,
  });
}

const database = {
  db: {},
  models: partial({
    jwt: { verify: async () => null },
    user: {
      getById: async (_db: unknown, id: string) =>
        id === "usr_qa" ? { id, isBlocked: false } : null,
    },
    apiKey: {
      findByDigest: async (_db: unknown, digest: string) =>
        digest === apiKeyDigest(KEY)
          ? {
              id: "akey_qa",
              userId: "usr_qa",
              name: "QA",
              keyDigest: apiKeyDigest(KEY),
              keyPrefix: KEY.slice(0, 13),
              scopes: ["ledger.read"],
              createdAt: new Date("2026-01-01"),
              updatedAt: new Date("2026-01-01"),
            }
          : null,
      touchLastUsedAt: async () => undefined,
      bindLedgerScopeRepoId: async () => undefined,
    },
  }),
};

let origin: ArchiveOrigin;
let server: http.Server;
let base: string;
let mcpToken: string;

beforeAll(async () => {
  origin = await startArchiveOrigin();
  const pair = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(pair.privateKey);
  jwk.kid = "test-key";
  jwk.alg = "ES256";
  const config = {
    ...baseConfig,
    api: { ...baseConfig.api, scopeEnforcement: "enforce" },
    oauth: { ...baseConfig.oauth, issuer: ISSUER, jwks: { keys: [jwk] } },
  } as AppConfig;
  mcpToken = await new SignJWT({ scope: "ledger.read" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setSubject("usr_qa")
    .setAudience(`${ISSUER}/api-gateway/mcp`)
    .setJti("jti_qa")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(pair.privateKey);

  const layers = partial<AppLayers>({
    database,
    services: partial({
      ledgerArchive: archiveServiceFor(
        origin,
        new AuthorizationService(
          { check: jest.fn().mockResolvedValue(true) },
          jest.fn(),
        ),
      ),
    }),
  });
  const router = new Router();
  await assembleApi(http.createServer(), router, { layers, config });
  const app = new Koa();
  app.silent = true;
  app.use(bodyParserMiddleware());
  app.use(router.routes()).use(router.allowedMethods());
  server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await origin.close();
});

beforeEach(() => {
  clearRateLimitShadows();
  counts.clear();
  counter.mockReset();
  counter.mockImplementation(async (key: string) => {
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return { count, resetInMs: 60_000 };
  });
  origin.reset();
});

const asKey = { authorization: `Bearer ${KEY}` };
const asMcp = () => ({ authorization: `Bearer ${mcpToken}` });

async function fetchStatus(
  path: string,
  headers: Record<string, string>,
  init: { method?: string; body?: string } = {},
): Promise<{ status: number; retryAfter: string | null }> {
  const response = await fetch(`${base}${path}`, { ...init, headers });
  await response.arrayBuffer();
  return {
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
  };
}

const HEAD = { method: "HEAD" };

/** One JSON-RPC request to the MCP transport, as an MCP OAuth client sends it. */
function postMcp(method: string, params?: Record<string, unknown>) {
  return fetchStatus(
    "/api-gateway/mcp",
    {
      ...asMcp(),
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    },
  );
}

describe("the MCP streaming archive route spends one archive token per download (w31/112)", () => {
  it("lets a personal API key stream the documented 30 archives a minute", async () => {
    for (let fetchNo = 1; fetchNo <= 30; fetchNo += 1) {
      const { status } = await fetchStatus(STREAM, asKey);
      expect({ fetchNo, status }).toEqual({ fetchNo, status: 200 });
    }
    const refused = await fetchStatus(STREAM, asKey);
    expect(refused.status).toBe(429);
    expect(refused.retryAfter).toMatch(/^[1-9]\d*$/);
    expect(origin.requests).toHaveLength(30);
    expect(counts.get(`ratelimit:tok:akey_qa:${ARCHIVE_BUCKET}`)).toBe(30);
  });

  it("shares that one budget with the v1 download, one token each", async () => {
    for (let round = 1; round <= 15; round += 1) {
      const stream = await fetchStatus(STREAM, asKey);
      const v1 = await fetchStatus(V1, asKey);
      expect({ round, stream: stream.status, v1: v1.status }).toEqual({
        round,
        stream: 200,
        v1: 200,
      });
    }
    expect((await fetchStatus(V1, asKey)).status).toBe(429);
    expect((await fetchStatus(STREAM, asKey)).status).toBe(429);
    expect(origin.requests).toHaveLength(30);
  });

  it("charges a HEAD of the streaming URL to the archive budget, like the GET it runs", async () => {
    for (let fetchNo = 1; fetchNo <= 15; fetchNo += 1) {
      const head = await fetchStatus(STREAM, asKey, HEAD);
      const get = await fetchStatus(STREAM, asKey);
      expect({ fetchNo, head: head.status, get: get.status }).toEqual({
        fetchNo,
        head: 200,
        get: 200,
      });
    }
    expect((await fetchStatus(STREAM, asKey, HEAD)).status).toBe(429);
    expect((await fetchStatus(STREAM, asKey)).status).toBe(429);
  });

  it("charges an MCP OAuth token's requests on both MCP mounts to the credential, never to the caller's IP", async () => {
    expect((await fetchStatus(STREAM, asMcp())).status).toBe(200);
    expect((await fetchStatus(STREAM, asMcp(), HEAD)).status).toBe(200);
    // Handshake traffic and real work, which spend different transport ops.
    expect((await postMcp("ping")).status).toBe(200);
    expect(
      (await postMcp("prompts/get", { name: "no-such-prompt" })).status,
    ).toBe(200);

    // Every charge names the user and the token, one per request, and no
    // `anon:` key appears: before, each of these spent the caller's IP budget.
    const charged = (bucket: string, times: number) => ({
      [`ratelimit:usr:usr_qa:${bucket}`]: times,
      [`ratelimit:tok:jti_qa:${bucket}`]: times,
    });
    expect(Object.fromEntries(counts)).toEqual({
      ...charged(ARCHIVE_BUCKET, 2),
      ...charged(MCP_HANDSHAKE_OP_ID, 1),
      ...charged(MCP_TRANSPORT_OP_ID, 1),
    });
  });
});
