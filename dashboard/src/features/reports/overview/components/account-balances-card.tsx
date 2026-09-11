import { CreditCard, Landmark, ListTree } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useLedgerNavigateToAccount } from "@/common/hooks/use-ledger";
import { isCurrencyConversion } from "@/common/lib/ledger-search-params/conversion";
import type { ConversionOption } from "@/common/types/chart";
import {
  buildAccountBalanceRows,
  splitPresentationAmounts,
  type CurrencyAmount,
} from "../lib/overview-utils";
import { FormattedAmounts } from "./formatted-amounts";

function AccountRowAmounts({
  amounts,
  presentationCurrency,
  isConverting,
}: {
  amounts: CurrencyAmount[];
  presentationCurrency: string;
  isConverting: boolean;
}) {
  const { t } = useTranslations();
  const formatNumber = useFormatNumber();

  if (!isConverting) {
    return (
      <FormattedAmounts
        amounts={amounts}
        className="shrink-0 text-right text-sm font-medium"
      />
    );
  }

  const { headline, residual } = splitPresentationAmounts(
    amounts,
    presentationCurrency,
  );

  return (
    <span className="shrink-0 text-right">
      <FormattedAmounts
        amounts={headline ? [headline] : []}
        className="text-sm font-medium"
      />
      {residual.length > 0 && (
        <span className="block text-xs text-muted-foreground">
          {t("page.overview.notConvertedUnits", {
            units: residual
              .map(
                (amount) => `${formatNumber(amount.value)} ${amount.currency}`,
              )
              .join(", "),
          })}
        </span>
      )}
    </span>
  );
}

export function AccountBalancesCard({
  assets,
  liabilities,
  primaryCurrency,
  conversion,
  invertLiabilities,
  ledgerOwner,
  ledgerName,
}: {
  assets?: unknown;
  liabilities?: unknown;
  primaryCurrency: string;
  conversion: ConversionOption;
  invertLiabilities: boolean;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t } = useTranslations();
  const navigateToAccount = useLedgerNavigateToAccount();
  const presentationCurrency = isCurrencyConversion(conversion)
    ? conversion
    : primaryCurrency;
  const accounts = buildAccountBalanceRows({
    assets,
    liabilities,
    preferredCurrency: presentationCurrency,
    invertLiabilities,
  }).slice(0, 7);

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <CardTitle>{t("page.accounts.accounts")}</CardTitle>
        <CardDescription>
          {t("page.overview.accountsDescription")}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" asChild>
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/accounts"
              params={{ ledgerOwner, ledgerName }}
              aria-label={t("page.overview.viewAllAccounts")}
            >
              <ListTree className="size-4" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="divide-y px-0">
        {accounts.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {t("page.accounts.noAccountsFound")}
          </div>
        ) : (
          accounts.map((account) => (
            <button
              type="button"
              key={account.account}
              className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
              onClick={() => navigateToAccount(account.account)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-hover:scale-105">
                {account.kind === "asset" ? (
                  <Landmark className="size-4" />
                ) : (
                  <CreditCard className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {account.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {account.account}
                </span>
              </span>
              <AccountRowAmounts
                amounts={account.amounts}
                presentationCurrency={presentationCurrency}
                isConverting={isCurrencyConversion(conversion)}
              />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
