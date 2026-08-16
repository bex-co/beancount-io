/**
 * One confirmation path for every write to the ledger.
 *
 * Four screens used to hand-roll the same sequence — loading toast, mutate,
 * branch, confirm, refetch, navigate — and had already drifted apart in the two
 * ways that matter:
 *
 * - **Timing.** Quick-add and split parked the whole tail of a successful save
 *   behind `setTimeout(…, 2000)` so the success toast would still be on screen
 *   when the screen unmounted. Edit and delete returned immediately. The stall
 *   was never necessary: `ToastProvider` is mounted above the navigator (see
 *   `providers.tsx`), so a toast shown just before `router.back()` survives the
 *   transition and finishes its 2s dwell on the destination screen. It also
 *   held the caller's refetch hostage, leaving the screen behind stale for the
 *   same two seconds.
 * - **Feel.** Only budget save fired a haptic, and nothing anywhere fired one
 *   on failure. Hanging both off this helper is what stops a fifth write site
 *   from forgetting.
 *
 * Dependencies are injected rather than imported so this stays a plain function
 * over plain values: no React, no router, no `@/` imports — which is also what
 * makes the branching testable in the jest-lite runner.
 */

export type LedgerWriteToast = "loading" | "success" | "error";

export type LedgerWriteDeps = {
  /** Show a toast; the returned function dismisses it early. */
  showToast: (message: string, type: LedgerWriteToast) => () => void;
  /** Outcome haptics — `haptics` from `common/haptics` satisfies this. */
  haptics: { success: () => void; error: () => void };
  /** Return to the screen that opened this one. */
  goBack: () => void;
};

export type LedgerWriteSpec<T> = {
  /** Runs the mutation. */
  perform: () => Promise<T>;
  /**
   * Whether the server actually accepted the write. Defaults to `true`, which
   * is right for mutations that signal rejection by throwing; `addEntries`
   * reports it in the payload instead and must pass this.
   */
  didSucceed?: (result: T) => boolean;
  /** Shown while `perform` is in flight. Omit for writes with no wait to show. */
  loadingMessage?: string;
  successMessage: string;
  failureMessage: string;
  /** Overrides the failure toast copy when `perform` threw. */
  failureMessageFor?: (error: unknown) => string;
  /**
   * Refetch or cache invalidation. Started before navigating and deliberately
   * not awaited: the write has already committed, so making the user wait on a
   * refresh would just reintroduce the stall in a new form.
   */
  afterSuccess?: () => void | Promise<void>;
  /**
   * Return to the previous screen on success. Default `true`; the ledger file
   * editor saves in place and stays put.
   */
  goBackOnSuccess?: boolean;
};

export type LedgerWriteOutcome =
  { ok: true } | { ok: false; message: string; error?: unknown };

/**
 * Run a ledger write and confirm it: success haptic, success toast, refetch,
 * and back to the previous screen — in that order and without waiting.
 *
 * A failure keeps the user exactly where they are, with an error haptic and an
 * error toast, and hands the caller the outcome so a screen that also renders
 * an inline message (the transaction editor) can fill it in.
 */
export async function runLedgerWrite<T>(
  deps: LedgerWriteDeps,
  spec: LedgerWriteSpec<T>,
): Promise<LedgerWriteOutcome> {
  const dismissLoading = spec.loadingMessage
    ? deps.showToast(spec.loadingMessage, "loading")
    : undefined;

  let result: T;
  try {
    result = await spec.perform();
  } catch (caught) {
    dismissLoading?.();
    return fail(
      deps,
      spec.failureMessageFor?.(caught) ?? spec.failureMessage,
      caught,
    );
  }

  dismissLoading?.();

  if (spec.didSucceed && !spec.didSucceed(result)) {
    return fail(deps, spec.failureMessage);
  }

  deps.haptics.success();
  deps.showToast(spec.successMessage, "success");
  startAfterSuccess(spec.afterSuccess);
  if (spec.goBackOnSuccess !== false) {
    deps.goBack();
  }
  return { ok: true };
}

function fail(
  deps: LedgerWriteDeps,
  message: string,
  error?: unknown,
): LedgerWriteOutcome {
  deps.haptics.error();
  deps.showToast(message, "error");
  return { ok: false, message, error };
}

/**
 * Kick off the follow-up work synchronously, then let it settle on its own. It
 * must never reject upward or reach the user: the directive is already written,
 * and reporting a refresh failure as a write failure invites a second write.
 */
function startAfterSuccess(afterSuccess?: () => void | Promise<void>): void {
  if (!afterSuccess) {
    return;
  }
  try {
    const settling = afterSuccess();
    if (settling && typeof settling.then === "function") {
      settling.then(undefined, () => undefined);
    }
  } catch {
    // Same reasoning as the rejection case above.
  }
}
