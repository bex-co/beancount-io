import { isMainThread, parentPort } from "node:worker_threads";
import {
  parseLedgerFilesInProcess,
  queryLedgerFilesResultInProcess,
} from "./engine";
import { filterDirectives } from "./directive-filter";
import { findEntrySliceWithFullLedger } from "./source-slice-resolver";
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
    } else {
      value = await findEntrySliceWithFullLedger(
        task.files,
        task.entryPoint,
        task.entryHash,
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
  }
  port.postMessage(response);
});
