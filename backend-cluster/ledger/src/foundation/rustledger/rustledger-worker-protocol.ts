import type { DirectiveJson, FileMap, QueryResult } from "@rustledger/wasm";
import type { LedgerSnapshot, ParseLedgerOptions } from "./engine";
import type { FilterOptions } from "./directive-filter";
import type { EntrySlice } from "./source-slice";

export type RustledgerWorkerTask =
  | {
      id: number;
      kind: "parse";
      files: FileMap;
      entryPoint: string;
      options: ParseLedgerOptions;
    }
  | {
      id: number;
      kind: "query";
      files: FileMap;
      entryPoint: string;
      query: string;
    }
  | {
      id: number;
      kind: "filter";
      directives: DirectiveJson[];
      options: FilterOptions;
    }
  | {
      id: number;
      kind: "directive-count";
      files: FileMap;
      entryPoint: string;
    }
  | {
      id: number;
      kind: "find-entry-slice";
      files: FileMap;
      entryPoint: string;
      entryHash: string;
    };

export type RustledgerWorkerValue =
  LedgerSnapshot | QueryResult | number | number[] | EntrySlice | null;

export type RustledgerWorkerResponse =
  | { id: number; ok: true; value: RustledgerWorkerValue }
  | {
      id: number;
      ok: false;
      error: { name: string; message: string; stack?: string };
      /**
       * The worker's WASM instance failed its liveness probe after this task,
       * so the thread is on its way out (see `engine-health.ts`). The pool must
       * retire the slot while handling THIS response: waiting for the thread's
       * `exit` event leaves the slot idle-and-healthy for one more `pump()`,
       * which hands the next caller — typically an unrelated ledger — the
       * poisoned instance.
       */
      poisoned?: boolean;
    };
