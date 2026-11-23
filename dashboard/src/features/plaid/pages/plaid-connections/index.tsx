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
  PlaidPage,
  PlaidAccessNotice,
} from "../../components/plaid-states";
import { isPlaidAccessError } from "../../utils/is-plaid-access-error";
import { createLedgerId, decodeLedgerId } from "@/common/lib/utils/encode";

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
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/plaid-connections",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);

  return (
    <PlaidPage ledgerId={ledgerId}>
      <PlaidConnectionsContent ledgerId={ledgerId} />
    </PlaidPage>
  );
}

function PlaidConnectionsContent({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
  const { items, loading, error, refetch } = usePlaidItems(ledgerId);

  if (loading) {
    return (
      <div className="container mx-auto">
        <PlaidLoadingState />
      </div>
    );
  }

  if (error) {
    if (isPlaidAccessError(error)) {
      return <PlaidAccessNotice ledgerId={ledgerId} />;
    }
    return (
      <div className="container mx-auto">
        <PlaidErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2">
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/link"
            params={{ ledgerOwner, ledgerName }}
          >
            <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("plaid.pageTitle")}
          </Link>
        </Button>
        <ConnectBankButton
          ledgerId={ledgerId}
          hasConnections={items.length > 0}
        />
      </div>

      <Separator />

      <h2 className="text-xl font-semibold">
        {t("plaid.management.connectionsTitle")}
      </h2>
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
