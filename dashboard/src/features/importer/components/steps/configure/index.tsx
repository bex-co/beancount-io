import { TransactionConfigForm } from "./transaction-config-form";
import type { CSVParseResult, ImportTransaction } from "../../../types";

type ConfigureStepProps = {
  parseResult: CSVParseResult;
  ledgerId: string;
  onSubmit: (transactions: ImportTransaction[]) => void;
  onBack: () => void;
  isSubmitting: boolean;
};

/**
 * Step for configuring account mappings and transaction details
 */
export function ConfigureStep({
  parseResult,
  ledgerId,
  onSubmit,
  onBack,
  isSubmitting,
}: ConfigureStepProps) {
  return (
    <TransactionConfigForm
      rows={parseResult.rows}
      ledgerId={ledgerId}
      onSubmit={onSubmit}
      onBack={onBack}
      isSubmitting={isSubmitting}
    />
  );
}
