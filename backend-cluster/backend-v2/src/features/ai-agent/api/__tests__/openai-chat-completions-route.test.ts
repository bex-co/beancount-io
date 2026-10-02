import "reflect-metadata";
import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import type { AppLayers } from "@/foundation/composition";
import { LLMService } from "@/features/llm/service/llm-service";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { RateLimitedError } from "@/shared/errors";
import { setOpenAIChatCompletionsRoute } from "../openai-chat-completions-route";

const localFetch = global.fetch.bind(globalThis);
const writer: Identity = {
  userId: "usr_cap_test",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
};
const requestBody = {
  model: "gpt-4o",
  messages: [{ role: "user", content: "Explain double-entry bookkeeping." }],
  temperature: 0.4,
  tools: [
    {
      type: "function",
      function: {
        name: "list_accounts",
        description: "List available accounts",
        parameters: { type: "object", properties: {} },
      },
    },
  ],
};
const completion = {
  id: "chatcmpl_synthetic",
  object: "chat.completion",
  model: "gpt-4o",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Every entry balances." },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 30, completion_tokens: 7, total_tokens: 37 },
};

function dependencies() {
  const getById = jest.fn().mockResolvedValue({ id: writer.userId });
  const quota = jest.fn().mockResolvedValue(undefined);
  const charge = jest.fn().mockResolvedValue(undefined);
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ),
    jest.fn(),
  );
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const llm = new LLMService(
    {} as never,
    {} as never,
    { assertQuotaAvailable: quota, addTokenUsage: charge } as never,
    { blockeden: { accessKey: "synthetic-cap-test" } } as never,
    authorization,
  );
  const upstream = jest.spyOn(global, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(completion), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  return { getById, quota, charge, authorize, llm, upstream };
}

