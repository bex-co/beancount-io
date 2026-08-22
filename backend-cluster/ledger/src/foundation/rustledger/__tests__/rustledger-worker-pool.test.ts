import { EventEmitter } from "node:events";
import { RateLimitedError, ServiceUnavailableError } from "@/shared/errors";
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
