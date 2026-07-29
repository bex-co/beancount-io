import { describe, it, expect, vi, beforeEach } from "vitest";
import { groupLedgersByOwner, getUserDefaultLedger } from "../ledger-utils";
import type { ApolloClient } from "@apollo/client";

describe("ledger-utils", () => {
  describe("groupLedgersByOwner", () => {
    it("should return an empty map for an empty array", () => {
      const result = groupLedgersByOwner([]);
      expect(result.size).toBe(0);
    });

    it("should group a single ledger by its owner", () => {
      const ledgers = [{ fullName: "alice/budget" }];
      const result = groupLedgersByOwner(ledgers);
      expect(result.size).toBe(1);
      expect(result.get("alice")).toEqual([{ fullName: "alice/budget" }]);
    });

    it("should group multiple ledgers by the same owner", () => {
      const ledgers = [
        { fullName: "alice/budget" },
        { fullName: "alice/savings" },
      ];
      const result = groupLedgersByOwner(ledgers);
      expect(result.size).toBe(1);
      expect(result.get("alice")).toHaveLength(2);
    });

    it("should group ledgers by different owners", () => {
      const ledgers = [{ fullName: "alice/budget" }, { fullName: "bob/main" }];
      const result = groupLedgersByOwner(ledgers);
      expect(result.size).toBe(2);
      expect(result.get("alice")).toEqual([{ fullName: "alice/budget" }]);
      expect(result.get("bob")).toEqual([{ fullName: "bob/main" }]);
    });

    it("should preserve additional properties on ledger objects", () => {
      const ledgers = [
        { fullName: "alice/budget", id: "abc123", name: "budget" },
      ];
      const result = groupLedgersByOwner(ledgers);
      expect(result.get("alice")).toEqual([
        { fullName: "alice/budget", id: "abc123", name: "budget" },
      ]);
    });

    it("should use 'unknown' as owner key when owner cannot be parsed", () => {
      const ledgers = [{ fullName: "no-slash-here" }];
      const result = groupLedgersByOwner(ledgers);
      // parseLedgerFullName returns empty string for owner when there's no slash
      // which gets converted to 'unknown'
      expect(result.has("unknown")).toBe(true);
    });
  });

  describe("getUserDefaultLedger", () => {
    let mockApolloClient: Partial<ApolloClient<unknown>>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockApolloClient = {
        query: vi.fn(),
      };
    });

    it("should return the first owned ledger when available", async () => {
      const ownedLedger = { id: "ledger-1" };
      (
        mockApolloClient.query as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        data: { listUserOwnedLedgers: [ownedLedger] },
      });

      const result = await getUserDefaultLedger(
        mockApolloClient as ApolloClient<unknown>,
      );
      expect(result).toEqual(ownedLedger);
    });

    it("should fall back to all ledgers when owned ledgers list is empty", async () => {
      const allLedger = { id: "ledger-2" };
      (mockApolloClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { listUserOwnedLedgers: [] } })
        .mockResolvedValueOnce({ data: { listLedgers: [allLedger] } });

      const result = await getUserDefaultLedger(
        mockApolloClient as ApolloClient<unknown>,
      );
      expect(result).toEqual(allLedger);
    });

    it("should return null when both queries return empty arrays", async () => {
      (mockApolloClient.query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { listUserOwnedLedgers: [] } })
        .mockResolvedValueOnce({ data: { listLedgers: [] } });

      const result = await getUserDefaultLedger(
        mockApolloClient as ApolloClient<unknown>,
      );
      expect(result).toBeNull();
    });

    it("should fall back to all ledgers when owned ledgers query throws", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const allLedger = { id: "ledger-3" };
      (mockApolloClient.query as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: { listLedgers: [allLedger] } });

      const result = await getUserDefaultLedger(
        mockApolloClient as ApolloClient<unknown>,
      );
      expect(result).toEqual(allLedger);
      consoleSpy.mockRestore();
    });

    it("should return null when both queries throw", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      (mockApolloClient.query as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"));

      const result = await getUserDefaultLedger(
        mockApolloClient as ApolloClient<unknown>,
      );
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});
