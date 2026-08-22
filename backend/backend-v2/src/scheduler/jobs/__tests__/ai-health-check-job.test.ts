import {
  createAiHealthCheckJob,
  AI_HEALTH_CHECK_CACHE_KEY,
  type AiHealthCheckResult,
} from "../ai-health-check-job";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

function createMockConfig(): AppConfig {
  return {
    gitea: {
      hostname: "git.beancount.io",
      internalHostname: "gitea",
      httpPort: 3000,
      externalHttpPort: 443,
      sshPort: 2222,
    },
    claudeCodeSandbox: {
      apiUrl: "https://sandbox.example.com",
    },
    favaApi: {
      baseUrl: "http://ledger:8000",
      adminUser: "admin",
      adminPassword: "password",
    },
    adminToken: "test-admin-token",
  } as AppConfig;
}

function createMockLayers(): AppLayers {
  return {
    database: { db: {} as any, models: {} as any },
    clients: {
      cacheHelper: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        getOrSet: jest.fn(),
      },
    },
    services: {},
    workflows: {},
  } as unknown as AppLayers;
}

/** Build a proper SSE stream with event: and data: lines */
function sseStream(
  events: Array<{ event: string; data: Record<string, unknown> }>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const text = events
    .map((e) => `event: ${e.event}\ndata:${JSON.stringify(e.data)}\n\n`)
    .join("");
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function getCachedResult(mockLayers: AppLayers): AiHealthCheckResult {
  // cacheHelper stores the result object directly (Keyv handles serialization).
  return (mockLayers.clients.cacheHelper.set as jest.Mock).mock.calls[0][1];
}

describe("AiHealthCheckJob", () => {
  let mockLayers: AppLayers;
  let mockConfig: AppConfig;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLayers = createMockLayers();
    mockConfig = createMockConfig();
    fetchSpy = jest.spyOn(global, "fetch");
    jest.useFakeTimers({ doNotFake: ["Date"] });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.useRealTimers();
  });

  it("should have correct schedule", () => {
    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    expect(job.schedule).toBe("*/30 * * * *");
  });

  it("should cache healthy when stream has a completed event with logs", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        {
          event: "init",
          data: { type: "init", message: "Starting", progress: 0 },
        },
        {
          event: "executing",
          data: { type: "executing", logs: "partial...", progress: 50 },
        },
        {
          event: "completed",
          data: {
            type: "completed",
            message: "Question answered successfully",
            progress: 100,
            logs: "Accounts: Assets:Bank, Expenses:Food",
            isQuestion: true,
          },
        },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    expect(mockLayers.clients.cacheHelper.set).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = (mockLayers.clients.cacheHelper.set as jest.Mock)
      .mock.calls[0];
    expect(key).toBe(AI_HEALTH_CHECK_CACHE_KEY);
    expect(ttl).toBe(7_200_000);

    const parsed = value as AiHealthCheckResult;
    expect(parsed.status).toBe("healthy");
    expect(parsed.latency_ms).toBeGreaterThanOrEqual(0);
    expect(parsed.lastChecked).toBeDefined();
    expect(parsed.error).toBeUndefined();
  });

  it("should NOT treat intermediate executing event with logs as healthy", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        {
          event: "executing",
          data: {
            type: "executing",
            logs: "reading files...",
            progress: 50,
          },
        },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Stream ended without a completed event");
  });

  it("should cache unhealthy when SSE stream has an error event", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        {
          event: "init",
          data: { type: "init", message: "Starting", progress: 0 },
        },
        {
          event: "error",
          data: {
            type: "error",
            error: "Sandbox crashed",
            message: "Failed",
          },
        },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Sandbox crashed");
  });

  it("should cache unhealthy when data payload has error field without event: line", async () => {
    const encoder = new TextEncoder();
    const text = `data:${JSON.stringify({ error: "Clone failed" })}\n\n`;
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });

    fetchSpy.mockResolvedValue({ ok: true, body });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Clone failed");
  });

  it("should cache unhealthy on HTTP error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("HTTP 503");
  });

  it("should cache unhealthy on fetch rejection", async () => {
    fetchSpy.mockRejectedValue(new Error("Connection refused"));

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Connection refused");
  });

  it("should cache unhealthy on abort/timeout", async () => {
    const abortError = new DOMException(
      "The operation was aborted",
      "AbortError",
    );
    fetchSpy.mockRejectedValue(abortError);

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("timeout");
  });

  it("should cache unhealthy when stream has no completed event", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        { event: "init", data: { type: "init", progress: 0 } },
        { event: "cloning", data: { type: "cloning", progress: 15 } },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Stream ended without a completed event");
  });

  it("should cache unhealthy when completed event has no logs", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        {
          event: "completed",
          data: { type: "completed", progress: 100, isQuestion: true },
        },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    const parsed = getCachedResult(mockLayers);
    expect(parsed.status).toBe("unhealthy");
    expect(parsed.error).toBe("Stream ended without a completed event");
  });

  it("should send correct request to sandbox", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: sseStream([
        {
          event: "completed",
          data: { type: "completed", logs: "ok", progress: 100 },
        },
      ]),
    });

    const job = createAiHealthCheckJob(mockLayers, mockConfig);
    await job.task();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://sandbox.example.com/beancount-stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-admin-token": "test-admin-token",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.mode).toBe("ASK");
    expect(body.conversationId).toBe("health-check-canary");
    expect(body.githubToken).toBe("admin:password");
    expect(body.repo).toContain("open_ledger/example");
    expect(body.task).toBe("What accounts exist in this ledger?");
  });
});
