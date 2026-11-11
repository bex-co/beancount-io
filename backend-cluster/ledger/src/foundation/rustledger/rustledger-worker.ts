import { isMainThread, parentPort } from "node:worker_threads";
import {
  countLedgerDirectivesInProcess,
  parseLedgerFilesInProcess,
  queryLedgerFilesResultInProcess,
} from "./engine";
import { filterDirectives } from "./directive-filter";
import { engineInstanceHealthy } from "./engine-health";
import { findEntrySlicesWithFullLedger } from "./source-slice-resolver";
import type {
  RustledgerWorkerResponse,
  RustledgerWorkerTask,
} from "./rustledger-worker-protocol";

if (isMainThread || !parentPort) {
  throw new Error("rustledger-worker must run inside a worker thread");
}
const port = parentPort;

port.on("message", async (task: RustledgerWorkerTask) => {
  let response: RustledgerWorkerResponse;
  try {
    let value;
    if (task.kind === "parse") {
      value = await parseLedgerFilesInProcess(
        task.files,
        task.entryPoint,
        task.options,
      );
    } else if (task.kind === "query") {
      value = await queryLedgerFilesResultInProcess(
        task.files,
        task.entryPoint,
        task.query,
      );
    } else if (task.kind === "filter") {
      // Return positions, not directives. postMessage structured-clones objects;
      // returning cloned directives would break identity-keyed entry IDs and
      // plugin provenance on the API thread.
      const selected = new Set(filterDirectives(task.directives, task.options));
      value = task.directives.flatMap((directive, index) =>
        selected.has(directive) ? [index] : [],
      );
    } else if (task.kind === "directive-count") {
      value = await countLedgerDirectivesInProcess(task.files, task.entryPoint);
    } else {
      value = await findEntrySlicesWithFullLedger(
        task.files,
        task.entryPoint,
        task.entryHashes,
      );
    }
    response = { id: task.id, ok: true, value };
  } catch (error) {
    response = {
      id: task.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack
          ? { stack: error.stack }
          : {}),
      },
    };
    // A failed task may have left this thread's WASM instance poisoned (see
    // `engine-health.ts`). Answer THIS caller with its own error either way,
    // but flag the reply so the pool retires the slot as it processes the
    // response — the thread's own `exit` arrives too late to stop the next
    // `pump()` from reusing it. Probing before the reply keeps the decision on
    // the same turn as the failure, so no other task can be handed the
    // poisoned instance in between.
    if (!(await engineInstanceHealthy())) {
      port.postMessage({ ...response, poisoned: true });
      // Yield once so the reply flushes before the thread goes away. The pool
      // has already retired the slot by then; this just releases the thread.
      setImmediate(() => process.exit(1));
      return;
    }
  }
  port.postMessage(response);
});
