import { EventEmitter } from "node:events";
import {
  InternalServerError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import {
  RustledgerWorkerPool,
  type WorkerLike,
} from "../rustledger-worker-pool";
import type {
  RustledgerWorkerResponse,
  RustledgerWorkerTask,
} from "../rustledger-worker-protocol";

class FakeWorker extends EventEmitter implements WorkerLike {
  public readonly posted: RustledgerWorkerTask[] = [];
  public readonly terminate = jest.fn(async () => 0);
  public readonly unref = jest.fn();

  public postMessage(value: unknown): void {
    this.posted.push(value as RustledgerWorkerTask);
  }

  public respond(response: RustledgerWorkerResponse): void {
    this.emit("message", response);
  }
}

function makePool(
  options: {
    workerCount?: number;
    maxQueueDepth?: number;
    taskTimeoutMs?: number;
  } = {},
) {
  const workers: FakeWorker[] = [];
  const pool = new RustledgerWorkerPool({
    workerCount: options.workerCount ?? 1,
    maxQueueDepth: options.maxQueueDepth ?? 1,
    taskTimeoutMs: options.taskTimeoutMs ?? 1000,
    workerFactory: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { pool, workers };
}

describe("RustledgerWorkerPool", () => {
  it("executes parsing in a worker and returns its materialized snapshot", async () => {
    const { pool, workers } = makePool();
    const promise = pool.parse({ "main.bean": "" }, "main.bean");
    const task = workers[0].posted[0];

    workers[0].respond({
      id: task.id,
      ok: true,
      value: {
        valid: true,
        errors: [],
        options: {} as never,
        directives: [],
        directiveCount: 0,
      },
    });

    await expect(promise).resolves.toEqual(
      expect.objectContaining({ valid: true, directiveCount: 0 }),
    );
    await pool.close();
  });

  it("executes directive filtering in a worker", async () => {
    const { pool, workers } = makePool();
    const directives = [
      {
        type: "open" as const,
        date: "2024-01-01",
        account: "Assets:Cash",
        currencies: ["USD"],
      },
    ];
    const promise = pool.filter(directives, { account: "Assets" });
    const task = workers[0].posted[0];
    expect(task).toEqual(
      expect.objectContaining({ kind: "filter", directives }),
    );

    workers[0].respond({ id: task.id, ok: true, value: [0] });
    await expect(promise).resolves.toEqual([0]);
    await pool.close();
  });

  it("resolves source slices in a bounded worker task", async () => {
    const { pool, workers } = makePool();
    const files = { "main.bean": "2024-01-01 open Assets:Cash\n" };
    const promise = pool.findEntrySlice(files, "main.bean", "entry-hash");
    const task = workers[0].posted[0];
    expect(task).toEqual(
      expect.objectContaining({
        kind: "find-entry-slice",
        files,
        entryPoint: "main.bean",
        entryHash: "entry-hash",
      }),
    );

    const slice = {
      file: "main.bean",
      startLine: 0,
      endLine: 1,
      sha256: "slice-sha",
      slice: files["main.bean"],
      localOccurrence: 0,
    };
    workers[0].respond({ id: task.id, ok: true, value: slice });
    await expect(promise).resolves.toEqual(slice);
    await pool.close();
  });

  it("counts directives in a bounded worker task", async () => {
    const { pool, workers } = makePool();
    const files = {
      "main.bean": 'include "2024.bean"\n',
      "2024.bean": "2024-01-01 open Assets:Cash\n",
    };
    const promise = pool.countDirectives(files, "main.bean");
    const task = workers[0].posted[0];
    expect(task).toEqual(
      expect.objectContaining({
        kind: "directive-count",
        files,
        entryPoint: "main.bean",
      }),
    );

    workers[0].respond({ id: task.id, ok: true, value: 1 });
    await expect(promise).resolves.toBe(1);
    await pool.close();
  });

  it("warms the worker with a real parse task before startup readiness", async () => {
    const { pool, workers } = makePool();
    const promise = pool.warmup();
    const task = workers[0].posted[0];
    expect(task).toEqual(expect.objectContaining({ kind: "parse" }));

    workers[0].respond({
      id: task.id,
      ok: true,
      value: {
        valid: true,
        errors: [],
        options: {} as never,
        directives: [],
        directiveCount: 1,
      },
    });
    await expect(promise).resolves.toBeUndefined();
    await pool.close();
  });

  it("applies backpressure when workers and the bounded queue are full", async () => {
    const { pool, workers } = makePool({ maxQueueDepth: 1 });
    const first = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");
    const second = pool.query({ "main.bean": "" }, "main.bean", "SELECT 2");

    await expect(
      pool.query({ "main.bean": "" }, "main.bean", "SELECT 3"),
    ).rejects.toBeInstanceOf(RateLimitedError);

    const firstTask = workers[0].posted[0];
    workers[0].respond({
      id: firstTask.id,
      ok: true,
      value: { columns: [], rows: [], errors: [] },
    });
    await expect(first).resolves.toEqual({ columns: [], rows: [], errors: [] });

    const secondTask = workers[0].posted[1];
    workers[0].respond({
      id: secondTask.id,
      ok: true,
      value: { columns: [], rows: [], errors: [] },
    });
    await expect(second).resolves.toEqual({
      columns: [],
      rows: [],
      errors: [],
    });
    await pool.close();
  });

  // A WASM trap can leave the worker's engine instance poisoned, so the worker
  // answers its caller and then exits (see `engine-health.ts`). The pool must
  // route the NEXT task to a replacement thread rather than the retired one,
  // which is what kept a single bad query failing every later request.
  // The retirement must take effect while the response is being handled, NOT
  // when the thread's `exit` finally lands: between those two moments the slot
  // looks idle and healthy, and `pump()` would hand the poisoned instance to
  // the next caller — an unrelated ledger's parse, in the incident this fixes.
  // So no `exit` is emitted here: the flag alone has to replace the worker.
  it("retires a poisoned worker while handling its response", async () => {
    const { pool, workers } = makePool();
    const first = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");

    workers[0].respond({
      id: workers[0].posted[0].id,
      ok: false,
      error: { name: "RuntimeError", message: "memory access out of bounds" },
      poisoned: true,
    });
    await expect(first).rejects.toBeInstanceOf(InternalServerError);
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);

    const second = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");
    expect(workers).toHaveLength(2);
    expect(workers[1].posted).toHaveLength(1);

    workers[1].respond({
      id: workers[1].posted[0].id,
      ok: true,
      value: { columns: [], rows: [], errors: [] },
    });
    await expect(second).resolves.toEqual({
      columns: [],
      rows: [],
      errors: [],
    });
    await pool.close();
  });

  it("keeps a worker whose task failed without poisoning it", async () => {
    const { pool, workers } = makePool();
    const first = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");

    workers[0].respond({
      id: workers[0].posted[0].id,
      ok: false,
      error: { name: "Error", message: "ordinary query error" },
    });
    await expect(first).rejects.toBeInstanceOf(InternalServerError);

    // An invalid query must not cost a thread — only a failed probe does.
    const second = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");
    expect(workers).toHaveLength(1);
    expect(workers[0].posted).toHaveLength(2);
    expect(workers[0].terminate).not.toHaveBeenCalled();

    workers[0].respond({
      id: workers[0].posted[1].id,
      ok: true,
      value: { columns: [], rows: [], errors: [] },
    });
    await expect(second).resolves.toBeDefined();
    await pool.close();
  });

  it("rejects the in-flight task when a worker exits before replying", async () => {
    const { pool, workers } = makePool();
    const inFlight = pool.query({ "main.bean": "" }, "main.bean", "SELECT 1");

    workers[0].emit("exit", 1);

    await expect(inFlight).rejects.toBeInstanceOf(InternalServerError);
    await pool.close();
  });

  it("terminates timed-out synchronous work and frees capacity", async () => {
    jest.useFakeTimers();
    const { pool, workers } = makePool({ taskTimeoutMs: 10 });
    const query = pool.query(
      { "main.bean": "" },
      "main.bean",
      "SELECT account",
    );

    jest.advanceTimersByTime(10);

    await expect(query).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    await pool.close();
    jest.useRealTimers();
  });
});
