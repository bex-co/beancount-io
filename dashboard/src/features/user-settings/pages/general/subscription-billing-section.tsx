import { AlertCircle, Crown } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import type { GetSubscriptionStatusQuery } from "@/graphql/definitions";

export function BillingSection({
  subscriptions,
  t,
  portalLoading,
  cancelLoading,
  resumeLoading,
  onManageBilling,
  onCancelClick,
  onResumeClick,
}: {
  subscriptions: GetSubscriptionStatusQuery["subscriptionStatus"]["subscriptions"];
  t: (key: string) => string;
  portalLoading: boolean;
  cancelLoading: boolean;
  resumeLoading: boolean;
  onManageBilling: (clientId: string) => void;
  onCancelClick: (
    subscriptionId: string,
    clientId: string,
    endDate: string,
  ) => void;
  onResumeClick: (
    subscriptionId: string,
    clientId: string,
    renewalDate: string,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">
        {t("userSettings.billing")}
      </h4>
      {subscriptions.map((subscription) => {
        const product =
          subscription.items[0]?.product?.name || t("userSettings.unknownPlan");
        const price = subscription.items[0]?.price;
        const amount = price?.amount ? (price.amount / 100).toFixed(2) : "0.00";
        const currency =
          price?.currency === "usd"
            ? "$"
            : (price?.currency?.toUpperCase() ?? "$");
        const interval = price?.interval || "month";
        const endDate = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
          : "";
        const isCanceled = subscription.cancelAt || subscription.canceledAt;
        const cancelAt = subscription.cancelAt
          ? new Date(subscription.cancelAt).toLocaleDateString()
          : null;

        const statusVariant =
          subscription.status === "active"
            ? "outline"
            : subscription.status === "past_due" ||
                subscription.status === "unpaid"
              ? "secondary"
              : "destructive";
        const statusClass =
          subscription.status === "active"
            ? "border-green-500 text-green-700 dark:text-green-400"
            : subscription.status === "past_due" ||
                subscription.status === "unpaid"
              ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
              : "";

        return (
          <div key={subscription.id} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  {product}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currency}
                  {amount} / {interval}
                </p>
                <Badge
                  variant={statusVariant}
                  className={`text-xs capitalize ${statusClass}`}
                >
                  {subscription.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onManageBilling(subscription.clientId)}
                  disabled={portalLoading}
                >
                  {portalLoading
                    ? t("userSettings.opening")
                    : t("userSettings.manageBilling")}
                </Button>
                {isCanceled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onResumeClick(
                        subscription.id,
                        subscription.clientId,
                        endDate,
                      )
                    }
                    disabled={resumeLoading}
                  >
                    {resumeLoading
                      ? t("userSettings.resuming")
                      : t("userSettings.resumeSubscription")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      onCancelClick(
                        subscription.id,
                        subscription.clientId,
                        endDate,
                      )
                    }
                    disabled={cancelLoading}
                  >
                    {t("userSettings.cancelSubscription")}
                  </Button>
                )}
              </div>
            </div>
            {isCanceled ? (
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-0.5">
                  <p className="font-medium">
                    {t("userSettings.subscriptionCanceled")}
                  </p>
                  {cancelAt && (
                    <p>
                      {t("userSettings.accessUntil")}{" "}
                      <strong>{cancelAt}</strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              subscription.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  {t("userSettings.renewsOn")} <strong>{endDate}</strong>
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
