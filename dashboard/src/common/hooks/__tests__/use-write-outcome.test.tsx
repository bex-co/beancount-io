import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useWriteOutcome } from "../use-write-outcome";

const state = vi.hoisted(() => ({
  before: [] as { message: string; lineno?: number }[],
  after: [] as { message: string; lineno?: number }[],
  navigate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { getLedgerErrors: state.before },
    refetch: state.refetch,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: state.navigate }),
}));
vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), success: vi.fn(), dismiss: vi.fn() },
}));

const DUPLICATE_OPEN =
  "Account Assets:Cash is already open (opened on 2026-01-01)";

async function writeAndReport(ledgerId = "alice/books") {
  const { result } = renderHook(() => useWriteOutcome(ledgerId));
  const before = result.current.snapshot();
  let leftErrors = false;
  await act(async () => {
    leftErrors = await result.current.report(before);
  });
  return leftErrors;
}

describe("useWriteOutcome (w3/640)", () => {
  beforeEach(() => {
    vi.mocked(toast.warning).mockClear();
    vi.mocked(toast.dismiss).mockClear();
    state.navigate.mockClear();
    state.before = [];
    state.after = [];
    state.refetch.mockReset().mockImplementation(async () => ({
      data: { getLedgerErrors: state.after },
    }));
  });

  afterEach(() => {
    for (const [, options] of vi.mocked(toast.warning).mock.calls) {
      if (options?.id !== undefined) {
        options.onDismiss?.({ id: options.id });
      }
    }
  });

  it("warns with the first error the write introduced and links to Errors", async () => {
    state.before = [];
    state.after = [{ message: DUPLICATE_OPEN, lineno: 92 }];

    expect(await writeAndReport()).toBe(true);
    expect(toast.warning).toHaveBeenCalledTimes(1);
    const [message, options] = vi.mocked(toast.warning).mock.calls[0]!;
    expect(message).toContain(DUPLICATE_OPEN);
    (options as { action: { onClick: () => void } }).action.onClick();
    expect(state.navigate).toHaveBeenCalledWith({
      to: "/ledger/$ledgerOwner/$ledgerName/errors",
      params: { ledgerOwner: "alice", ledgerName: "books" },
    });
  });

  it("stays quiet when the write added nothing, even if lines moved", async () => {
    state.before = [{ message: "Old problem", lineno: 10 }];
    state.after = [{ message: "Old problem", lineno: 14 }];

    expect(await writeAndReport()).toBe(false);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("counts a second copy of an existing error as new", async () => {
    state.before = [{ message: "Same text" }];
    state.after = [{ message: "Same text" }, { message: "Same text" }];

    expect(await writeAndReport()).toBe(true);
  });

  it("does not guess when the errors before the write were unknown", async () => {
    const { result } = renderHook(() => useWriteOutcome("alice/books"));
    state.after = [{ message: DUPLICATE_OPEN }];
    let leftErrors = true;
    await act(async () => {
      leftErrors = await result.current.report(null);
    });
    expect(leftErrors).toBe(false);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("clears the prior warning after a fixing write through another hook", async () => {
    state.after = [{ message: DUPLICATE_OPEN }];
    await writeAndReport();
    const id = vi.mocked(toast.warning).mock.lastCall?.[1]?.id;

    state.before = state.after;
    state.after = [];
    expect(await writeAndReport("alice/other")).toBe(false);
    expect(toast.dismiss).not.toHaveBeenCalled();
    expect(await writeAndReport()).toBe(false);
    expect(toast.dismiss).toHaveBeenCalledWith(id);
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it("preserves the warning while its error survives the next write", async () => {
    state.after = [{ message: DUPLICATE_OPEN, lineno: 92 }];
    await writeAndReport();
    state.before = state.after;
    state.after = [{ message: DUPLICATE_OPEN, lineno: 96 }];

    expect(await writeAndReport()).toBe(false);
    expect(toast.dismiss).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it("uses one warning slot per ledger and can warn again after dismissal", async () => {
    state.after = [{ message: DUPLICATE_OPEN }];
    expect(await writeAndReport()).toBe(true);
    const first = vi.mocked(toast.warning).mock.lastCall?.[1];
    expect(first?.id).toBeTruthy();

    state.before = state.after;
    state.after = [...state.before, { message: "Another error" }];
    expect(await writeAndReport()).toBe(true);
    const second = vi.mocked(toast.warning).mock.lastCall?.[1];
    expect(second?.id).toBe(first?.id);
    second?.onDismiss?.({ id: second.id! });

    state.before = [];
    state.after = [{ message: DUPLICATE_OPEN }];
    expect(await writeAndReport()).toBe(true);
    expect(vi.mocked(toast.warning).mock.lastCall?.[1]?.id).toBe(first?.id);
    expect(toast.warning).toHaveBeenCalledTimes(3);
  });

  it("does not warn about a slow read superseded by a fixing write", async () => {
    const { result } = renderHook(() => useWriteOutcome("alice/books"));
    let finishFirstRead: (value: unknown) => void = () => {};
    state.refetch.mockImplementationOnce(
      () => new Promise((resolve) => (finishFirstRead = resolve)),
    );

    await act(async () => {
      const first = result.current.report([]);
      expect(await result.current.report([{ message: DUPLICATE_OPEN }])).toBe(
        false,
      );
      finishFirstRead({
        data: { getLedgerErrors: [{ message: DUPLICATE_OPEN }] },
      });
      expect(await first).toBe(false);
    });
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