describe("OpenAI chat completions through HTTP and the real LLM service", () => {
  let deps: ReturnType<typeof dependencies>;
  let caller: Identity | undefined;
  let server: http.Server;
  let url: string;

  beforeEach(async () => {
    deps = dependencies();
    caller = writer;
    const app = new Koa();
    const router = new Router();
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(async (ctx, next) => {
      ctx.state.identity = caller;
      await next();
    });
    setOpenAIChatCompletionsRoute(router, {
      database: { models: { user: { getById: deps.getById } }, db: {} },
      services: { llm: deps.llm },
    } as unknown as AppLayers);
    app.use(router.routes()).use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as { port: number };
    url = `http://127.0.0.1:${port}/api-gateway/ai/openai/chat/completions`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    jest.restoreAllMocks();
  });

  const post = (caps: Record<string, unknown>) =>
    localFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, ...caps }),
    });

  it.each([
    [
      "modern cap",
      { max_completion_tokens: 2048 },
      { max_completion_tokens: 2048 },
    ],
    ["legacy cap", { max_tokens: 4096 }, { max_tokens: 4096 }],
    ["omitted cap", {}, { max_completion_tokens: 1500 }],
  ] as const)(
    "forwards the %s and records actual usage",
    async (_label, caps, expectedCap) => {
      const response = await post(caps);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(completion);
      expect(deps.upstream).toHaveBeenCalledTimes(1);
      const [destination, init] = deps.upstream.mock.calls[0];
      expect(destination).toBe(
        "https://api.blockeden.xyz/openai/synthetic-cap-test/v1/chat/completions",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        ...requestBody,
        ...expectedCap,
        stream: false,
      });
      expect(deps.authorize).toHaveBeenCalledWith({
        principal: writer,
        action: AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE,
        resource: `user:${writer.userId}`,
      });
      expect(deps.quota).toHaveBeenCalledWith(writer.userId);
      expect(deps.charge).toHaveBeenCalledWith(writer.userId, 37);
      expect(deps.authorize.mock.invocationCallOrder[0]).toBeLessThan(
        deps.quota.mock.invocationCallOrder[0],
      );
      expect(deps.quota.mock.invocationCallOrder[0]).toBeLessThan(
        deps.upstream.mock.invocationCallOrder[0],
      );
      expect(deps.upstream.mock.invocationCallOrder[0]).toBeLessThan(
        deps.charge.mock.invocationCallOrder[0],
      );
    },
  );

  describe.each(["max_completion_tokens", "max_tokens"])(
    "invalid %s",
    (field) => {
      it.each([0, -1, 1.5, "500", null])(
        "rejects %j before quota or upstream work",
        async (value) => {
          const response = await post({ [field]: value });

          expect(response.status).toBe(400);
          expect(await response.json()).toMatchObject({
            ok: false,
            error: { code: "BAD_USER_INPUT" },
          });
          expect(deps.quota).not.toHaveBeenCalled();
          expect(deps.upstream).not.toHaveBeenCalled();
          expect(deps.charge).not.toHaveBeenCalled();
        },
      );
    },
  );

  it("rejects both cap spellings even when their values agree", async () => {
    const response = await post({
      max_tokens: 500,
      max_completion_tokens: 500,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "BAD_USER_INPUT" },
    });
    expect(deps.quota).not.toHaveBeenCalled();
    expect(deps.upstream).not.toHaveBeenCalled();
    expect(deps.charge).not.toHaveBeenCalled();
  });

  it("requires authentication before user lookup, quota, or model work", async () => {
    caller = undefined;
    const response = await post({ max_completion_tokens: 50 });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
    expect(deps.getById).not.toHaveBeenCalled();
    expect(deps.quota).not.toHaveBeenCalled();
    expect(deps.upstream).not.toHaveBeenCalled();
    expect(deps.charge).not.toHaveBeenCalled();
  });

  it("keeps the real authorization write-capability ceiling", async () => {
    caller = { ...writer, scopes: new Set(["ledger.read"]) };
    const response = await post({ max_completion_tokens: 50 });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(deps.authorize).toHaveBeenCalledTimes(1);
    expect(deps.quota).not.toHaveBeenCalled();
    expect(deps.upstream).not.toHaveBeenCalled();
    expect(deps.charge).not.toHaveBeenCalled();
  });

  it("preserves per-user quota refusal before any model call or charge", async () => {
    deps.quota.mockRejectedValueOnce(
      new RateLimitedError(undefined, "Synthetic quota exhausted", {
        maxAllowed: 100,
        currentCount: 100,
      }),
    );
    const response = await post({ max_completion_tokens: 50 });

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        metadata: { maxAllowed: 100, currentCount: 100 },
      },
    });
    expect(deps.quota).toHaveBeenCalledWith(writer.userId);
    expect(deps.upstream).not.toHaveBeenCalled();
    expect(deps.charge).not.toHaveBeenCalled();
  });

  describe("provider failures", () => {
    const now = Date.parse("2026-10-02T12:00:00.250Z");
    const reset = "2026-10-02T05:02:00-07:00";
    const normalizedReset = "2026-10-02T12:02:00.000Z";
    const providerMessage =
      "AcmeProvider quota exhausted; visit https://provider.example/upgrade?key=synthetic-provider-secret";
    const quota = {
      code: "QUOTA_EXCEEDED",
      message: providerMessage,
      blockedUntil: reset,
      retryAfter: 7,
      token: "synthetic-provider-secret",
    };

    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValue(now);
    });

    async function providerFailure(
      status: number,
      body: string,
      headers: Record<string, string> = {},
    ) {
      deps.upstream.mockResolvedValueOnce(
        new Response(body, { status, headers }),
      );
      const response = await post({ max_completion_tokens: 50 });
      const payload = await response.json();

      expect(deps.quota).toHaveBeenCalledWith(writer.userId);
      expect(deps.upstream).toHaveBeenCalledTimes(1);
      expect(deps.charge).not.toHaveBeenCalled();
      return { response, payload };
    }

    function expectSafeMessage(message: unknown) {
      expect(message).toEqual(expect.any(String));
      expect(message).not.toMatch(
        /AcmeProvider|provider\.example|synthetic-provider-secret|QUOTA_EXCEEDED|https?:\/\//i,
      );
    }

    it.each([
      ["direct", 402, quota],
      ["nested error", 429, { error: quota }],
      ["nested message", 402, { message: { error: quota } }],
      [
        "JSON-string message",
        429,
        { error: { message: JSON.stringify({ error: quota }) } },
      ],
      ["JSON-string error", 402, { error: JSON.stringify(quota) }],
      ["JSON-string body", 429, JSON.stringify(quota)],
    ] as const)(
      "translates %s quota envelopes into shared service capacity errors",
      async (_label, status, envelope) => {
        const { response, payload } = await providerFailure(
          status,
          JSON.stringify(envelope),
          { "Retry-After": "60" },
        );

        expect(response.status).toBe(429);
        expect(payload).toEqual({
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: expect.any(String),
            metadata: {
              quotaScope: "shared_service",
              blockedUntil: normalizedReset,
              retryAfter: 7,
            },
          },
        });
        expectSafeMessage(payload.error.message);
        expect(payload.error.message).toMatch(/\b(shared|hosted)\b/i);
        expect(payload.error.message).toMatch(/\bAI\b/i);
        expect(payload.error.message).toMatch(/capacity/i);
        expect(payload.error.message).toContain(normalizedReset);
        expect(payload.error.message).not.toMatch(
          /your (account|quota)|monthly|allowance/i,
        );
      },
    );

    it.each([
      ["integer header", { "Retry-After": "45" }, 45],
      ["future reset", {}, 120],
      ["reset despite a fractional header", { "Retry-After": "1.5" }, 120],
    ] as const)(
      "uses the %s when body retry seconds are invalid",
      async (_label, headers, expectedRetry) => {
        const { response, payload } = await providerFailure(
          429,
          JSON.stringify({ ...quota, retryAfter: "7" }),
          headers,
        );

        expect(response.status).toBe(429);
        expect(payload.error.code).toBe("RATE_LIMITED");
        expect(payload.error.metadata).toEqual({
          quotaScope: "shared_service",
          blockedUntil: normalizedReset,
          retryAfter: expectedRetry,
        });
        expectSafeMessage(payload.error.message);
      },
    );

    it.each([
      ["invalid date and negative retry", "not-a-date", -1],
      ["non-ISO date and string retry", "October 3, 2026", "30"],
      ["impossible date and zero retry", "2026-02-30T00:00:00Z", 0],
      ["invalid hour and fractional retry", "2026-10-03T25:00:00Z", 1.5],
      ["date only and unsafe integer", "2026-10-03", 9007199254740992],
      ["past reset and NaN text", "2026-10-01T12:00:00Z", "NaN"],
    ] as const)(
      "omits untrusted metadata: %s",
      async (_label, blockedUntil, retryAfter) => {
        const { response, payload } = await providerFailure(
          402,
          JSON.stringify({ ...quota, blockedUntil, retryAfter }),
          { "Retry-After": "-5" },
        );

        expect(response.status).toBe(429);
        expect(payload.error.code).toBe("RATE_LIMITED");
        expect(payload.error.metadata).toEqual({
          quotaScope: "shared_service",
        });
        expectSafeMessage(payload.error.message);
        expect(payload.error.message).not.toContain(blockedUntil);
      },
    );

    it("omits non-finite retry numbers decoded from valid JSON", async () => {
      const { response, payload } = await providerFailure(
        402,
        '{"code":"QUOTA_EXCEEDED","retryAfter":1e999}',
      );

      expect(response.status).toBe(429);
      expect(payload.error.code).toBe("RATE_LIMITED");
      expect(payload.error.metadata).toEqual({ quotaScope: "shared_service" });
      expectSafeMessage(payload.error.message);
    });

    it("retains valid retry seconds when the reset is invalid", async () => {
      const { response, payload } = await providerFailure(
        402,
        JSON.stringify({ ...quota, blockedUntil: "not-a-date" }),
      );

      expect(response.status).toBe(429);
      expect(payload.error.code).toBe("RATE_LIMITED");
      expect(payload.error.metadata).toEqual({
        quotaScope: "shared_service",
        retryAfter: 7,
      });
      expectSafeMessage(payload.error.message);
      expect(payload.error.message).not.toContain("not-a-date");
    });

    let deepEnvelope: unknown = quota;
    for (let depth = 0; depth < 10; depth += 1) {
      deepEnvelope = { error: deepEnvelope };
    }

    it.each([
      ["plain provider text", 503, providerMessage],
      ["malformed JSON", 402, `{"error":${providerMessage}`],
      ["unrecognized code", 429, JSON.stringify({ ...quota, code: "OTHER" })],
      [
        "non-exact quota code",
        402,
        JSON.stringify({ ...quota, code: "quota_exceeded" }),
      ],
      ["array envelope", 429, JSON.stringify([quota])],
      ["unsupported envelope key", 402, JSON.stringify({ details: quota })],
      ["excessive nesting", 402, JSON.stringify(deepEnvelope)],
      [
        "oversized envelope",
        429,
        JSON.stringify({ ...quota, padding: "x".repeat(16384) }),
      ],
      [
        "oversized non-ASCII envelope",
        429,
        JSON.stringify({ ...quota, padding: "账".repeat(6000) }),
      ],
      ["quota code with a server status", 500, JSON.stringify(quota)],
    ] as const)(
      "returns a safe fallback for %s without changing the HTTP status",
      async (_label, status, body) => {
        const { response, payload } = await providerFailure(status, body);

        expect(response.status).toBe(status);
        expect(payload).toEqual({
          ok: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: expect.any(String),
          },
        });
        expectSafeMessage(payload.error.message);
        expect(payload.error.message).not.toContain("{");
        expect(payload.error.message).not.toContain("[");
      },
    );
  });
});
