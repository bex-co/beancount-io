import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImportWorkflow } from "../use-import-workflow";
import type { CSVParseResult } from "../../types";

const mockParseResult: CSVParseResult = {
  rows: [
    {
      date: "2024-01-15",
      payee: "Starbucks",
      description: "Morning coffee",
      amount: 5.5,
    },
  ],
  validCount: 1,
  errorCount: 0,
  hasErrors: false,
};

describe("useImportWorkflow", () => {
  describe("initial state", () => {
    it("should start at the upload step", () => {
      const { result } = renderHook(() => useImportWorkflow());
      expect(result.current.currentStep).toBe("upload");
    });

    it("should have null parseResult initially", () => {
      const { result } = renderHook(() => useImportWorkflow());
      expect(result.current.parseResult).toBeNull();
    });

    it("should expose all expected callbacks", () => {
      const { result } = renderHook(() => useImportWorkflow());
      expect(typeof result.current.handleFileParsed).toBe("function");
      expect(typeof result.current.handleContinueToConfig).toBe("function");
      expect(typeof result.current.handleBack).toBe("function");
      expect(typeof result.current.handleResultChange).toBe("function");
      expect(typeof result.current.moveToFinish).toBe("function");
      expect(typeof result.current.resetToUpload).toBe("function");
    });
  });

  describe("handleFileParsed", () => {
    it("should advance to the preview step", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => {
        result.current.handleFileParsed(mockParseResult);
      });

      expect(result.current.currentStep).toBe("preview");
    });

    it("should store the parse result", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => {
        result.current.handleFileParsed(mockParseResult);
      });

      expect(result.current.parseResult).toEqual(mockParseResult);
    });
  });

  describe("handleContinueToConfig", () => {
    it("should advance from preview to configure", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());

      expect(result.current.currentStep).toBe("configure");
    });

    it("should preserve the parse result when moving to configure", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());

      expect(result.current.parseResult).toEqual(mockParseResult);
    });
  });

  describe("handleBack", () => {
    it("should go from preview back to upload and clear the parse result", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      expect(result.current.currentStep).toBe("preview");

      act(() => result.current.handleBack());

      expect(result.current.currentStep).toBe("upload");
      expect(result.current.parseResult).toBeNull();
    });

    it("should go from configure back to preview", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());
      expect(result.current.currentStep).toBe("configure");

      act(() => result.current.handleBack());

      expect(result.current.currentStep).toBe("preview");
    });

    it("should not change step when already at upload", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleBack());

      expect(result.current.currentStep).toBe("upload");
    });

    it("should keep parse result intact when going from configure back to preview", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());
      act(() => result.current.handleBack());

      expect(result.current.parseResult).toEqual(mockParseResult);
    });
  });

  describe("handleResultChange", () => {
    it("should update the parse result", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));

      const updatedResult: CSVParseResult = {
        ...mockParseResult,
        rows: [
          {
            date: "2024-02-01",
            payee: "Amazon",
            description: "Books",
            amount: 29.99,
          },
        ],
        validCount: 1,
      };

      act(() => result.current.handleResultChange(updatedResult));

      expect(result.current.parseResult).toEqual(updatedResult);
    });

    it("should not change the current step", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleResultChange({ ...mockParseResult }));

      expect(result.current.currentStep).toBe("preview");
    });
  });

  describe("moveToFinish", () => {
    it("should advance to the finish step", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());
      act(() => result.current.moveToFinish());

      expect(result.current.currentStep).toBe("finish");
    });
  });

  describe("resetToUpload", () => {
    it("should reset the step to upload", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());
      act(() => result.current.resetToUpload());

      expect(result.current.currentStep).toBe("upload");
    });

    it("should clear the parse result", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.resetToUpload());

      expect(result.current.parseResult).toBeNull();
    });

    it("should reset from any step", () => {
      const { result } = renderHook(() => useImportWorkflow());

      // Reach the finish step
      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());
      act(() => result.current.moveToFinish());
      expect(result.current.currentStep).toBe("finish");

      act(() => result.current.resetToUpload());

      expect(result.current.currentStep).toBe("upload");
      expect(result.current.parseResult).toBeNull();
    });
  });

  describe("full workflow", () => {
    it("should support the complete upload → preview → configure → finish flow", () => {
      const { result } = renderHook(() => useImportWorkflow());

      expect(result.current.currentStep).toBe("upload");

      act(() => result.current.handleFileParsed(mockParseResult));
      expect(result.current.currentStep).toBe("preview");

      act(() => result.current.handleContinueToConfig());
      expect(result.current.currentStep).toBe("configure");

      act(() => result.current.moveToFinish());
      expect(result.current.currentStep).toBe("finish");
    });

    it("should support navigating back then forward again", () => {
      const { result } = renderHook(() => useImportWorkflow());

      act(() => result.current.handleFileParsed(mockParseResult));
      act(() => result.current.handleContinueToConfig());

      // Go back to preview
      act(() => result.current.handleBack());
      expect(result.current.currentStep).toBe("preview");

      // Advance again
      act(() => result.current.handleContinueToConfig());
      expect(result.current.currentStep).toBe("configure");
    });
  });
});
