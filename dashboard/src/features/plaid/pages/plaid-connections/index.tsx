import { Building2, ChevronLeft, Loader2, Plus } from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Separator } from "@/common/components/ui/separator";
import { useTranslations } from "@/common/hooks/use-translations";
import { usePlaidConnection } from "../plaid-settings/hooks/use-plaid-connection";
import { usePlaidItems } from "../../hooks/use-plaid-accounts";
import { BankItem } from "./components/bank-item";
import {
  PlaidLoadingState,
  PlaidErrorState,
} from "../../components/plaid-states";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { createLedgerId } from "@/common/lib/utils/encode";

function ConnectBankButton({
  ledgerId,
  hasConnections,
}: {
  ledgerId: string;
  hasConnections: boolean;
}) {
  const { t } = useTranslations();
  const { connect, isLoading, isSuccess, loadingMessage } = usePlaidConnection({
    ledgerId,
  });

  return (
    <Button
      onClick={connect}
      disabled={isLoading || isSuccess}
      variant={isSuccess ? "default" : "outline"}
      size="default"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingMessage}
        </>
      ) : isSuccess ? (
        <>{t("plaid.connectedSuccessfully")}</>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          {hasConnections
            ? t("plaid.management.connectAnother")
            : t("plaid.management.connectBank")}
        </>
      )}
    </Button>
  );
}

function NoConnectionsState() {
  const { t } = useTranslations();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t("plaid.management.noConnectionsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("plaid.management.noConnectionsDescription")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaidConnectionsPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/plaid-connections",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { items, loading, error, refetch } = usePlaidItems(ledgerId);

  if (loading) {
    return (
      <div className="container mx-auto">
        <LedgerPageSEO seoKey="plaidConnections" noIndex />
        <PlaidLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto">
        <LedgerPageSEO seoKey="plaidConnections" noIndex />
        <PlaidErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8">
      <LedgerPageSEO seoKey="plaidConnections" noIndex />
      <div>
        <Link
          to="/ledger/$ledgerOwner/$ledgerName/link"
          params={{ ledgerOwner, ledgerName }}
        >
          <Button variant="ghost" size="sm" className="-ml-2 mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("plaid.management.backToTransactions")}
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("plaid.management.connectionsTitle")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("plaid.management.connectionsSubtitle")}
            </p>
          </div>
          <ConnectBankButton
            ledgerId={ledgerId}
            hasConnections={items.length > 0}
          />
        </div>
      </div>

      <Separator />

      {items.length === 0 ? (
        <NoConnectionsState />
      ) : (
        <div className="space-y-8">
          {items.map((item) => (
            <BankItem key={item.id} item={item} ledgerId={ledgerId} />
          ))}
        </div>
      )}
    </div>
  );
}
