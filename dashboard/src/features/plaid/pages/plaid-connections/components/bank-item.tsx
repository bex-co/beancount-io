import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  PlugZap,
  SlidersHorizontal,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Separator } from "@/common/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { useToast } from "@/common/hooks/use-toast";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  useUnlinkItem,
  usePlaidItems,
} from "../../../hooks/use-plaid-accounts";
import { usePlaidReauth } from "../../plaid-settings/hooks/use-plaid-reauth";
import { usePlaidManageAccounts } from "../../plaid-settings/hooks/use-plaid-manage-accounts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import { AccountMappingForm } from "./account-mapping-form";
import type { PlaidItem } from "../../../types";

interface BankItemProps {
  item: PlaidItem;
  ledgerId: string;
}

export function BankItem({ item, ledgerId }: BankItemProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { unlinkItem, loading: unlinking } = useUnlinkItem();
  const { refetch: refetchItems } = usePlaidItems(ledgerId);

  // Reauthentication hook
  const { reconnect, isLoading: isReconnecting } = usePlaidReauth({
    itemId: item.id,
    ledgerId,
    onSuccess: async () => {
      // Refresh items to get updated status
      await refetchItems();
    },
  });

  // Add/remove accounts via Plaid's Account Select pane
  const { manageAccounts, isLoading: isManagingAccounts } =
    usePlaidManageAccounts({
      itemId: item.id,
      ledgerId,
      onSuccess: async () => {
        await refetchItems();
      },
    });

  // The link token is created fine on a broken item, but the /accounts/get that
  // follows would fail. Reconnect sits right next to this button.
  const canManageAccounts = item.status === "active";

  const handleUnlink = async () => {
    try {
      await unlinkItem(ledgerId, item.id);
      toast({
        title: t("plaid.institutionDetail.toast.bankDisconnected"),
        description: t(
          "plaid.institutionDetail.toast.bankDisconnectedDescription",
          {
            institutionName: item.institutionName,
          },
        ),
      });
    } catch {
      toast({
        title: t("plaid.institutionDetail.toast.error"),
        description: t("plaid.institutionDetail.toast.disconnectError"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {item.institutionName}
          </CardTitle>
          <div className="shrink-0">
            {item.status === "active" && (
              <Badge variant="secondary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("plaid.bankAccount.status.active")}
              </Badge>
            )}
            {item.status === "requires_reauth" && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t("plaid.bankAccount.status.reauthRequired")}
              </Badge>
            )}
            {item.status === "disabled" && (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground"
              >
                {t("plaid.bankAccount.status.disabled")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-row justify-between">
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>
                  {t("plaid.bankAccount.linkedOn", {
                    date: format(new Date(item.createdAt), "MMM d, yyyy"),
                  })}
                </span>
              </div>
              {item.lastSync && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    {t("plaid.institutionDetail.lastSynced")}{" "}
                    {formatDistanceToNow(new Date(item.lastSync.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                  {item.lastSync.status === "success" && (
                    <span className="font-medium">
                      •{" "}
                      {t("plaid.institutionDetail.transactionsCount", {
                        count: item.lastSync.transactionsAdded || 0,
                      })}
                    </span>
                  )}
                  {item.lastSync.status === "failed" && (
                    <span className="text-destructive font-medium">
                      • {t("plaid.institutionDetail.syncFailed")}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.status === "requires_reauth" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => void reconnect()}
                  disabled={isReconnecting}
                >
                  {isReconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      {t("plaid.institutionDetail.reconnecting")}
                    </>
                  ) : (
                    <>
                      <PlugZap className="mr-2 h-3.5 w-3.5" />
                      {t("plaid.institutionDetail.reconnectBank")}
                    </>
                  )}
                </Button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrapper keeps the tooltip reachable while the button is disabled */}
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void manageAccounts()}
                      disabled={isManagingAccounts || !canManageAccounts}
                    >
                      {isManagingAccounts ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          {t("plaid.accountMapping.manageAccountsLoading")}
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                          {t("plaid.accountMapping.manageAccounts")}
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {canManageAccounts
                    ? t("plaid.accountMapping.manageAccountsHint")
                    : t("plaid.accountMapping.manageAccountsRequiresReauth")}
                </TooltipContent>
              </Tooltip>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={unlinking}>
                    {unlinking ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        {t("plaid.institutionDetail.disconnecting")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {t("plaid.institutionDetail.disconnect")}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("plaid.institutionDetail.disconnectTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("plaid.institutionDetail.disconnectDescription", {
                        institutionName: item.institutionName,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={unlinking}>
                      {t("plaid.institutionDetail.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnlink}
                      disabled={unlinking}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {unlinking ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          {t("plaid.institutionDetail.disconnecting")}
                        </>
                      ) : (
                        t("plaid.institutionDetail.disconnect")
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {item.errorMessage && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{item.errorMessage}</span>
            </div>
          )}
        </div>

        <Separator />

        <AccountMappingForm
          itemId={item.id}
          ledgerId={ledgerId}
          onManageAccounts={
            canManageAccounts ? () => void manageAccounts() : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
