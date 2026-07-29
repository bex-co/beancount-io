import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useImportSubmit } from "../use-import-submit";
import type { ImportTransaction } from "../../types";

// ---------------------------------------------------------------------------
// Hoist mocks so they are available before module imports
// ---------------------------------------------------------------------------
const { mockMutate, mockUseMutation } = vi.hoisted(() => {
  const mockMutate = vi.fn();
  const mockUseMutation = vi.fn(() => [mockMutate, { loading: false }]);

  return { mockMutate, mockUseMutation };
});

vi.mock("@apollo/client/react", () => ({
  useMutation: mockUseMutation,
}));

vi.mock("@/graphql/definitions", () => ({
  BulkEntriesDocument: "BULK_ENTRIES",
  LedgerEntryType: { Transaction: "TRANSACTION" },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeTransaction = (
  overrides: Partial<ImportTransaction> = {},
): ImportTransaction => ({
  rowIndex: 0,
  date: new Date("2024-01-15"),
  payee: "Starbucks",
  description: "Morning coffee",
  amount: 5.5,
  sourceAccount: "Assets:Checking",
  targetAccount: "Expenses:Coffee",
  currency: "USD",
  ...overrides,
});

describe("useImportSubmit", () => {
  const ledgerId = "test-ledger-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }]);
    // Mock Date.now() to always return a value far in the future relative to
    // startTime, so the "minimum 2-second UX delay" in the hook is skipped.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 5_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe("initial state", () => {
    it("should start with importResult null", () => {
      const { result } = renderHook(() => useImportSubmit(ledgerId));
      expect(result.current.importResult).toBeNull();
    });

    it("should start with isSubmitting false", () => {
      const { result } = renderHook(() => useImportSubmit(ledgerId));
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should expose a submitImport function", () => {
      const { result } = renderHook(() => useImportSubmit(ledgerId));
      expect(typeof result.current.submitImport).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Transaction transformation
  // -------------------------------------------------------------------------
  describe("transaction transformation", () => {
    it("should format the date as yyyy-MM-dd", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txn = makeTransaction({ date: new Date("2024-06-15") });

      const submitPromise = result.current.submitImport([txn]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      expect(callArg.variables.entries[0].transaction.date).toBe("2024-06-15");
    });

    it("should set flag to '*'", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));

      const submitPromise = result.current.submitImport([makeTransaction()]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      expect(callArg.variables.entries[0].transaction.flag).toBe("*");
    });

    it("should create a source posting with negated amount", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txn = makeTransaction({
        amount: 42.5,
        sourceAccount: "Assets:Checking",
      });

      const submitPromise = result.current.submitImport([txn]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      const postings = callArg.variables.entries[0].transaction.postings;
      const sourcePosting = postings.find(
        (p: { account: string }) => p.account === "Assets:Checking",
      );

      expect(sourcePosting).toBeDefined();
      expect(sourcePosting.units.number).toBe("-42.5");
      expect(sourcePosting.units.currency).toBe("USD");
    });

    it("should create a target posting with positive amount", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txn = makeTransaction({
        amount: 42.5,
        targetAccount: "Expenses:Coffee",
      });

      const submitPromise = result.current.submitImport([txn]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      const postings = callArg.variables.entries[0].transaction.postings;
      const targetPosting = postings.find(
        (p: { account: string }) => p.account === "Expenses:Coffee",
      );

      expect(targetPosting).toBeDefined();
      expect(targetPosting.units.number).toBe("42.5");
    });

    it("should pass payee and narration from the transaction", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txn = makeTransaction({
        payee: "Amazon",
        description: "Prime subscription",
      });

      const submitPromise = result.current.submitImport([txn]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      const txnInput = callArg.variables.entries[0].transaction;
      expect(txnInput.payee).toBe("Amazon");
      expect(txnInput.narration).toBe("Prime subscription");
    });

    it("should pass the correct ledgerId", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 1,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit("my-ledger"));

      const submitPromise = result.current.submitImport([makeTransaction()]);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      expect(callArg.variables.ledgerId).toBe("my-ledger");
    });

    it("should submit multiple transactions at once", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 3,
            failureCount: 0,
            message: null,
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txns = [
        makeTransaction({ rowIndex: 0, payee: "A" }),
        makeTransaction({ rowIndex: 1, payee: "B" }),
        makeTransaction({ rowIndex: 2, payee: "C" }),
      ];

      const submitPromise = result.current.submitImport(txns);
      await submitPromise;

      const [[callArg]] = mockMutate.mock.calls;
      expect(callArg.variables.entries).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Success result
  // -------------------------------------------------------------------------
  describe("success result", () => {
    it("should set importResult with success=true on a successful response", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          bulkEntries: {
            success: true,
            successCount: 2,
            failureCount: 0,
            message: "All imported",
            errors: [],
          },
        },
      });

      const { result } = renderHook(() => useImportSubmit(ledgerId));

      const submitPromise = result.current.submitImport([
        makeTransaction({ rowIndex: 0 }),
        makeTransaction({ rowIndex: 1 }),
      ]);
      await submitPromise;

      await waitFor(() => expect(result.current.importResult).not.toBeNull());

      expect(result.current.importResult!.success).toBe(true);
      expect(result.current.importResult!.successCount).toBe(2);
      expect(result.current.importResult!.failureCount).toBe(0);
      expect(result.current.importResult!.message).toBe("All imported");
    });
  });

  // -------------------------------------------------------------------------
  // Network / mutation errors
  // -------------------------------------------------------------------------
  describe("error handling", () => {
    it("should set importResult with success=false when the mutation throws", async () => {
      mockMutate.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useImportSubmit(ledgerId));
      const txns = [makeTransaction()];

      const submitPromise = result.current
        .submitImport(txns)
        .catch(() => undefined);
      await submitPromise;

      await waitFor(() => expect(result.current.importResult).not.toBeNull());

      expect(result.current.importResult!.success).toBe(false);
      expect(result.current.importResult!.message).toBe(
        "Something went wrong. Please try again.",
      );
      expect(result.current.importResult!.failureCount).toBe(txns.length);
    });

    it("should include a localized error entry when the mutation throws", async () => {
      mockMutate.mockRejectedValueOnce(new Error("Server error"));

      const { result } = renderHook(() => useImportSubmit(ledgerId));

      const submitPromise = result.current
        .submitImport([makeTransaction()])
        .catch(() => undefined);
      await submitPromise;

      await waitFor(() => expect(result.current.importResult).not.toBeNull());

      const errors = result.current.importResult!.errors ?? [];
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("Something went wrong. Please try again.");
    });

    it("should reset isSubmitting to false after an error", async () => {
      mockMutate.mockRejectedValueOnce(new Error("Oops"));

      const { result } = renderHook(() => useImportSubmit(ledgerId));

      const submitPromise = result.current
        .submitImport([makeTransaction()])
        .catch(() => undefined);
      await submitPromise;

      await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    });
  });
});
