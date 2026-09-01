import { availableParallelism } from "node:os";
import { extname, join } from "node:path";
import { Worker } from "node:worker_threads";
import type { DirectiveJson, FileMap, QueryResult } from "@rustledger/wasm";
import {
  InternalServerError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import type { LedgerSnapshot, ParseLedgerOptions } from "./engine";
import type { FilterOptions } from "./directive-filter";
import type { EntrySlice } from "./source-slice";
import type {
  RustledgerWorkerResponse,
  RustledgerWorkerTask,
  RustledgerWorkerValue,
} from "./rustledger-worker-protocol";

const DEFAULT_WORKER_COUNT = Math.max(
  1,
  Math.min(2, availableParallelism() - 1),
);
const DEFAULT_MAX_QUEUE_DEPTH = 32;
// Sized for the LARGEST ledger the loader admits (32 MB / 4096 files), not the
// typical one: a single 'parse' task can run several sequential full WASM
// passes (raw parse, source-details probe, plugin revalidation), and a timeout
// that a valid ledger can legitimately exceed turns it permanently unusable —
// every coalesced request re-times-out at this bound, 503s all callers, and
// kills the in-flight worker in a respawn loop.
const DEFAULT_TASK_TIMEOUT_MS = 120_000;

export interface WorkerLike {
  on(event: "message", listener: (value: unknown) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number) => void): this;
  postMessage(value: unknown): void;
  terminate(): Promise<number>;
  unref(): void;
}

type WorkerFactory = () => WorkerLike;

interface PendingTask<T extends RustledgerWorkerValue> {
  task: RustledgerWorkerTask;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

interface WorkerSlot {
  worker: WorkerLike;
  current?: PendingTask<RustledgerWorkerValue>;
  removed: boolean;
}

export interface RustledgerWorkerPoolOptions {
  workerCount?: number;
  maxQueueDepth?: number;
  taskTimeoutMs?: number;
  workerFactory?: WorkerFactory;
}

function createNodeWorker(): WorkerLike {
  const sourceExtension = extname(__filename);
  const workerPath = join(__dirname, `rustledger-worker${sourceExtension}`);
  const worker = new Worker(workerPath, {
    // Compiled production workers load `.js` directly. Development runs the
    // `.ts` entry through the same transpile-only/path-alias hooks as the
    // ts-node server process.
    ...(sourceExtension === ".ts"
      ? {
          execArgv: [
            "-r",
            "ts-node/register/transpile-only",
            "-r",
            "tsconfig-paths/register",
          ],
        }
      : {}),
  });
  worker.unref();
  return worker;
}

/**
 * Bounded worker-thread pool for all request-path RustLedger parsing and BQL.
 * Synchronous WASM never runs on the API event loop; a finite queue provides
 * backpressure, and timed-out work is interrupted by terminating its worker.
 */
export class RustledgerWorkerPool {
  private readonly workerCount: number;
  private readonly maxQueueDepth: number;
  private readonly taskTimeoutMs: number;
  private readonly workerFactory: WorkerFactory;
  private readonly workers: WorkerSlot[] = [];
  private readonly queue: Array<PendingTask<RustledgerWorkerValue>> = [];
  private nextTaskId = 1;
  private closed = false;

  constructor(options: RustledgerWorkerPoolOptions = {}) {
    this.workerCount = Math.max(1, options.workerCount ?? DEFAULT_WORKER_COUNT);
    this.maxQueueDepth = Math.max(
      0,
      options.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH,
    );
    this.taskTimeoutMs = Math.max(
      1,
      options.taskTimeoutMs ?? DEFAULT_TASK_TIMEOUT_MS,
    );
    this.workerFactory = options.workerFactory ?? createNodeWorker;
  }

  public parse(
    files: FileMap,
    entryPoint: string,
    options: ParseLedgerOptions = {},
  ): Promise<LedgerSnapshot> {
    return this.enqueue<LedgerSnapshot>({
      id: this.nextTaskId,
      kind: "parse",
      files,
      entryPoint,
      options,
    });
  }

  /** Start a worker and prove that its JS bundle plus WASM asset can parse. */
  public async warmup(): Promise<void> {
    const snapshot = await this.parse(
      {
        "__rustledger_health__.bean":
          "2000-01-01 open Assets:Rustledger-Health USD\n",
      },
      "__rustledger_health__.bean",
      { applyTsPlugins: false },
    );
    if (!snapshot.valid || snapshot.directiveCount !== 1) {
      throw new InternalServerError(
        "RustLedger worker warmup returned an invalid snapshot",
      );
    }
  }

  public query(
    files: FileMap,
    entryPoint: string,
    query: string,
  ): Promise<QueryResult> {
    return this.enqueue<QueryResult>({
      id: this.nextTaskId,
      kind: "query",
      files,
      entryPoint,
      query,
    });
  }

