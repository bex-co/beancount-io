/**
 * The branch a save takes is the whole point of this helper, and one of those
 * branches has been wrong in this codebase before: `addEntries` reports a
 * rejection in its payload while the mutation hook's `error` field is still a
 * render behind, so a server-rejected split used to toast *success* and
 * navigate away. That case is pinned below and would fail under the old
 * behavior.
 *
 * The other thing under test is timing. The two flows this replaced parked
 * everything — the caller's refetch included — behind `setTimeout(…, 2000)`;
 * these assert that the confirmation, the refetch and the return all happen by
 * the time the call settles, with no timer in between.
 *
 * Relative requires: the runner has no `@/` alias for value imports.
 */
import { runLedgerWrite, type LedgerWriteDeps } from "../ledger-write";

type ToastRecord = { message: string; type: string };

type Recorder = {
  deps: LedgerWriteDeps;
  toasts: ToastRecord[];
  dismissed: number;
  haptics: string[];
  backs: number;
};

function recorder(): Recorder {
  const record: Recorder = {
    toasts: [],
    dismissed: 0,
    haptics: [],
    backs: 0,
    deps: {
      showToast: (message, type) => {
        record.toasts.push({ message, type });
        return () => {
          record.dismissed += 1;
        };
      },
      haptics: {
        success: () => record.haptics.push("success"),
        error: () => record.haptics.push("error"),
      },
      goBack: () => {
        record.backs += 1;
      },
    },
  };
  return record;
}

/** Replaces the global timer for the duration of `run` and counts its uses. */
async function withTimerSpy(run: () => Promise<void>): Promise<number> {
  const realSetTimeout = global.setTimeout;
  let scheduled = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).setTimeout = (...args: unknown[]) => {
    scheduled += 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realSetTimeout as any)(...args);
  };
  try {
    await run();
  } finally {
    global.setTimeout = realSetTimeout;
  }
  return scheduled;
}

describe("runLedgerWrite", () => {
  it("confirms, refetches and returns on a successful write", async () => {
    const r = recorder();
    let refetched = 0;

    const outcome = await runLedgerWrite(r.deps, {
      perform: async () => ({ ok: true }),
      loadingMessage: "Saving…",
      successMessage: "Saved",
      failureMessage: "Could not save",
      afterSuccess: () => {
        refetched += 1;
      },
    });

    expect(outcome.ok).toBe(true);
    expect(r.toasts).toEqual([
      { message: "Saving…", type: "loading" },
      { message: "Saved", type: "success" },
    ]);
    expect(r.dismissed).toBe(1);
    expect(r.haptics).toEqual(["success"]);
    expect(refetched).toBe(1);
    expect(r.backs).toBe(1);
  });

  it("takes the failure path when the server rejects in the payload", async () => {
    const r = recorder();
    let refetched = 0;

    // The split case: the mutation resolved, nothing threw, and the hook's
    // `error` is still undefined — only the payload says it failed.
    const outcome = await runLedgerWrite(r.deps, {
      perform: async () => ({ data: { addEntries: { success: false } } }),
      didSucceed: (result) => Boolean(result.data?.addEntries?.success),
      loadingMessage: "Saving…",
      successMessage: "Saved",
      failureMessage: "Could not save",
      afterSuccess: () => {
        refetched += 1;
      },
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.ok ? "" : outcome.message).toBe("Could not save");
    expect(r.toasts).toEqual([
      { message: "Saving…", type: "loading" },
      { message: "Could not save", type: "error" },
    ]);
    expect(r.haptics).toEqual(["error"]);
    // The two that must not happen on a rejected write.
    expect(refetched).toBe(0);
    expect(r.backs).toBe(0);
  });

  it("takes the failure path when the mutation throws", async () => {
    const r = recorder();
    const thrown = new Error("stale checksum");

    const outcome = await runLedgerWrite(r.deps, {
      perform: async () => {
        throw thrown;
      },
      loadingMessage: "Saving…",
      successMessage: "Saved",
      failureMessage: "Could not save",
      failureMessageFor: (error) =>
        error instanceof Error ? error.message : "Could not save",
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.ok ? "" : outcome.message).toBe("stale checksum");
    // The caller (the transaction editor) renders the cause inline.
    expect(outcome.ok ? null : outcome.error).toBe(thrown);
    expect(r.dismissed).toBe(1);
    expect(r.haptics).toEqual(["error"]);
    expect(r.backs).toBe(0);
  });

  it("defaults to success for mutations that only signal by throwing", async () => {
    const r = recorder();

    const outcome = await runLedgerWrite(r.deps, {
      perform: async () => undefined,
      successMessage: "Deleted",
      failureMessage: "Could not delete",
    });

    expect(outcome.ok).toBe(true);
    // No `loadingMessage`, so the only toast is the confirmation.
    expect(r.toasts).toEqual([{ message: "Deleted", type: "success" }]);
    expect(r.dismissed).toBe(0);
  });

  it("defers nothing behind a timer", async () => {
    const r = recorder();
    let refetched = 0;

    const scheduled = await withTimerSpy(async () => {
      await runLedgerWrite(r.deps, {
        perform: async () => ({ ok: true }),
        successMessage: "Saved",
        failureMessage: "Could not save",
        afterSuccess: () => {
          refetched += 1;
        },
      });
    });

    expect(scheduled).toBe(0);
    expect(refetched).toBe(1);
    expect(r.backs).toBe(1);
  });

  it("keeps the caller put when the write does not navigate", async () => {
    const r = recorder();

    await runLedgerWrite(r.deps, {
      perform: async () => ({ ok: true }),
      successMessage: "Saved",
      failureMessage: "Could not save",
      goBackOnSuccess: false,
    });

    expect(r.backs).toBe(0);
    expect(r.haptics).toEqual(["success"]);
  });

  it("still reports success when the follow-up refetch fails", async () => {
    const r = recorder();

    const outcome = await runLedgerWrite(r.deps, {
      perform: async () => ({ ok: true }),
      successMessage: "Saved",
      failureMessage: "Could not save",
      // The directive is already committed; a failed refresh must not be
      // reported as a failed write.
      afterSuccess: () => Promise.reject(new Error("network")),
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(outcome.ok).toBe(true);
    expect(r.haptics).toEqual(["success"]);
    expect(r.backs).toBe(1);
  });
});
