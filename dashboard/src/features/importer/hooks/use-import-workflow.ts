import { useState, useCallback } from "react";
import type { ImportStep, CSVParseResult } from "../types";
import type { ImportConfigDraft } from "../lib/import-config-draft";

export type UseImportWorkflowReturn = {
  currentStep: ImportStep;
  parseResult: CSVParseResult | null;
  configDraft: ImportConfigDraft | null;
  handleFileParsed: (result: CSVParseResult) => void;
  handleContinueToConfig: () => void;
  handleBack: () => void;
  handleResultChange: (result: CSVParseResult) => void;
  setConfigDraft: (draft: ImportConfigDraft) => void;
  moveToFinish: () => void;
  resetToUpload: () => void;
};

/**
 * Hook to manage the import workflow state and transitions.
 * Configuration draft survives Configure ↔ Preview; it clears on a new file
 * or a finished/reset workflow.
 */
export function useImportWorkflow(): UseImportWorkflowReturn {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [configDraft, setConfigDraftState] = useState<ImportConfigDraft | null>(
    null,
  );

  const handleFileParsed = useCallback((result: CSVParseResult) => {
    setParseResult(result);
    setConfigDraftState(null);
    setCurrentStep("preview");
  }, []);

  const handleContinueToConfig = useCallback(() => {
    setCurrentStep("configure");
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((current) => {
      if (current === "preview") {
        setParseResult(null);
        setConfigDraftState(null);
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

  const setConfigDraft = useCallback((draft: ImportConfigDraft) => {
    setConfigDraftState(draft);
  }, []);

  const moveToFinish = useCallback(() => {
    setCurrentStep("finish");
  }, []);

  const resetToUpload = useCallback(() => {
    setCurrentStep("upload");
    setParseResult(null);
    setConfigDraftState(null);
  }, []);

  return {
    currentStep,
    parseResult,
    configDraft,
    handleFileParsed,
    handleContinueToConfig,
    handleBack,
    handleResultChange,
    setConfigDraft,
    moveToFinish,
    resetToUpload,
  };
}
