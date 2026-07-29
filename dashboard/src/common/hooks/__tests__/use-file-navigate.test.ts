import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileNavigate } from "../use-file-navigate";

// Mock @tanstack/react-router
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("useFileNavigate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a function", () => {
    const { result } = renderHook(() => useFileNavigate());

    expect(typeof result.current).toBe("function");
  });

  describe("navigation to files", () => {
    it("should navigate to file with correct params", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });

    it("should navigate to file with line number", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", { lineNumber: 42 });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: 42,
        },
      });
    });

    it("should navigate to file with edit mode enabled", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", { editMode: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: true,
          lineNumber: undefined,
        },
      });
    });

    it("should navigate to file with both line number and edit mode", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", {
          lineNumber: 100,
          editMode: true,
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: true,
          lineNumber: 100,
        },
      });
    });
  });

  describe("navigation to directories", () => {
    it("should navigate to directory with correct params", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "dir", "accounts/");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "accounts/",
        },
      });
    });

    it("should navigate to directory with options (though typically unused)", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "dir", "accounts/", { editMode: false });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "accounts/",
        },
      });
    });
  });

  describe("ledgerId decoding", () => {
    it("should correctly decode ledgerId with special characters in owner", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "user-name/my-ledger";
      act(() => {
        result.current(ledgerId, "file", "test.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "user-name",
          ledgerName: "my-ledger",
          branch: "main",
          _splat: "test.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });

    it("should handle ledgerId with numbers in name", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "user123/ledger456";
      act(() => {
        result.current(ledgerId, "file", "data.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "user123",
          ledgerName: "ledger456",
          branch: "main",
          _splat: "data.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });
  });

  describe("filename handling", () => {
    it("should handle nested file paths", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "accounts/assets/bank.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "accounts/assets/bank.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });

    it("should handle filenames with spaces", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "my file.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "my file.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });

    it("should handle root level files", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "config.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "config.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty options object", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", {});
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: undefined,
        },
      });
    });

    it("should handle lineNumber of 0", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", { lineNumber: 0 });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: undefined,
          lineNumber: 0,
        },
      });
    });

    it("should handle editMode explicitly set to false", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";
      act(() => {
        result.current(ledgerId, "file", "main.beancount", { editMode: false });
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
        params: {
          ledgerOwner: "owner",
          ledgerName: "ledger",
          branch: "main",
          _splat: "main.beancount",
        },
        search: {
          editMode: false,
          lineNumber: undefined,
        },
      });
    });
  });

  describe("multiple navigations", () => {
    it("should support multiple sequential navigations", () => {
      const { result } = renderHook(() => useFileNavigate());

      const ledgerId = "owner/ledger";

      act(() => {
        result.current(ledgerId, "file", "file1.beancount");
      });

      act(() => {
        result.current(ledgerId, "file", "file2.beancount");
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });
});
