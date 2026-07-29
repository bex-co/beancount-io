import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/common/components/ui/button";
import { Card } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ReviewFormData } from "../hooks/use-receipt-workflow";

interface ReceiptSuccessCardProps {
  formData: ReviewFormData;
  ledgerOwner: string;
  ledgerName: string;
  onReset: () => void;
}

export function ReceiptSuccessCard({
  formData,
  ledgerOwner,
  ledgerName,
  onReset,
}: ReceiptSuccessCardProps) {
  const { t } = useTranslations();

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">
            {t("receipt.success.title")}
          </h3>
          <p className="text-base text-muted-foreground">
            {t("receipt.success.description")}
          </p>
        </div>

        <dl className="w-full max-w-sm rounded-lg bg-muted/50 px-4 py-3 text-sm text-left space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">
              {t("receipt.success.payee")}
            </dt>
            <dd className="font-medium truncate">{formData.payee}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">
              {t("receipt.success.date")}
            </dt>
            <dd className="font-medium">
              {format(formData.date, "MMM d, yyyy")}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">
              {t("receipt.success.amount")}
            </dt>
            <dd className="font-mono font-medium">
              {formData.amount} {formData.currency}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">
              {t("receipt.success.expense")}
            </dt>
            <dd className="font-mono text-xs truncate">
              {formData.expenseAccount}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">
              {t("receipt.success.payment")}
            </dt>
            <dd className="font-mono text-xs truncate">
              {formData.paymentAccount}
            </dd>
          </div>
        </dl>

        <div className="flex gap-3">
          <Button asChild>
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/journal"
              params={{ ledgerOwner, ledgerName }}
            >
              {t("receipt.success.viewJournal")}
            </Link>
          </Button>
          <Button variant="outline" onClick={onReset}>
            {t("receipt.success.uploadAnother")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
