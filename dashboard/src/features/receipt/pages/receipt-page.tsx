import { useParams } from "@tanstack/react-router";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { RelatedLinks } from "@/common/components/related-links";
import { LedgerWriteAccessNotice } from "@/common/components/ledger-write-access-notice";
import { getLedgerFilesRootPath } from "@/common/hooks/use-file-navigate";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useReceiptWorkflow } from "../hooks/use-receipt-workflow";
import { ReceiptUploadZone } from "../components/receipt-upload-zone";
import { ReceiptReviewForm } from "../components/receipt-review-form";
import { ReceiptSuccessCard } from "../components/receipt-success-card";

export default function ReceiptPage() {
  const { t } = useTranslations();
  const { canWrite } = useLedgerPermission();

  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      <LedgerPageHeading
        title={t("receipt.page.title")}
        description={t("receipt.page.description")}
      />
      {canWrite ? <ReceiptWorkflow /> : <ReadOnlyReceiptPage />}
    </LedgerPage>
  );
}

function ReadOnlyReceiptPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/receipt",
  });

  return (
    <>
      <LedgerWriteAccessNotice
        title={t("receipt.access.title")}
        signedOut={t("receipt.access.signedOut")}
        readOnly={t("receipt.access.readOnly")}
        unresolved={t("receipt.access.unresolved")}
      />
      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.files"),
            to: getLedgerFilesRootPath(ledgerOwner, ledgerName),
          },
          {
            label: t("common.relatedLinks.query"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/query`,
          },
        ]}
      />
    </>
  );
}

// Mounted only for writers, so a reader never starts an upload it cannot book.
function ReceiptWorkflow() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/receipt",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { primaryCurrency } = useLedger();
  const workflow = useReceiptWorkflow(ledgerId);
  const { state } = workflow;
  const { t } = useTranslations();

  return (
    <>
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

      {state.step === "review" && (
        <ReceiptReviewForm
          ledgerId={ledgerId}
          parsed={state.parsed}
          primaryCurrency={primaryCurrency}
          onSubmit={(data) => workflow.submit(data)}
          onReset={workflow.reset}
          error={state.error}
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
            <p className="break-words">{state.message}</p>
            {/* The message names what the operator must configure; another
                upload would be refused the same way. */}
            {!state.notConfigured && (
              <Button variant="outline" size="sm" onClick={workflow.reset}>
                {t("receipt.page.tryAgain")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
