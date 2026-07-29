import { useNavigate } from "@tanstack/react-router";
import {
  UploadStep,
  PreviewStep,
  ConfigureStep,
  ImportingStep,
  FinishStep,
} from "./steps";
import { useImportWorkflow } from "../hooks/use-import-workflow";
import { useImportSubmit } from "../hooks/use-import-submit";
import type { ImportTransaction } from "../types";

type ImportWorkflowContainerProps = {
  ledgerId: string;
  ledgerOwner: string;
  ledgerName: string;
};

/**
 * Container component that manages all import workflow logic, state, and rendering
 * Orchestrates hooks and renders all 5 steps based on current state
 */
export function ImportWorkflowContainer({
  ledgerId,
  ledgerOwner,
  ledgerName,
}: ImportWorkflowContainerProps) {
  const navigate = useNavigate();

  // Hooks
  const workflow = useImportWorkflow();
  const { submitImport, importResult, isSubmitting } =
    useImportSubmit(ledgerId);

  // Handlers
  const handleSubmit = async (transactions: ImportTransaction[]) => {
    await submitImport(transactions);
    workflow.moveToFinish();
  };

  const handleFinish = () => {
    void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}/journal` });
  };

  const handleResetToUpload = () => {
    workflow.resetToUpload();
  };

  // Upload Step (includes parsing progress and error states)
  if (workflow.currentStep === "upload") {
    return <UploadStep onParseComplete={workflow.handleFileParsed} />;
  }

  // Preview Step
  if (workflow.currentStep === "preview" && workflow.parseResult) {
    return (
      <PreviewStep
        parseResult={workflow.parseResult}
        onContinue={workflow.handleContinueToConfig}
        onBack={workflow.handleBack}
        onResultChange={workflow.handleResultChange}
      />
    );
  }

  // Configure Step
  if (workflow.currentStep === "configure" && workflow.parseResult) {
    return (
      <ConfigureStep
        parseResult={workflow.parseResult}
        ledgerId={ledgerId}
        onSubmit={handleSubmit}
        onBack={workflow.handleBack}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Importing Step
  if (workflow.currentStep === "importing") {
    return <ImportingStep />;
  }

  // Finish Step
  if (workflow.currentStep === "finish" && importResult) {
    return (
      <FinishStep
        importResult={importResult}
        onFinish={handleFinish}
        onImportMore={handleResetToUpload}
      />
    );
  }

  // Fallback (should not reach here)
  return null;
}
