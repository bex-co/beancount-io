import { executeSourceSlice } from "../mcp-source-slices";
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

describe("executeSourceSlice", () => {
  it("update returns the new hash for follow-up edits, not the stale one", async () => {
    const updateSourceSlice = jest.fn().mockResolvedValue({
      message: "Updated",
      entryHash: "hash-old",
      newSha256sum: "newsum",
      newEntryHash: "hash-new",
    });
    const result = await executeSourceSlice(
      context({ updateSourceSlice }),
      {
        operation: "update",
        ledger: LEDGER_ID,
        entryHash: "hash-old",
        sha256sum: "oldsum",
        newContent: "2024-01-02 * \"new\"\n",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.result).toEqual(
      expect.objectContaining({
        newEntryHash: "hash-new",
        entryHashes: ["hash-new"],
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
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
    const result = await executeSourceSlice(
      context({ deleteMultiSourceSlices }),
      { operation: "delete_many", ledger: LEDGER_ID, entries },
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
});
