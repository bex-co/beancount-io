import { useState, useCallback } from "react";
import type { ImportStep, CSVParseResult } from "../types";

export type UseImportWorkflowReturn = {
  currentStep: ImportStep;
  parseResult: CSVParseResult | null;
  handleFileParsed: (result: CSVParseResult) => void;
  handleContinueToConfig: () => void;
  handleBack: () => void;
  handleResultChange: (result: CSVParseResult) => void;
  moveToFinish: () => void;
  resetToUpload: () => void;
};

/**
 * Hook to manage the import workflow state and transitions
 */
export function useImportWorkflow(): UseImportWorkflowReturn {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);

  const handleFileParsed = useCallback((result: CSVParseResult) => {
    setParseResult(result);
    setCurrentStep("preview");
  }, []);

  const handleContinueToConfig = useCallback(() => {
    setCurrentStep("configure");
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((current) => {
      if (current === "preview") {
        setParseResult(null);
        return "upload";
      } else if (current === "configure") {
        return "preview";
      }
      return current;
    });
  }, []);

  const handleResultChange = useCallback((updatedResult: CSVParseResult) => {
    setParseResult(updatedResult);
  }, []);

  const moveToFinish = useCallback(() => {
    setCurrentStep("finish");
  }, []);

  const resetToUpload = useCallback(() => {
    setCurrentStep("upload");
    setParseResult(null);
  }, []);

  return {
    currentStep,
    parseResult,
    handleFileParsed,
    handleContinueToConfig,
    handleBack,
    handleResultChange,
    moveToFinish,
    resetToUpload,
  };
}
