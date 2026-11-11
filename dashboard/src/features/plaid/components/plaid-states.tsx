import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useTranslations } from "@/common/hooks/use-translations";
import { decodeLedgerId } from "@/common/lib/utils/encode";

export function PlaidPage({
  ledgerId,
  children,
}: {
  ledgerId: string;
  children: ReactNode;
}) {
  const { t } = useTranslations();
  const { isAdmin } = useLedgerPermission();

  return (
    <div className="space-y-6">
      <PageHeader
        showOnMobile
        title={t("plaid.pageTitle")}
        description={t("plaid.management.connectionsSubtitle")}
      />
      {isAdmin ? children : <PlaidAccessNotice ledgerId={ledgerId} />}
    </div>
  );
}

export function PlaidAccessNotice({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

  return (
    <>
      <Card>
        <CardContent>
          <p role="status" className="text-sm text-muted-foreground">
            {t("plaid.access.adminOnly")}
          </p>
        </CardContent>
      </Card>
      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.import"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/import`,
          },
        ]}
      />
    </>
  );
}

export function PlaidLoadingState() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaidErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslations();
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h3 className="font-semibold text-lg">
            {t("common.failedToLoadData")}
          </h3>
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("page.dashboard.retry")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaidNotFoundState() {
  const { t } = useTranslations();
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground mt-4">
            {t("plaid.institutionNotFound")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
