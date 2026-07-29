import { describe, it, expect } from "vitest";
import {
  getStepNumber,
  getStepLabel,
  getStepDescription,
  isStepCompleted,
  getAllSteps,
} from "../import-step-config";
import type { ImportResult } from "../../types";

const successResult: ImportResult = {
  success: true,
  message: "All done",
  successCount: 5,
  failureCount: 0,
};

const failureResult: ImportResult = {
  success: false,
  message: "Some errors occurred",
  successCount: 3,
  failureCount: 2,
};

describe("import-step-config", () => {
  describe("getStepNumber", () => {
    it("should return 1 for upload step", () => {
      expect(getStepNumber("upload")).toBe(1);
    });

    it("should return 2 for preview step", () => {
      expect(getStepNumber("preview")).toBe(2);
    });

    it("should return 3 for configure step", () => {
      expect(getStepNumber("configure")).toBe(3);
    });

    it("should return 4 for importing step", () => {
      expect(getStepNumber("importing")).toBe(4);
    });

    it("should return 5 for finish step", () => {
      expect(getStepNumber("finish")).toBe(5);
    });
  });

  describe("getStepLabel", () => {
    it("should return 'Upload' for upload step", () => {
      expect(getStepLabel("upload")).toBe("Upload");
    });

    it("should return 'Preview' for preview step", () => {
      expect(getStepLabel("preview")).toBe("Preview");
    });

    it("should return 'Configure' for configure step", () => {
      expect(getStepLabel("configure")).toBe("Configure");
    });

    it("should return 'Importing' for importing step", () => {
      expect(getStepLabel("importing")).toBe("Importing");
    });

    it("should return 'Finish' for finish step", () => {
      expect(getStepLabel("finish")).toBe("Finish");
    });
  });

  describe("getStepDescription", () => {
    it("should return default description for non-finish steps", () => {
      expect(getStepDescription("upload")).toBe("Upload file");
      expect(getStepDescription("preview")).toBe("Review data");
      expect(getStepDescription("configure")).toBe("Configure accounts");
      expect(getStepDescription("importing")).toBe("Importing transactions...");
    });

    it("should return default 'Import complete!' for finish step without importResult", () => {
      expect(getStepDescription("finish")).toBe("Import complete!");
    });

    it("should return 'Import complete!' for finish step with null importResult", () => {
      expect(getStepDescription("finish", null)).toBe("Import complete!");
    });

    it("should return 'Import complete!' for finish step with successful importResult", () => {
      expect(getStepDescription("finish", successResult)).toBe(
        "Import complete!",
      );
    });

    it("should return error message for finish step with failed importResult", () => {
      expect(getStepDescription("finish", failureResult)).toBe(
        "Import completed with errors",
      );
    });

    it("should ignore importResult for non-finish steps even when provided", () => {
      expect(getStepDescription("upload", successResult)).toBe("Upload file");
      expect(getStepDescription("preview", failureResult)).toBe("Review data");
    });
  });

  describe("isStepCompleted", () => {
    it("should return true when stepToCheck comes before currentStep", () => {
      expect(isStepCompleted("upload", "preview")).toBe(true);
      expect(isStepCompleted("upload", "finish")).toBe(true);
      expect(isStepCompleted("configure", "finish")).toBe(true);
    });

    it("should return false when stepToCheck equals currentStep", () => {
      expect(isStepCompleted("upload", "upload")).toBe(false);
      expect(isStepCompleted("finish", "finish")).toBe(false);
    });

    it("should return false when stepToCheck comes after currentStep", () => {
      expect(isStepCompleted("finish", "upload")).toBe(false);
      expect(isStepCompleted("preview", "upload")).toBe(false);
    });
  });

  describe("getAllSteps", () => {
    it("should return all 5 steps", () => {
      const steps = getAllSteps();
      expect(steps).toHaveLength(5);
    });

    it("should return steps in order", () => {
      const steps = getAllSteps();
      expect(steps).toEqual([
        "upload",
        "preview",
        "configure",
        "importing",
        "finish",
      ]);
    });

    it("should return step numbers in ascending order", () => {
      const steps = getAllSteps();
      const numbers = steps.map((s) => getStepNumber(s));
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
      }
    });
  });
});
