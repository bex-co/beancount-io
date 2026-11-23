import { useLayoutEffect, useRef, type ReactNode } from "react";
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

  const workflow = useImportWorkflow();
  const { submitImport, importResult, isSubmitting } =
    useImportSubmit(ledgerId);
  const { currentStep } = workflow;
  const stepContainer = useRef<HTMLDivElement>(null);
  const previousStep = useRef(currentStep);

  // The previous step's controls unmount, so place focus at the new title.
  useLayoutEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    stepContainer.current
      ?.querySelector<HTMLElement>('h2[tabindex="-1"]')
      ?.focus();
  }, [currentStep]);

  // Handlers
  const handleSubmit = async (transactions: ImportTransaction[]) => {
    await submitImport(transactions);
    workflow.moveToFinish();
  };

  const handleFinish = () => {
    void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}/journal` });
  };

  let step: ReactNode = null;
  if (currentStep === "upload") {
    step = <UploadStep onParseComplete={workflow.handleFileParsed} />;
  } else if (currentStep === "preview" && workflow.parseResult) {
    step = (
      <PreviewStep
        parseResult={workflow.parseResult}
        onContinue={workflow.handleContinueToConfig}
        onBack={workflow.handleBack}
        onResultChange={workflow.handleResultChange}
      />
    );
  } else if (currentStep === "configure" && workflow.parseResult) {
    step = (
      <ConfigureStep
        parseResult={workflow.parseResult}
        ledgerId={ledgerId}
        configDraft={workflow.configDraft}
        onConfigDraftChange={workflow.setConfigDraft}
        onSubmit={handleSubmit}
        onBack={workflow.handleBack}
        isSubmitting={isSubmitting}
      />
    );
  } else if (currentStep === "importing") {
    step = <ImportingStep />;
  } else if (currentStep === "finish" && importResult) {
    step = (
      <FinishStep
        importResult={importResult}
        onFinish={handleFinish}
        onImportMore={workflow.resetToUpload}
      />
    );
  }

  return (
    <div ref={stepContainer} className="space-y-6">
      {step}
    </div>
  );
}
