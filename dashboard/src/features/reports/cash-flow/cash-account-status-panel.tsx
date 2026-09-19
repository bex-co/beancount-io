import { Fragment, useState } from "react";
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

/**
 * An account name is a colon-separated path, and nothing in it is a word the
 * line breaker will split on its own: at 320px a name would otherwise wrap one
 * character at a time. Offer a break after each separator so the name wraps
 * into its own segments, and keep `break-words` on the parent as the fallback
 * for a single segment too long for the line.
 */
function AccountName({ account }: { account: string }) {
  const segments = account.split(":");
  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={`${segment}-${index}`}>
          {segment}
          {index < segments.length - 1 ? (
            <>
              :<wbr />
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

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
        {/* Three fields on one row leave the account only the width the badge
            and the amount do not need — 25px of 254px at 320px wide, which
            renders the name one character at a time. Below sm the account
            takes a line of its own and the status and balance share the next.
            From sm the header and every row are subgrids of one outer grid, so
            their columns are literally the same tracks and each header sits
            over the data it names instead of measuring its own label. */}
        <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4">
          <div className="hidden pb-2 text-xs font-medium text-muted-foreground sm:col-span-3 sm:grid sm:grid-cols-subgrid">
            <span>{t("page.cashFlow.accountColumn")}</span>
            <span>{t("page.cashFlow.statusColumn")}</span>
            <span className="text-right">
              {t("page.cashFlow.balanceColumn")}
            </span>
          </div>
          <div className="divide-y border-t sm:col-span-3 sm:grid sm:grid-cols-subgrid">
            {visibleRows.map((row) => (
              <div
                key={row.account}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2 sm:col-span-3 sm:grid-cols-subgrid sm:gap-x-0"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <span className="font-mono text-sm break-words">
                    <AccountName account={row.account} />
                  </span>
                  {row.invalidRoleValue !== undefined ? (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                      {t("page.cashFlow.unknownCashFlowRole")}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant={row.closedAt ? "outline" : "secondary"}
                  className="justify-self-start"
                >
                  {row.closedAt
                    ? t("page.cashFlow.accountClosed")
                    : t("page.cashFlow.accountOpen")}
                </Badge>
                <StatementAmounts
                  amounts={row.balance as Record<string, string>}
                  primaryCurrency={primaryCurrency}
                  locale={i18n.language}
                  className="justify-self-end"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
