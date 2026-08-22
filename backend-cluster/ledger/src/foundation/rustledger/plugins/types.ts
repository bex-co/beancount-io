import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
  Severity,
} from "@rustledger/wasm";

/** Injected request context for time-dependent plugins. */
export interface PluginContext {
  /** Local "today" as an ISO `YYYY-MM-DD` string. */
  today: string;
}

/** A plugin transform's output: the (possibly rewritten) stream plus any errors. */
export interface PluginResult {
  directives: DirectiveJson[];
  errors: BeancountError[];
}

/**
 * A TypeScript reimplementation of a beancount/fava plugin — a pure transform
 * over the parsed `DirectiveJson[]` stream (the same post-parse pattern as
 * `collectDocuments`, `clampDirectives`, etc.). Runs AFTER the WASM parse; the
 * plugin's `plugin "..."` directive has already been stripped from the source so
 * the WASM does not emit `E8005`.
 */
export type PluginFn = (
  directives: DirectiveJson[],
  options: LedgerOptions,
  ctx: PluginContext,
) => PluginResult;

/** Build a `phase: "plugin"` {@link BeancountError}, optionally anchored to a line. */
export function pluginError(
  message: string,
  opts: {
    code?: string;
    severity?: Severity;
    file?: string | null;
    line?: number | null;
    hint?: string | null;
  } = {},
): BeancountError {
  return {
    message,
    code: opts.code ?? null,
    phase: "plugin",
    hint: opts.hint ?? null,
    file: opts.file ?? null,
    line: opts.line ?? null,
    column: null,
    end_line: null,
    end_column: null,
    severity: opts.severity ?? "error",
  };
}
