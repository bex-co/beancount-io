import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import KeyvRedis, { createClient } from "@keyv/redis";
import {
  closeRedisCache,
  createRedisCache,
  getRedisClient,
} from "../redis-utils";
import { incrementInWindow } from "../redis-counter";
import { redisIdempotencyStore } from "../redis-idempotency";
import { consumeSlidingWindows } from "../redis-admission";
import { issueSignInRecoveryProof } from "@/features/auth/operations/sign-in-recovery-proof";
import { ServiceUnavailableError } from "@/shared/errors";
import type { Cache } from "cache-manager";
import { createCacheHelper } from "@/shared/cache";

jest.mock("@/shared/logger", () => ({
  logger: { child: () => ({ error: jest.fn(), warn: jest.fn() }) },
}));

// Exercise the production Keyv connection and bounded wrapper, not an adapter.
// Requires only redis-server; no application stack or durable data is used.
let server: ChildProcess;
let scratch: string;
let port: number;
let native: ReturnType<typeof createClient>;
let control: ReturnType<typeof createClient>;
let cache: Cache;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(condition: () => boolean | Promise<boolean>, ms = 6000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await pause(20);
  }
  throw new Error("Isolated Redis condition timed out");
}

async function startServer() {
  server = spawn(
    "redis-server",
    [
      "--port",
      String(port),
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
      "--dir",
      scratch,
    ],
    { cwd: scratch, stdio: ["ignore", "pipe", "pipe"] },
  );
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Isolated Redis startup timed out")),
      5000,
    );
    let output = "";
    server.once("error", reject);
    server.once("exit", () =>
      reject(new Error("Isolated Redis exited before ready")),
    );
    server.stdout!.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.toLowerCase().includes("ready to accept connections")) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

async function connectControl() {
  control = createClient({
    url: `redis://127.0.0.1:${port}`,
    socket: { reconnectStrategy: false },
  });
  control.on("error", () => undefined);
  await control.connect();
}

async function unusedPort(): Promise<number> {
  const listener = createServer();
  await new Promise<void>((resolve) =>
    listener.listen(0, "127.0.0.1", resolve),
  );
  const available = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return available;
}

beforeAll(async () => {
  port = await unusedPort();
  await mkdir(path.join(process.cwd(), "tmp"), { recursive: true });
  scratch = await mkdtemp(path.join(process.cwd(), "tmp", "redis-bounds-"));
  const getter = Object.getOwnPropertyDescriptor(
    KeyvRedis.prototype,
    "client",
  )!.get!;
  jest.spyOn(KeyvRedis.prototype, "client", "get").mockImplementation(function (
    this: KeyvRedis<unknown>,
  ) {
    native = getter.call(this) as typeof native;
    return native;
  });
  await startServer();
  cache = await createRedisCache(
    `redis://127.0.0.1:${port}`,
    "isolated-bounds",
  );
  await connectControl();
}, 15_000);

beforeEach(async () => {
  await control.flushDb();
});

afterAll(async () => {
  await closeRedisCache();
  if (control?.isOpen) control.destroy();
  if (server?.pid && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  jest.restoreAllMocks();
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

it("increments atomically under concurrency, preserves an existing expiry, and repairs immortal counters", async () => {
  const results = await Promise.all(
    Array.from({ length: 100 }, () => incrementInWindow("window", 2000)),
  );
  expect(results.map((result) => result!.count).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 100 }, (_, i) => i + 1),
  );
  const before = await control.pTTL("window");
  expect(before).toBeGreaterThan(0);
  await pause(50);
  const next = await incrementInWindow("window", 2000);
  expect(next!.count).toBe(101);
  expect(next!.resetInMs).toBeLessThan(before);
  await control.set("immortal", "7");
  expect(await control.pTTL("immortal")).toBe(-1);
  await expect(incrementInWindow("immortal", 200)).resolves.toEqual({
    count: 8,
    resetInMs: 200,
  });
  await until(async () => (await control.exists("immortal")) === 0);
  await expect(incrementInWindow("immortal", 200)).resolves.toEqual({
    count: 1,
    resetInMs: 200,
  });
});

it("lets exactly one concurrent claim win an idempotency key and replays the finished record", async () => {
  const claims = await Promise.all(
    Array.from({ length: 20 }, () =>
      redisIdempotencyStore.claim("idem", "hash-a", 60_000),
    ),
  );
  expect(claims.filter((claim) => claim?.claimed === true)).toHaveLength(1);
  expect(claims.filter((claim) => claim?.claimed === false)).toHaveLength(19);
  expect(claims.find((claim) => claim?.claimed === false)).toEqual({
    claimed: false,
    record: { requestHash: "hash-a", status: "in-progress" },
  });
  const ttl = await control.pTTL("idem");
  expect(ttl).toBeGreaterThan(0);
  expect(ttl).toBeLessThanOrEqual(60_000);

  await redisIdempotencyStore.complete("idem", "hash-a", { ok: 1 }, 60_000);
  await expect(
    redisIdempotencyStore.claim("idem", "hash-a", 60_000),
  ).resolves.toEqual({
    claimed: false,
    record: { requestHash: "hash-a", status: "done", result: { ok: 1 } },
  });

  await redisIdempotencyStore.release("idem");
  await expect(
    redisIdempotencyStore.claim("idem", "hash-b", 60_000),
  ).resolves.toEqual({ claimed: true });
});

it("times out written commands while retaining a bounded backlog until their replies arrive", async () => {
  const redis = getRedisClient()!;
  const evaluate = jest.spyOn(native, "eval");
  await control.sendCommand(["CLIENT", "PAUSE", "5000", "ALL"]);
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 128 }, () =>
        redis.eval("return false", { keys: ["paused"], arguments: [] }),
      ),
    );
    expect(
      results.every(
        (result) =>
          result.status === "rejected" &&
          result.reason.message === "Redis command timed out",
      ),
    ).toBe(true);
    for (let attempt = 0; attempt < 100; attempt++)
      await expect(
        redis.eval("return false", { keys: ["saturated"], arguments: [] }),
      ).rejects.toThrow("capacity");
    expect(evaluate).toHaveBeenCalledTimes(128);
  } finally {
    await control.sendCommand(["CLIENT", "UNPAUSE"]);
    evaluate.mockRestore();
  }
  await until(async () => {
    try {
      return (
        (await redis.eval("return false", {
          keys: ["recovered"],
          arguments: [],
        })) === null
      );
    } catch {
      return false;
    }
  });
}, 15_000);

