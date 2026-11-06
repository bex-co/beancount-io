import { SOURCE_SLICE_EXECUTORS } from "../mcp-source-slices";
import type { Identity } from "@/server/api/identity";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const LEDGER_ID = "alice/personal";

function context(ledgerJournal: unknown) {
  return {
    services: {
      ledgerJournal,
      ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
    } as any,
    identity: IDENTITY,
    ledgerId: LEDGER_ID,
  } as any;
}

describe("SOURCE_SLICE_EXECUTORS", () => {
  it("update returns the new hash for follow-up edits, not the stale one", async () => {
    const updateSourceSlice = jest.fn().mockResolvedValue({
      message: "Updated",
      entryHash: "hash-old",
      newSha256sum: "newsum",
      newEntryHash: "hash-new",
    });
    const result = await SOURCE_SLICE_EXECUTORS.update(
      context({ updateSourceSlice }),
      {
        ledger: LEDGER_ID,
        entryHash: "hash-old",
        sha256sum: "oldsum",
        newContent: '2024-01-02 * "new"\n',
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.result).toEqual(
      expect.objectContaining({
        newEntryHash: "hash-new",
        entryHashes: ["hash-new"],
        validation: {
          errorsBefore: 0,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      }),
    );
    expect(String(result.result.summary)).toContain("hash-new");
  });

  it("delete_many returns the deleted count with the requested hashes", async () => {
    const deleteMultiSourceSlices = jest.fn().mockResolvedValue({
      message: "Deleted",
      deletedCount: 2,
    });
    const entries = [
      { entryHash: "h1", sha256sum: "s1" },
      { entryHash: "h2", sha256sum: "s2" },
    ];
    const result = await SOURCE_SLICE_EXECUTORS.delete_many(
      context({ deleteMultiSourceSlices }),
      { ledger: LEDGER_ID, entries },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.result).toEqual(
      expect.objectContaining({
        deletedCount: 2,
        entryHashes: ["h1", "h2"],
      }),
    );
    expect(String(result.result.summary)).toContain("2 entries");
  });

  // w23/042: a hash sent twice deletes one entry and is reported once, and
  // the rewritten files are reported once each.
  it("delete_many reports each hash and each file once", async () => {
    const deleteMultiSourceSlices = jest.fn().mockResolvedValue({
      message: "Deleted",
      deletedCount: 1,
      files: ["2026/a.bean", "2026/a.bean"],
    });
    const result = await SOURCE_SLICE_EXECUTORS.delete_many(
      context({ deleteMultiSourceSlices }),
      {
        ledger: LEDGER_ID,
        entries: [
          { entryHash: "h1", sha256sum: "s1" },
          { entryHash: "h1", sha256sum: "s1" },
        ],
      },
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.result).toMatchObject({
      entryHashes: ["h1"],
      wrote: [{ path: "2026/a.bean" }],
    });
    expect(result.result).not.toHaveProperty("files");
  });
});
