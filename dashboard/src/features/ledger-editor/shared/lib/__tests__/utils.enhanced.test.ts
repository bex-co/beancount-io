import { describe, it, expect } from "vitest";
import { formatFileSize, getParentPath } from "../utils";

describe("Ledger Files Utilities", () => {
  describe("formatFileSize", () => {
    it("should format 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should format bytes (< 1024)", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(100)).toBe("100 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
      expect(formatFileSize(10240)).toBe("10 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1 MB"); // 1024 * 1024
      expect(formatFileSize(1572864)).toBe("1.5 MB"); // 1.5 * 1024 * 1024
      expect(formatFileSize(10485760)).toBe("10 MB"); // 10 * 1024 * 1024
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB"); // 1024 * 1024 * 1024
      expect(formatFileSize(2147483648)).toBe("2 GB"); // 2 * 1024 * 1024 * 1024
      expect(formatFileSize(5368709120)).toBe("5 GB"); // 5 * 1024 * 1024 * 1024
    });

    it("should handle decimal values correctly", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1126400)).toMatch(/1.07 MB/);
      expect(formatFileSize(1638400)).toBe("1.56 MB");
    });

    it("should round to 2 decimal places", () => {
      expect(formatFileSize(1234567)).toMatch(/1.18 MB/);
      expect(formatFileSize(123456789)).toMatch(/117.74 MB/);
    });

    it("should handle very large files", () => {
      const largeSize = 10 * 1024 * 1024 * 1024; // 10 GB
      expect(formatFileSize(largeSize)).toBe("10 GB");
    });

    it("should handle edge case at exact boundaries", () => {
      expect(formatFileSize(1024)).toBe("1 KB"); // Exactly 1 KB
      expect(formatFileSize(1048576)).toBe("1 MB"); // Exactly 1 MB
      expect(formatFileSize(1073741824)).toBe("1 GB"); // Exactly 1 GB
    });

    it("should handle values just below boundaries", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1048575)).toMatch(/1024 KB|1 MB/);
    });

    it("should handle negative numbers gracefully", () => {
      // Negative file sizes don't make sense, but the function should handle them gracefully
      const result = formatFileSize(-1024);
      expect(result).toBe("-1 KB");

      const result2 = formatFileSize(-1048576);
      expect(result2).toBe("-1 MB");
    });

    it("should handle fractional bytes", () => {
      expect(formatFileSize(1.5)).toBe("1.5 B");
      expect(formatFileSize(100.7)).toBe("100.7 B");
    });

    it("should handle common file sizes", () => {
      expect(formatFileSize(1024)).toBe("1 KB"); // Minimum KB file
      expect(formatFileSize(4096)).toBe("4 KB"); // Small text file
      expect(formatFileSize(1024 * 100)).toBe("100 KB"); // Medium text file
      expect(formatFileSize(1024 * 1024 * 5)).toBe("5 MB"); // Image file
      expect(formatFileSize(1024 * 1024 * 1024 * 2)).toBe("2 GB"); // Video file
    });
  });

  describe("getParentPath", () => {
    it("should get parent path from simple path", () => {
      expect(getParentPath("folder/file.txt")).toBe("folder");
    });

    it("should get parent path from nested path", () => {
      expect(getParentPath("a/b/c/file.txt")).toBe("a/b/c");
    });

    it("should handle root level file", () => {
      expect(getParentPath("file.txt")).toBe("");
    });

    it("should handle path with trailing slash", () => {
      // When path has trailing slash, the last element is empty string
      // So we get the parent of the folder before the trailing slash
      expect(getParentPath("folder/subfolder/")).toBe("folder/subfolder");
    });

    it("should handle deep nesting", () => {
      expect(getParentPath("a/b/c/d/e/f/file.txt")).toBe("a/b/c/d/e/f");
    });

    it("should handle path with single folder and trailing slash", () => {
      expect(getParentPath("folder/")).toBe("folder");
    });

    it("should handle empty string", () => {
      expect(getParentPath("")).toBe("");
    });

    it("should handle path with special characters", () => {
      expect(getParentPath("my-folder/my_file.txt")).toBe("my-folder");
      expect(getParentPath("folder (1)/file [2].txt")).toBe("folder (1)");
    });

    it("should handle multiple dots in filename", () => {
      expect(getParentPath("folder/file.backup.txt")).toBe("folder");
    });

    it("should handle path with spaces", () => {
      expect(getParentPath("my folder/my file.txt")).toBe("my folder");
    });

    it("should preserve parent path structure", () => {
      expect(getParentPath("folder1/folder2/folder3/file.txt")).toBe(
        "folder1/folder2/folder3",
      );
    });

    it("should handle only slashes", () => {
      expect(getParentPath("/")).toBe("");
    });
  });
});
