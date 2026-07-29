import { describe, it, expect } from "vitest";
import type { BeancountError } from "@/graphql/definitions";

// Mock Monaco types and constants for testing
const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

interface IMarkerData {
  severity: number;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  source?: string;
}

const monaco = {
  MarkerSeverity,
  editor: {
    MarkerSeverity,
  },
};

/**
 * Mock beancountErrorsToMarkers function for testing
 * This is extracted from the component for unit testing purposes
 */
const beancountErrorsToMarkers = (
  errors: BeancountError[],
  monacoInstance: typeof monaco,
): IMarkerData[] => {
  return errors
    .filter((error) => error.lineno != null)
    .map((error) => ({
      severity: monacoInstance.MarkerSeverity.Error,
      startLineNumber: error.lineno!,
      startColumn: 1,
      endLineNumber: error.lineno!,
      endColumn: Number.MAX_VALUE,
      message: error.message,
      source: "beancount",
    }));
};

/**
 * Mock filterErrorsForFile function for testing
 * This is extracted from the component for unit testing purposes
 */
const filterErrorsForFile = (
  errors: BeancountError[],
  filePath: string,
): BeancountError[] => {
  return errors.filter((error) => error.filename === filePath);
};

describe("Ledger File View - Error Markers", () => {
  describe("beancountErrorsToMarkers", () => {
    it("should transform a single error to Monaco marker format", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 10,
          message: "Invalid transaction syntax",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers).toHaveLength(1);
      expect(markers[0]).toEqual({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: 10,
        startColumn: 1,
        endLineNumber: 10,
        endColumn: Number.MAX_VALUE,
        message: "Invalid transaction syntax",
        source: "beancount",
      });
    });

    it("should transform multiple errors to Monaco markers", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 10,
          message: "Error 1",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 20,
          message: "Error 2",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 30,
          message: "Error 3",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers).toHaveLength(3);
      expect(markers[0].startLineNumber).toBe(10);
      expect(markers[1].startLineNumber).toBe(20);
      expect(markers[2].startLineNumber).toBe(30);
    });

    it("should filter out errors without line numbers", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 10,
          message: "Valid error",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: null,
          message: "Error without line number",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 20,
          message: "Another valid error",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers).toHaveLength(2);
      expect(markers[0].message).toBe("Valid error");
      expect(markers[1].message).toBe("Another valid error");
    });

    it("should handle empty error array", () => {
      const errors: BeancountError[] = [];
      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers).toHaveLength(0);
    });

    it("should handle all errors having null line numbers", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: null,
          message: "Error 1",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: null,
          message: "Error 2",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers).toHaveLength(0);
    });

    it("should set correct severity level (Error)", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 5,
          message: "Test error",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].severity).toBe(monaco.MarkerSeverity.Error);
      expect(markers[0].severity).toBe(8); // MarkerSeverity.Error = 8
    });

    it("should set source as 'beancount'", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 1,
          message: "Test",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].source).toBe("beancount");
    });

    it("should handle long error messages", () => {
      const longMessage =
        "This is a very long error message that contains detailed information about what went wrong in the beancount file and why the parser failed to process this particular line.";

      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 15,
          message: longMessage,
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].message).toBe(longMessage);
    });

    it("should handle errors at line 1", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 1,
          message: "Error at first line",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].startLineNumber).toBe(1);
      expect(markers[0].endLineNumber).toBe(1);
    });

    it("should handle errors at large line numbers", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 9999,
          message: "Error at large line number",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].startLineNumber).toBe(9999);
    });

    it("should set column range from 1 to MAX_VALUE", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 10,
          message: "Test",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].startColumn).toBe(1);
      expect(markers[0].endColumn).toBe(Number.MAX_VALUE);
    });

    it("should preserve error order", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 50,
          message: "First",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 10,
          message: "Second",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 30,
          message: "Third",
        },
      ];

      const markers = beancountErrorsToMarkers(errors, monaco);

      expect(markers[0].message).toBe("First");
      expect(markers[1].message).toBe("Second");
      expect(markers[2].message).toBe("Third");
    });
  });

  describe("filterErrorsForFile", () => {
    it("should filter errors for a specific file", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 10,
          message: "Error in main",
        },
        {
          __typename: "BeancountError",
          filename: "accounts.beancount",
          lineno: 5,
          message: "Error in accounts",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 20,
          message: "Another error in main",
        },
      ];

      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(2);
      expect(filtered[0].message).toBe("Error in main");
      expect(filtered[1].message).toBe("Another error in main");
    });

    it("should return empty array when no errors match the file", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 10,
          message: "Error in main",
        },
        {
          __typename: "BeancountError",
          filename: "accounts.beancount",
          lineno: 5,
          message: "Error in accounts",
        },
      ];

      const filtered = filterErrorsForFile(errors, "transactions.beancount");

      expect(filtered).toHaveLength(0);
    });

    it("should handle empty error array", () => {
      const errors: BeancountError[] = [];
      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(0);
    });

    it("should handle errors with null filenames", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 10,
          message: "Valid error",
        },
        {
          __typename: "BeancountError",
          filename: null,
          lineno: 20,
          message: "Error without filename",
        },
      ];

      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe("Valid error");
    });

    it("should be case-sensitive for filenames", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "Main.beancount",
          lineno: 10,
          message: "Error in Main",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 20,
          message: "Error in main",
        },
      ];

      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe("Error in main");
    });

    it("should handle paths with directories", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "ledger/main.beancount",
          lineno: 10,
          message: "Error 1",
        },
        {
          __typename: "BeancountError",
          filename: "ledger/accounts.beancount",
          lineno: 5,
          message: "Error 2",
        },
        {
          __typename: "BeancountError",
          filename: "ledger/main.beancount",
          lineno: 15,
          message: "Error 3",
        },
      ];

      const filtered = filterErrorsForFile(errors, "ledger/main.beancount");

      expect(filtered).toHaveLength(2);
      expect(filtered[0].message).toBe("Error 1");
      expect(filtered[1].message).toBe("Error 3");
    });

    it("should not match partial filenames", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 10,
          message: "Error in main",
        },
        {
          __typename: "BeancountError",
          filename: "main_backup.beancount",
          lineno: 20,
          message: "Error in backup",
        },
      ];

      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe("Error in main");
    });

    it("should handle all errors for the same file", () => {
      const errors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 1,
          message: "Error 1",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 2,
          message: "Error 2",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 3,
          message: "Error 3",
        },
      ];

      const filtered = filterErrorsForFile(errors, "main.beancount");

      expect(filtered).toHaveLength(3);
    });
  });

  describe("Integration - Filtering and Transforming", () => {
    it("should filter errors for a file and transform to markers", () => {
      const allErrors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 10,
          message: "Error in main line 10",
        },
        {
          __typename: "BeancountError",
          filename: "accounts.beancount",
          lineno: 5,
          message: "Error in accounts",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: 20,
          message: "Error in main line 20",
        },
        {
          __typename: "BeancountError",
          filename: "main.beancount",
          lineno: null,
          message: "Error without line number",
        },
      ];

      // Filter for main.beancount
      const filteredErrors = filterErrorsForFile(allErrors, "main.beancount");

      // Transform to markers
      const markers = beancountErrorsToMarkers(filteredErrors, monaco);

      // Should have 2 markers (third error filtered out due to null lineno)
      expect(markers).toHaveLength(2);
      expect(markers[0].startLineNumber).toBe(10);
      expect(markers[0].message).toBe("Error in main line 10");
      expect(markers[1].startLineNumber).toBe(20);
      expect(markers[1].message).toBe("Error in main line 20");
    });

    it("should handle the complete workflow with no matching errors", () => {
      const allErrors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "accounts.beancount",
          lineno: 5,
          message: "Error in accounts",
        },
      ];

      const filteredErrors = filterErrorsForFile(allErrors, "main.beancount");
      const markers = beancountErrorsToMarkers(filteredErrors, monaco);

      expect(markers).toHaveLength(0);
    });

    it("should handle the complete workflow with mixed valid and invalid errors", () => {
      const allErrors: BeancountError[] = [
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 1,
          message: "Valid error 1",
        },
        {
          __typename: "BeancountError",
          filename: "other.beancount",
          lineno: 2,
          message: "Wrong file",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: null,
          message: "No line number",
        },
        {
          __typename: "BeancountError",
          filename: "test.beancount",
          lineno: 3,
          message: "Valid error 2",
        },
      ];

      const filteredErrors = filterErrorsForFile(allErrors, "test.beancount");
      const markers = beancountErrorsToMarkers(filteredErrors, monaco);

      expect(markers).toHaveLength(2);
      expect(markers[0].message).toBe("Valid error 1");
      expect(markers[1].message).toBe("Valid error 2");
    });
  });
});
