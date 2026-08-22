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
      kind: "find-entry-slice";
      files: FileMap;
      entryPoint: string;
      entryHash: string;
    };

export type RustledgerWorkerValue =
  | LedgerSnapshot
  | QueryResult
  | number[]
  | EntrySlice
  | null;

export type RustledgerWorkerResponse =
  | { id: number; ok: true; value: RustledgerWorkerValue }
  | {
      id: number;
      ok: false;
      error: { name: string; message: string; stack?: string };
    };