  public filter(
    directives: DirectiveJson[],
    options: FilterOptions,
  ): Promise<number[]> {
    return this.enqueue<number[]>({
      id: this.nextTaskId,
      kind: "filter",
      directives,
      options,
    });
  }

  public findEntrySlice(
    files: FileMap,
    entryPoint: string,
    entryHash: string,
  ): Promise<EntrySlice | null> {
    return this.enqueue<EntrySlice | null>({
      id: this.nextTaskId,
      kind: "find-entry-slice",
      files,
      entryPoint,
      entryHash,
    });
  }

  private enqueue<T extends RustledgerWorkerValue>(
    task: RustledgerWorkerTask,
  ): Promise<T> {
    if (this.closed) {
      return Promise.reject(
        new ServiceUnavailableError("RustLedger worker pool"),
      );
    }

    const hasImmediateCapacity =
      this.workers.some((slot) => !slot.current && !slot.removed) ||
      this.workers.length < this.workerCount;
    if (!hasImmediateCapacity && this.queue.length >= this.maxQueueDepth) {
      return Promise.reject(
        new RateLimitedError(
          1,
          "Ledger processing capacity is full. Please retry shortly.",
        ),
      );
    }

    this.nextTaskId += 1;
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task,
        resolve: resolve as (value: RustledgerWorkerValue) => void,
        reject,
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.queue.length > 0) {
      let slot = this.workers.find(
        (candidate) => !candidate.current && !candidate.removed,
      );
      if (!slot) {
        if (this.workers.length >= this.workerCount) return;
        try {
          slot = this.createSlot();
        } catch (error) {
          const pending = this.queue.shift();
          pending?.reject(
            new InternalServerError(
              "Failed to start RustLedger worker",
              error instanceof Error ? error : new Error(String(error)),
            ),
          );
          continue;
        }
      }

      const pending = this.queue.shift();
      if (!pending) return;
      slot.current = pending;
      pending.timeout = setTimeout(() => {
        this.failSlot(
          slot as WorkerSlot,
          new ServiceUnavailableError("RustLedger worker", 1),
          true,
        );
      }, this.taskTimeoutMs);
      slot.worker.postMessage(pending.task);
    }
  }

  private createSlot(): WorkerSlot {
    const worker = this.workerFactory();
    const slot: WorkerSlot = { worker, removed: false };
    this.workers.push(slot);
    worker.on("message", (value) => {
      this.handleResponse(slot, value as RustledgerWorkerResponse);
    });
    worker.on("error", (error) => {
      this.failSlot(slot, error, true);
    });
    worker.on("exit", (code) => {
      if (!slot.removed && !this.closed) {
        this.failSlot(
          slot,
          new Error(`RustLedger worker exited with code ${code}`),
          false,
        );
      }
    });
    return slot;
  }

  private handleResponse(
    slot: WorkerSlot,
    response: RustledgerWorkerResponse,
  ): void {
    const pending = slot.current;
    if (!pending || pending.task.id !== response.id) {
      this.failSlot(
        slot,
        new Error("RustLedger worker returned an unexpected task response"),
        true,
      );
      return;
    }

    if (pending.timeout) clearTimeout(pending.timeout);
    slot.current = undefined;
    if (response.ok) {
      pending.resolve(response.value);
    } else {
      pending.reject(
        new InternalServerError(
          "RustLedger worker failed",
          new Error(`${response.error.name}: ${response.error.message}`),
        ),
      );
    }
    this.pump();
  }

  private failSlot(slot: WorkerSlot, error: Error, terminate: boolean): void {
    if (slot.removed) return;
    slot.removed = true;
    const index = this.workers.indexOf(slot);
    if (index >= 0) this.workers.splice(index, 1);

    const pending = slot.current;
    slot.current = undefined;
    if (pending?.timeout) clearTimeout(pending.timeout);
    pending?.reject(
      error instanceof ServiceUnavailableError
        ? error
        : new InternalServerError("RustLedger worker failed", error),
    );
    if (terminate) void slot.worker.terminate();
    this.pump();
  }

  public async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const unavailable = new ServiceUnavailableError("RustLedger worker pool");
    this.queue.splice(0).forEach((pending) => pending.reject(unavailable));
    this.workers.forEach((slot) => {
      if (slot.current?.timeout) clearTimeout(slot.current.timeout);
      slot.current?.reject(unavailable);
      slot.current = undefined;
      slot.removed = true;
    });
    await Promise.all(
      this.workers.splice(0).map((slot) => slot.worker.terminate()),
    );
  }
}

let sharedPool: RustledgerWorkerPool | undefined;

export function getRustledgerWorkerPool(): RustledgerWorkerPool {
  sharedPool ??= new RustledgerWorkerPool();
  return sharedPool;
}

export async function closeRustledgerWorkerPool(): Promise<void> {
  const pool = sharedPool;
  sharedPool = undefined;
  await pool?.close();
}