it("releases stalled commands through the native socket timeout and reconnects", async () => {
  const redis = getRedisClient()!;
  const reconnecting = new Promise<void>((resolve) =>
    native.once("reconnecting", resolve),
  );
  await control.sendCommand(["CLIENT", "PAUSE", "10000", "ALL"]);
  try {
    await expect(
      redis.eval("return false", { keys: ["socket-timeout"], arguments: [] }),
    ).rejects.toThrow("timed out");
    await reconnecting;
    expect(native.isReady).toBe(false);
  } finally {
    await control.sendCommand(["CLIENT", "UNPAUSE"]);
  }
  await until(() => native.isReady);
  await expect(
    redis.eval("return false", { keys: ["socket-recovered"], arguments: [] }),
  ).resolves.toBeNull();
}, 15_000);

it("fails offline calls without buffering, keeps proof admission closed, and recovers after Redis restarts", async () => {
  const redis = getRedisClient()!;
  const exited = once(server, "exit");
  server.kill("SIGKILL");
  await exited;
  await until(() => !native.isReady);
  await expect(cache.set("offline-write", "synthetic", 1000)).rejects.toThrow();
  const helper = createCacheHelper(cache);
  await expect(
    helper.setStrict("offline-strict", "synthetic", 1000),
  ).rejects.toThrow();
  await expect(
    helper.set("offline-cache", "synthetic", 1000),
  ).resolves.toBeUndefined();
  await expect(
    helper.getOrSet("offline-read", 1000, async () => "source"),
  ).resolves.toBe("source");
  const evaluate = jest.spyOn(native, "eval");
  for (let attempt = 0; attempt < 100; attempt++)
    await expect(
      redis.eval("return false", { keys: ["offline"], arguments: [] }),
    ).rejects.toThrow("unavailable");
  expect(evaluate).not.toHaveBeenCalled();
  evaluate.mockRestore();
  await expect(incrementInWindow("offline", 1000)).resolves.toBeUndefined();
  await expect(
    consumeSlidingWindows([{ key: "offline-proof", max: 1, windowMs: 1000 }]),
  ).resolves.toBeUndefined();
  await expect(
    issueSignInRecoveryProof(
      "synthetic@example.com",
      "user_synthetic",
      "aem_synthetic",
      "synthetic-secret",
    ),
  ).rejects.toBeInstanceOf(ServiceUnavailableError);
  if (control.isOpen) control.destroy();
  await startServer();
  await until(() => native.isReady);
  await connectControl();
  await expect(incrementInWindow("restarted", 1000)).resolves.toEqual({
    count: 1,
    resetInMs: 1000,
  });
}, 15_000);

it("bounds connection initialization retries and leaves no half-initialized client", async () => {
  const unavailable = await unusedPort();
  await closeRedisCache();
  try {
    await expect(
      createRedisCache(`redis://127.0.0.1:${unavailable}`),
    ).rejects.toThrow("Redis connection validation failed");
    expect(getRedisClient()).toBeNull();
  } finally {
    cache = await createRedisCache(
      `redis://127.0.0.1:${port}`,
      "isolated-bounds",
    );
  }
  await expect(
    getRedisClient()!.eval("return false", {
      keys: ["clean-initialization"],
      arguments: [],
    }),
  ).resolves.toBeNull();
}, 10_000);
