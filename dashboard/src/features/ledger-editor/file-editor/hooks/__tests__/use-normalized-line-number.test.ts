import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNormalizedLineNumber } from "../use-normalized-line-number";

describe("useNormalizedLineNumber", () => {
  describe("returns undefined for invalid inputs", () => {
    it("should return undefined when lineNumber is undefined", () => {
      const { result } = renderHook(() =>
        useNormalizedLineNumber(undefined, "line1\nline2\nline3"),
      );
      expect(result.current).toBeUndefined();
    });

    it("should return undefined when lineNumber is 0", () => {
      const { result } = renderHook(() =>
        useNormalizedLineNumber(0, "line1\nline2"),
      );
      expect(result.current).toBeUndefined();
    });

    it("should return undefined when lineNumber is negative", () => {
      const { result } = renderHook(() =>
        useNormalizedLineNumber(-5, "line1\nline2"),
      );
      expect(result.current).toBeUndefined();
    });

    it("should return undefined when content is empty string", () => {
      const { result } = renderHook(() => useNormalizedLineNumber(1, ""));
      expect(result.current).toBeUndefined();
    });
  });

  describe("returns valid line numbers within bounds", () => {
    it("should return lineNumber when within valid range", () => {
      const content = "line1\nline2\nline3\nline4\nline5";
      const { result } = renderHook(() => useNormalizedLineNumber(3, content));
      expect(result.current).toBe(3);
    });

    it("should return 1 when lineNumber is below 1 (but positive)", () => {
      // lineNumber <= 0 returns undefined, not clamp
      const content = "line1\nline2";
      const { result } = renderHook(() => useNormalizedLineNumber(0, content));
      expect(result.current).toBeUndefined();
    });

    it("should clamp lineNumber to totalLines when too large", () => {
      const content = "line1\nline2\nline3";
      const { result } = renderHook(() =>
        useNormalizedLineNumber(100, content),
      );
      expect(result.current).toBe(3);
    });

    it("should return 1 for first line", () => {
      const content = "line1\nline2\nline3";
      const { result } = renderHook(() => useNormalizedLineNumber(1, content));
      expect(result.current).toBe(1);
    });

    it("should return last line for last valid line number", () => {
      const content = "line1\nline2\nline3";
      const { result } = renderHook(() => useNormalizedLineNumber(3, content));
      expect(result.current).toBe(3);
    });
  });

  describe("correctly calculates total lines", () => {
    it("should handle single-line content", () => {
      const content = "only one line";
      const { result } = renderHook(() => useNormalizedLineNumber(1, content));
      expect(result.current).toBe(1);
    });

    it("should handle single-line content with large line number", () => {
      const content = "only one line";
      const { result } = renderHook(() =>
        useNormalizedLineNumber(999, content),
      );
      expect(result.current).toBe(1);
    });

    it("should count newlines correctly", () => {
      const content = "a\nb\nc\nd\ne"; // 5 lines
      const { result } = renderHook(() => useNormalizedLineNumber(5, content));
      expect(result.current).toBe(5);
    });

    it("should clamp to actual line count for large file", () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const content = lines.join("\n");
      const { result } = renderHook(() =>
        useNormalizedLineNumber(200, content),
      );
      expect(result.current).toBe(100);
    });
  });

  describe("memoization", () => {
    it("should return the same value for same inputs", () => {
      const content = "line1\nline2\nline3";
      const { result, rerender } = renderHook(
        ({ ln, c }: { ln: number; c: string }) =>
          useNormalizedLineNumber(ln, c),
        { initialProps: { ln: 2, c: content } },
      );

      const first = result.current;
      rerender({ ln: 2, c: content });
      expect(result.current).toBe(first);
    });

    it("should update when lineNumber changes", () => {
      const content = "line1\nline2\nline3";
      const { result, rerender } = renderHook(
        ({ ln }: { ln: number }) => useNormalizedLineNumber(ln, content),
        { initialProps: { ln: 1 } },
      );

      expect(result.current).toBe(1);
      rerender({ ln: 3 });
      expect(result.current).toBe(3);
    });

    it("should update when content changes", () => {
      const { result, rerender } = renderHook(
        ({ c }: { c: string }) => useNormalizedLineNumber(5, c),
        { initialProps: { c: "a\nb\nc\nd\ne\nf\ng" } },
      );

      expect(result.current).toBe(5);
      rerender({ c: "a\nb" }); // Only 2 lines now
      expect(result.current).toBe(2); // Clamped to 2
    });
  });
});
