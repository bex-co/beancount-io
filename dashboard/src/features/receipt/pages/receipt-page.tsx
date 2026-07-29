import { useParams } from "@tanstack/react-router";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { PageHeader } from "@/common/components/page-header";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useReceiptWorkflow } from "../hooks/use-receipt-workflow";
import { ReceiptUploadZone } from "../components/receipt-upload-zone";
import { ReceiptReviewForm } from "../components/receipt-review-form";
import { ReceiptSuccessCard } from "../components/receipt-success-card";

export default function ReceiptPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/receipt",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { primaryCurrency } = useLedger();
  const workflow = useReceiptWorkflow(ledgerId);
  const { state } = workflow;
  const { t } = useTranslations();

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        className="space-y-1"
        title={t("receipt.page.title")}
        description={t("receipt.page.description")}
      />

      {(state.step === "idle" || state.step === "uploading") && (
        <ReceiptUploadZone
          onFileAccepted={(file) => void workflow.startUpload(file)}
          isUploading={state.step === "uploading"}
        />
      )}

      {state.step === "parsing" && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium">{t("receipt.page.parsing")}</p>
          <p className="text-xs text-muted-foreground">
            {t("receipt.page.parsingHint")}
          </p>
        </div>
      )}

      {(state.step === "review" || state.step === "submitting") && (
        <ReceiptReviewForm
          ledgerId={ledgerId}
          parsed={state.parsed}
          primaryCurrency={primaryCurrency}
          onSubmit={(data) => workflow.submit(data)}
          onReset={workflow.reset}
          isSubmitting={state.step === "submitting"}
        />
      )}

      {state.step === "success" && (
        <ReceiptSuccessCard
          formData={state.formData}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          onReset={workflow.reset}
        />
      )}

      {state.step === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("receipt.page.errorTitle")}</AlertTitle>
          <AlertDescription className="space-y-3 mt-2">
            <p>{state.message}</p>
            <Button variant="outline" size="sm" onClick={workflow.reset}>
              {t("receipt.page.tryAgain")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
