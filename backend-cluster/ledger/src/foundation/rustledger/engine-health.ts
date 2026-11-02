import type { FileMap } from "@rustledger/wasm";
import { loadRustledger } from "./loader";

/**
 * The smallest ledger that proves a WASM instance can still parse: one file,
 * one directive, no plugins, no clock reads. Shared by the pool's `warmup()`,
 * the worker's post-failure liveness probe, and `/healthz`, so none of the
 * three can disagree on what "the engine works" means.
 *
 * Note that `warmup()` is not wired into server startup, so `/healthz` is
 * today the only thing that proves the `.wasm` asset is loadable at all.
 */
export const HEALTH_ENTRY_POINT = "__rustledger_health__.bean";
export const HEALTH_FILES: FileMap = {
  [HEALTH_ENTRY_POINT]: "2000-01-01 open Assets:Rustledger-Health USD\n",
};
export const HEALTH_DIRECTIVE_COUNT = 1;

/**
 * Whether THIS thread's WASM instance is still usable.
 *
 * A WASM trap unwinds nothing: the shadow-stack pointer global is left where
 * it was when the access went out of bounds, and the allocator can be halfway
 * through an operation. Every later call on the same instance then reads from
 * a bogus stack base, so one poisoned instance turns every subsequent request
 * routed to it — parses and queries alike, for unrelated ledgers — into
 * `memory access out of bounds` until the thread is replaced.
 *
 * The instance's own error does NOT identify that state: the same
 * `RangeError` has been observed both leaving the instance usable and
 * poisoning it, so classifying by `error.name` under- and over-reacts by
 * turns. Asking the instance to do real work is the only reliable judge.
 *
 * Never throws — a trap inside the probe itself is exactly the "not healthy"
 * answer the caller is looking for.
 */
export async function engineInstanceHealthy(): Promise<boolean> {
  try {
    const mod = await loadRustledger();
    const ledger = mod.Ledger.fromFiles(HEALTH_FILES, HEALTH_ENTRY_POINT);
    try {
      return (
        ledger.isValid() && ledger.directiveCount() === HEALTH_DIRECTIVE_COUNT
      );
    } finally {
      ledger.free();
    }
  } catch {
    return false;
  }
}
