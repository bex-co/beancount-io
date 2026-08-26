import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { StatementAmounts } from "./cash-flow-content";
import {
  filterCashAccountStatus,
  type CashAccountStatusRow,
} from "./lib/cash-account-status";

interface CashAccountStatusPanelProps {
  /** Joined CCE rows — exactly the accounts the statement counted as cash. */
  rows: CashAccountStatusRow[];
  primaryCurrency: string;
  /** fava showClosedAccounts option: initial visibility of closed accounts. */
  defaultShowClosed: boolean;
}

/**
 * "Cash & cash equivalents in this report" panel — the trust surface for
 * CCE classification: every cash account with open/closed status and its
 * closing balance. Closed, zero-balance accounts are hidden by default
 * (balance-sheet behavior) and revealable via the toggle. Accounts whose
 * `cash-flow-role` annotation was not a valid role carry a note; resolution
 * used the default heuristic for them.
 */
export function CashAccountStatusPanel({
  rows,
  primaryCurrency,
  defaultShowClosed,
}: CashAccountStatusPanelProps) {
  const { t, i18n } = useTranslations();
  const [showClosedOverride, setShowClosedOverride] = useState<boolean | null>(
    null,
  );
  const showClosed = showClosedOverride ?? defaultShowClosed;
  const visibleRows = filterCashAccountStatus(rows, showClosed);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.cashFlow.cashAccountsTitle")}</CardTitle>
        <CardDescription>
          {t("page.cashFlow.cashAccountsDescription")}
        </CardDescription>
        {hiddenCount > 0 || showClosed ? (
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClosedOverride(!showClosed)}
            >
              {showClosed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showClosed
                ? t("page.cashFlow.hideClosedAccounts")
                : t("page.cashFlow.showClosedAccounts")}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 pb-2 text-xs font-medium text-muted-foreground">
          <span className="flex-1">{t("page.cashFlow.accountColumn")}</span>
          <span>{t("page.cashFlow.statusColumn")}</span>
          <span className="text-right">{t("page.cashFlow.balanceColumn")}</span>
        </div>
        <div className="divide-y border-t">
          {visibleRows.map((row) => (
            <div
              key={row.account}
              className="flex items-center justify-between gap-4 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono break-all">
                  {row.account}
                </span>
                {row.invalidRoleValue !== undefined ? (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    {t("page.cashFlow.unknownCashFlowRole")}
                  </p>
                ) : null}
              </div>
              <Badge variant={row.closedAt ? "outline" : "secondary"}>
                {row.closedAt
                  ? t("page.cashFlow.accountClosed")
                  : t("page.cashFlow.accountOpen")}
              </Badge>
              <StatementAmounts
                amounts={row.balance as Record<string, string>}
                primaryCurrency={primaryCurrency}
                locale={i18n.language}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
