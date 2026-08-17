import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { arrayToCSV, downloadCSV } from "../csv-export";

describe("CSV Export Utils", () => {
  describe("arrayToCSV", () => {
    it("should convert simple array of objects to CSV", () => {
      const data = [
        { name: "John", age: 30, city: "New York" },
        { name: "Jane", age: 25, city: "London" },
      ];

      const result = arrayToCSV(data);

      expect(result).toBe(
        '"name","age","city"\n"John","30","New York"\n"Jane","25","London"',
      );
    });

    it("should use custom headers when provided", () => {
      const data = [
        { name: "John", age: 30, city: "New York" },
        { name: "Jane", age: 25, city: "London" },
      ];

      const result = arrayToCSV(data, ["name", "age"]);

      expect(result).toBe('"name","age"\n"John","30"\n"Jane","25"');
    });

    it("should handle empty array", () => {
      const result = arrayToCSV([]);

      expect(result).toBe("");
    });

    it("should handle null values", () => {
      const data = [{ name: "John", age: null, city: "New York" }];

      const result = arrayToCSV(data);

      expect(result).toBe('"name","age","city"\n"John","","New York"');
    });

    it("should handle undefined values", () => {
      const data = [{ name: "John", age: undefined, city: "New York" }];

      const result = arrayToCSV(data);

      expect(result).toBe('"name","age","city"\n"John","","New York"');
    });

    it("should escape double quotes in values", () => {
      const data = [{ name: 'John "The Boss" Doe', age: 30 }];

      const result = arrayToCSV(data);

      expect(result).toBe('"name","age"\n"John ""The Boss"" Doe","30"');
    });

    it("should handle numeric values", () => {
      const data = [{ price: 99.99, quantity: 5 }];

      const result = arrayToCSV(data);

      expect(result).toBe('"price","quantity"\n"99.99","5"');
    });

    it("should handle boolean values", () => {
      const data = [{ active: true, deleted: false }];

      const result = arrayToCSV(data);

      expect(result).toBe('"active","deleted"\n"true","false"');
    });

    it("should handle objects with different keys", () => {
      const data = [
        { name: "John", age: 30 },
        { name: "Jane", city: "London" },
      ];

      const result = arrayToCSV(data);

      // Should use keys from first object
      expect(result).toBe('"name","age"\n"John","30"\n"Jane",""');
    });

    it("should handle single object array", () => {
      const data = [{ name: "John", age: 30 }];

      const result = arrayToCSV(data);

      expect(result).toBe('"name","age"\n"John","30"');
    });

    it("should handle empty strings", () => {
      const data = [{ name: "", age: 30 }];

      const result = arrayToCSV(data);

      expect(result).toBe('"name","age"\n"","30"');
    });

    it("should handle special characters", () => {
      const data = [{ name: "John\nDoe", description: "Test,Data" }];

      const result = arrayToCSV(data);

      expect(result).toContain("John\nDoe");
      expect(result).toContain("Test,Data");
    });

    it("should handle arrays as values by converting to string", () => {
      const data = [{ items: [1, 2, 3] }];

      const result = arrayToCSV(data);

      expect(result).toBe('"items"\n"1,2,3"');
    });

    it("should handle objects as values by converting to string", () => {
      const data = [{ metadata: { key: "value" } }];

      const result = arrayToCSV(data);

      expect(result).toContain("[object Object]");
    });
  });

  describe("downloadCSV", () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
    let clickSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
      revokeObjectURLSpy = vi.fn();
      clickSpy = vi.fn();

      // Assign to global URL
      global.URL.createObjectURL = createObjectURLSpy;
      global.URL.revokeObjectURL = revokeObjectURLSpy;

      // Mock document.createElement
      const mockLink = {
        setAttribute: vi.fn(),
        click: clickSpy,
        style: { visibility: "" },
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, "createElement").mockReturnValue(mockLink);

      // Mock document.body methods
      vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
      vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should create a blob with CSV content", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      expect(createObjectURLSpy).toHaveBeenCalled();
      const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe("text/csv;charset=utf-8;");
    });

    it("should create a download link with correct filename", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      const mockLink = document.createElement("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        "href",
        "blob:mock-url",
      );
      expect(mockLink.setAttribute).toHaveBeenCalledWith("download", filename);
    });

    it("should trigger download by clicking the link", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      const mockLink = document.createElement("a");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("should set link visibility to hidden", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      const mockLink = document.createElement("a") as HTMLAnchorElement & {
        style: { visibility: string };
      };
      expect(mockLink.style.visibility).toBe("hidden");
    });

    it("should clean up by removing the link from DOM", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it("should revoke object URL after download", () => {
      const csvContent = "name,age\nJohn,30";
      const filename = "test.csv";

      downloadCSV(csvContent, filename);

      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should clean up when the browser rejects the download click", () => {
      clickSpy.mockImplementationOnce(() => {
        throw new Error("download rejected");
      });

      expect(() => downloadCSV("data", "test.csv")).toThrow(
        "download rejected",
      );
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should handle different filenames", () => {
      const csvContent = "data";
      const filename = "export-2024-01-01.csv";

      downloadCSV(csvContent, filename);

      const mockLink = document.createElement("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith("download", filename);
    });

    it("should handle empty CSV content", () => {
      const csvContent = "";
      const filename = "empty.csv";

      downloadCSV(csvContent, filename);

      expect(createObjectURLSpy).toHaveBeenCalled();
      const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob;
      // UTF-8 BOM is retained even for an empty data set so Excel detects
      // Unicode reliably.
      expect(blobArg.size).toBeGreaterThan(0);
    });
  });
});
