import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { ExternalLink } from "lucide-react";
import { type GetLedgerQuery } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value))
    return value.length === 0 ? "[]" : JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function FavaOptionsSection({
  ledger,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
}) {
  const { t, i18n } = useTranslations();
  const favaOptions = ledger.favaOptions;

  if (!favaOptions) return null;

  const localePrefix = i18n.language === "en" ? "" : `/${i18n.language}`;
  const favaOptionsDocUrl = `https://beancount.io${localePrefix}/docs/Basics/fava-options`;

  const optionEntries: { name: string; value: unknown }[] = [
    {
      name: "account_journal_include_children",
      value: favaOptions.accountJournalIncludeChildren,
    },
    { name: "auto_reload", value: favaOptions.autoReload },
    { name: "collapse_pattern", value: favaOptions.collapsePattern },
    { name: "conversion_currencies", value: favaOptions.conversionCurrencies },
    { name: "currency_column", value: favaOptions.currencyColumn },
    { name: "default_page", value: favaOptions.defaultPage },
    {
      name: "fiscal_year_end",
      value: `${favaOptions.fiscalYearEnd.month}/${favaOptions.fiscalYearEnd.day}`,
    },
    { name: "indent", value: favaOptions.indent },
    {
      name: "invert_income_liabilities_equity",
      value: favaOptions.invertIncomeLiabilitiesEquity,
    },
    { name: "language", value: favaOptions.language },
    { name: "locale", value: favaOptions.locale },
    {
      name: "show_accounts_with_zero_balance",
      value: favaOptions.showAccountsWithZeroBalance,
    },
    {
      name: "show_accounts_with_zero_transactions",
      value: favaOptions.showAccountsWithZeroTransactions,
    },
    { name: "show_closed_accounts", value: favaOptions.showClosedAccounts },
    { name: "sidebar_show_queries", value: favaOptions.sidebarShowQueries },
    { name: "unrealized", value: favaOptions.unrealized },
    { name: "upcoming_events", value: favaOptions.upcomingEvents },
    {
      name: "uptodate_indicator_grey_lookback_days",
      value: favaOptions.uptodateIndicatorGreyLookbackDays,
    },
    { name: "use_external_editor", value: favaOptions.useExternalEditor },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.settings.favaOptions")}</CardTitle>
        <CardDescription>
          {t("page.settings.favaOptionsDescription")}{" "}
          <a
            href={favaOptionsDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            {t("common.learnMore")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-75">Option</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionEntries.map((entry) => (
                <TableRow key={entry.name}>
                  <TableCell className="font-mono text-sm">
                    {entry.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatValue(entry.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
