import { TransactionConfigForm } from "./transaction-config-form";
import type { CSVParseResult, ImportTransaction } from "../../../types";
import type { ImportConfigDraft } from "../../../lib/import-config-draft";

type ConfigureStepProps = {
  parseResult: CSVParseResult;
  ledgerId: string;
  configDraft: ImportConfigDraft | null;
  onConfigDraftChange: (draft: ImportConfigDraft) => void;
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
  configDraft,
  onConfigDraftChange,
  onSubmit,
  onBack,
  isSubmitting,
}: ConfigureStepProps) {
  return (
    <TransactionConfigForm
      rows={parseResult.rows}
      ledgerId={ledgerId}
      configDraft={configDraft}
      onConfigDraftChange={onConfigDraftChange}
      onSubmit={onSubmit}
      onBack={onBack}
      isSubmitting={isSubmitting}
    />
  );
}
