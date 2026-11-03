import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import {
  EntryWriteMaybeSavedError,
  fingerprint,
  isEntryWriteInProgress,
  sendEntryWrite,
  useEntryWrite,
} from "../entry-write";

const refetchQueries = vi.fn(async () => []);
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries }),
}));

const inProgress = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message:
          "Entry write conflict: A write with this requestId is still in progress",
        extensions: { code: "CONFLICT", resource: "Entry write" },
      },
    ],
  });
const otherConflict = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: "File conflict: changed since read",
        extensions: { code: "CONFLICT", resource: "File" },
      },
    ],
  });
const noWait = vi.fn(async () => {});

beforeEach(() => {
  noWait.mockClear();
  refetchQueries.mockClear();
});

describe("sendEntryWrite", () => {
  it("retries an in-progress write with backoff and returns its result", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(inProgress())
      .mockRejectedValueOnce(inProgress())
      .mockResolvedValue({ ok: true });

    await expect(sendEntryWrite(write, noWait)).resolves.toEqual({ ok: true });
    expect(write).toHaveBeenCalledTimes(3);
    expect(noWait.mock.calls).toEqual([[1000], [2000]]);
  });

  it("gives up after bounded retries with a maybe-saved error, never spinning on", async () => {
    const write = vi.fn().mockRejectedValue(inProgress());

    await expect(sendEntryWrite(write, noWait)).rejects.toBeInstanceOf(
      EntryWriteMaybeSavedError,
    );
    expect(write).toHaveBeenCalledTimes(4);
  });

  it("passes any other failure through on the first attempt", async () => {
    const refused = otherConflict();
    const write = vi.fn().mockRejectedValue(refused);

    await expect(sendEntryWrite(write, noWait)).rejects.toBe(refused);
    expect(write).toHaveBeenCalledTimes(1);
    expect(isEntryWriteInProgress(refused)).toBe(false);
  });
});

describe("fingerprint", () => {
  it("is stable for the same content and differs for changed content", () => {
    const rent = { entries: [{ amount: "2000.00" }] };
    expect(fingerprint(rent)).toBe(
      fingerprint({ entries: [{ amount: "2000.00" }] }),
    );
    expect(fingerprint(rent)).not.toBe(
      fingerprint({ entries: [{ amount: "2100.00" }] }),
    );
    expect(fingerprint(rent)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("useEntryWrite", () => {
  const rent = { ledgerId: "alice/books", entries: [{ amount: "2000.00" }] };

  it("names a retry of the same entry with the same id and an edit with a new one", () => {
    const { result } = renderHook(() => useEntryWrite());
    const first = result.current.withRequestId(rent).requestId;

    expect(result.current.withRequestId(rent).requestId).toBe(first);
    expect(
      result.current.withRequestId({
        ...rent,
        entries: [{ amount: "2100.00" }],
      }).requestId,
    ).not.toBe(first);
    expect(first.length).toBeLessThanOrEqual(200);
  });

  it("starts a new id after a save, so a second identical entry is its own write", async () => {
    const { result } = renderHook(() => useEntryWrite());
    const first = result.current.withRequestId(rent).requestId;

    await act(() => result.current.send(async () => ({ ok: true })));

    expect(result.current.withRequestId(rent).requestId).not.toBe(first);
  });

  it("keeps the id after a refusal, so resending the unchanged entry is a retry", async () => {
    const { result } = renderHook(() => useEntryWrite());
    const first = result.current.withRequestId(rent).requestId;

    await act(() =>
      expect(
        result.current.send(async () => {
          throw otherConflict();
        }),
      ).rejects.toBeInstanceOf(CombinedGraphQLErrors),
    );

    expect(result.current.withRequestId(rent).requestId).toBe(first);
    expect(refetchQueries).not.toHaveBeenCalled();
  });

  it("refreshes the active queries when a save may already have landed", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useEntryWrite());
      const pending = result.current.send(async () => {
        throw inProgress();
      });
      const settled = expect(pending).rejects.toBeInstanceOf(
        EntryWriteMaybeSavedError,
      );
      await vi.runAllTimersAsync();
      await settled;
      expect(refetchQueries).toHaveBeenCalledWith({ include: "active" });
      expect(getErrorMessageKey(new EntryWriteMaybeSavedError())).toBe(
        "common.errors.entryMaybeSaved",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
