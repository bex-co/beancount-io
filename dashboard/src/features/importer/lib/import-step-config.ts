import type { ImportStep, ImportResult } from "../types";

export type StepConfig = {
  step: number;
  label: string;
  description: string;
};

const STEP_CONFIGS: Record<ImportStep, StepConfig> = {
  upload: {
    step: 1,
    label: "Upload",
    description: "Upload file",
  },
  preview: {
    step: 2,
    label: "Preview",
    description: "Review data",
  },
  configure: {
    step: 3,
    label: "Configure",
    description: "Configure accounts",
  },
  importing: {
    step: 4,
    label: "Importing",
    description: "Importing transactions...",
  },
  finish: {
    step: 5,
    label: "Finish",
    description: "Import complete!",
  },
};

/**
 * Get the numeric step number for a given step
 */
export function getStepNumber(step: ImportStep): number {
  return STEP_CONFIGS[step].step;
}

/**
 * Get the label for a given step
 */
export function getStepLabel(step: ImportStep): string {
  return STEP_CONFIGS[step].label;
}

/**
 * Get the description for a given step
 */
export function getStepDescription(
  step: ImportStep,
  importResult?: ImportResult | null,
): string {
  if (step === "finish" && importResult) {
    return importResult.success
      ? "Import complete!"
      : "Import completed with errors";
  }
  return STEP_CONFIGS[step].description;
}

/**
 * Check if a step is completed given the current step
 */
export function isStepCompleted(
  stepToCheck: ImportStep,
  currentStep: ImportStep,
): boolean {
  const stepNumber = getStepNumber(stepToCheck);
  const currentNumber = getStepNumber(currentStep);
  return stepNumber < currentNumber;
}

/**
 * Get all step keys in order
 */
export function getAllSteps(): ImportStep[] {
  return ["upload", "preview", "configure", "importing", "finish"];
}
