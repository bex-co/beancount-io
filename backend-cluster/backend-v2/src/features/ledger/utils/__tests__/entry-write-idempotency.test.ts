import type {
  IdempotencyRecord,
  IdempotencyStore,
} from "@/foundation/redis/redis-idempotency";
import { ConflictError, ValidationError } from "@/shared/errors";
import { runIdempotentEntryWrite } from "../entry-write-idempotency";

jest.mock("@/foundation/redis/redis-idempotency", () => ({
  redisIdempotencyStore: {
    claim: jest.fn(() => {
      throw new Error("the default store must not be reached without an id");
    }),
  },
}));

/** An in-memory store with Redis's claim semantics, and a switch to take it down. */
function memoryStore() {
  const records = new Map<string, IdempotencyRecord>();
  const state = { down: false, calls: 0 };
  const store: IdempotencyStore = {
    async claim(key, requestHash) {
      state.calls++;
      if (state.down) return undefined;
      const record = records.get(key);
      if (record) return { claimed: false, record };
      records.set(key, { requestHash, status: "in-progress" });
      return { claimed: true };
    },
    async complete(key, requestHash, result) {
      state.calls++;
      if (state.down) return;
      records.set(key, { requestHash, status: "done", result });
    },
    async release(key) {
      state.calls++;
      if (state.down) return;
      records.delete(key);
    },
  };
  return { store, records, state };
}

const base = {
  userId: "usr_1",
  ledgerId: "alice/books",
  operation: "bulkEntries" as const,
  request: { inputs: [{ narration: "Rent", amount: "2000.00" }] },
  committed: (result: unknown) =>
    (result as { success?: boolean } | undefined)?.success !== false,
};

describe("runIdempotentEntryWrite", () => {
  it("runs the write exactly as before and touches no store without a requestId", async () => {
    const write = jest.fn().mockResolvedValue({ success: true });

    await expect(
      runIdempotentEntryWrite({ ...base, requestId: undefined, write }),
    ).resolves.toEqual({ success: true });
    await expect(
      runIdempotentEntryWrite({ ...base, requestId: null, write }),
    ).resolves.toEqual({ success: true });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("returns the first result to a retry with the same id and request, writing once", async () => {
    const { store } = memoryStore();
    const write = jest
      .fn()
      .mockResolvedValueOnce({ success: true, entryHashes: ["h1"] })
      .mockResolvedValue({ success: true, entryHashes: ["duplicate"] });

    const first = await runIdempotentEntryWrite({
      ...base,
      requestId: "rent-a7f3",
      write,
      store,
    });
    const retry = await runIdempotentEntryWrite({
      ...base,
      requestId: "rent-a7f3",
      write,
      store,
    });

    expect(first).toEqual({ success: true, entryHashes: ["h1"] });
    expect(retry).toEqual(first);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("refuses the same id with a different request", async () => {
    const { store } = memoryStore();
    const write = jest.fn().mockResolvedValue({ success: true });
    await runIdempotentEntryWrite({ ...base, requestId: "id-1", write, store });

    await expect(
      runIdempotentEntryWrite({
        ...base,
        request: { inputs: [{ narration: "Rent", amount: "2100.00" }] },
        requestId: "id-1",
        write,
        store,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(write).toHaveBeenCalledTimes(1);
  });

  // w23/m38, w1/234: host usernames are case-insensitive, so `Alice/books` is
  // the ledger `alice/books`. A retry that spells the owner differently used to
  // find no record and write the same transaction twice.
  it.each(["Alice/books", "ALICE/books"])(
    "treats %s as the ledger the first write named, writing once",
    async (spelling) => {
      const { store } = memoryStore();
      const write = jest
        .fn()
        .mockResolvedValueOnce({ success: true, entryHashes: ["h1"] })
        .mockResolvedValue({ success: true, entryHashes: ["duplicate"] });

      const first = await runIdempotentEntryWrite({
        ...base,
        requestId: "rent-a7f3",
        write,
        store,
      });
      const retry = await runIdempotentEntryWrite({
        ...base,
        ledgerId: spelling,
        requestId: "rent-a7f3",
        write,
        store,
      });

      expect(retry).toEqual(first);
      expect(write).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps a different ledger, owner or name apart under one id", async () => {
    const { store } = memoryStore();
    const write = jest.fn().mockResolvedValue({ success: true });
    for (const ledgerId of ["alice/books", "alice/other", "bob/books"]) {
      await runIdempotentEntryWrite({
        ...base,
        ledgerId,
        requestId: "same-id",
        write,
        store,
      });
    }
    expect(write).toHaveBeenCalledTimes(3);
  });

  // w1/220: GraphQL builds a posting `units` first, zod keeps the caller's
  // order, and the same transaction hashed as two requests.
  it("treats key order and absent fields as the same request", async () => {
    const { store } = memoryStore();
    const write = jest.fn().mockResolvedValue({ success: true });
    await runIdempotentEntryWrite({
      ...base,
      request: {
        inputs: [{ account: "Assets:Cash", units: { number: "1" } }],
        allowInvalid: false,
      },
      requestId: "id-1",
      write,
      store,
    });

    await expect(
      runIdempotentEntryWrite({
        ...base,
        request: {
          allowInvalid: false,
          inputs: [
            { units: { number: "1" }, price: null, account: "Assets:Cash" },
          ],
          path: undefined,
        },
        requestId: "id-1",
        write,
        store,
      }),
    ).resolves.toEqual({ success: true });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("still tells two orders of the same list apart", async () => {
    const { store } = memoryStore();
    const write = jest.fn().mockResolvedValue({ success: true });
    await runIdempotentEntryWrite({
      ...base,
      request: { inputs: ["a", "b"] },
      requestId: "id-1",
      write,
      store,
    });

    await expect(
      runIdempotentEntryWrite({
        ...base,
        request: { inputs: ["b", "a"] },
        requestId: "id-1",
        write,
        store,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("never lets one id span two kinds of write", async () => {
    const { store } = memoryStore();
    const write = jest.fn().mockResolvedValue({ success: true });
    await runIdempotentEntryWrite({ ...base, requestId: "id-1", write, store });

    await expect(
      runIdempotentEntryWrite({
        ...base,
        operation: "appendText",
        requestId: "id-1",
        write,
        store,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("answers a concurrent repeat with a retryable conflict and writes once", async () => {
    const { store } = memoryStore();
    let finish!: (value: unknown) => void;
    const write = jest.fn(() => new Promise((resolve) => (finish = resolve)));

    const first = runIdempotentEntryWrite({
      ...base,
      requestId: "slow",
      write,
      store,
    });
    await Promise.resolve();
    const repeat = runIdempotentEntryWrite({
      ...base,
      requestId: "slow",
      write,
      store,
    });

    await expect(repeat).rejects.toBeInstanceOf(ConflictError);
    await expect(repeat).rejects.toMatchObject({
      metadata: {
        requestInProgress: true,
        hint: expect.stringContaining("same requestId"),
      },
    });
    finish({ success: true });
    await expect(first).resolves.toEqual({ success: true });
    expect(write).toHaveBeenCalledTimes(1);
    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "slow", write, store }),
    ).resolves.toEqual({ success: true });
  });

  it("releases the id when the write throws, so the retry runs again", async () => {
    const { store, records } = memoryStore();
    const write = jest
      .fn()
      .mockRejectedValueOnce(new Error("bean-check refused"))
      .mockResolvedValue({ success: true });

    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-2", write, store }),
    ).rejects.toThrow("bean-check refused");
    expect(records.size).toBe(0);
    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-2", write, store }),
    ).resolves.toEqual({ success: true });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("releases the id when the write reports success: false", async () => {
    const { store, records } = memoryStore();
    const write = jest
      .fn()
      .mockResolvedValueOnce({ success: false, message: "refused" })
      .mockResolvedValue({ success: true });

    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-3", write, store }),
    ).resolves.toEqual({ success: false, message: "refused" });
    expect(records.size).toBe(0);
    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-3", write, store }),
    ).resolves.toEqual({ success: true });
  });

  it("saves without protection when the store is unavailable", async () => {
    const { store, state } = memoryStore();
    state.down = true;
    const write = jest.fn().mockResolvedValue({ success: true });

    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-4", write, store }),
    ).resolves.toEqual({ success: true });
    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "id-4", write, store }),
    ).resolves.toEqual({ success: true });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("keeps a crash after the commit from becoming a duplicate", async () => {
    const { store, records } = memoryStore();
    await runIdempotentEntryWrite({
      ...base,
      requestId: "crash",
      write: async () => ({ success: true }),
      store,
    });
    // The first attempt committed, then the process died before marking it done.
    const [[key, record]] = [...records];
    records.set(key, {
      requestHash: record.requestHash,
      status: "in-progress",
    });
    const write = jest.fn().mockResolvedValue({ success: true });

    await expect(
      runIdempotentEntryWrite({ ...base, requestId: "crash", write, store }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["", "x".repeat(201)])(
    "refuses a requestId of length %#",
    async (requestId) => {
      const write = jest.fn();
      await expect(
        runIdempotentEntryWrite({ ...base, requestId, write }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(write).not.toHaveBeenCalled();
    },
  );
});
