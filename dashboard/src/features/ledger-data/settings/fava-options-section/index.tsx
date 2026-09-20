import { useTranslations } from "@/common/hooks/use-translations";
import type { GetLedgerQuery } from "@/graphql/definitions";
import {
  OptionsTableSection,
  type OptionEntry,
} from "../options-table-section";

export function FavaOptionsSection({
  ledger,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
}) {
  const { t, i18n } = useTranslations();
  const favaOptions = ledger.favaOptions;

  if (!favaOptions) return null;

  const localePrefix = i18n.language === "en" ? "" : `/${i18n.language}`;

  const optionEntries: OptionEntry[] = [
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
    <OptionsTableSection
      title={t("page.settings.favaOptions")}
      description={t("page.settings.favaOptionsDescription")}
      docUrl={`https://beancount.io${localePrefix}/docs/Basics/fava-options`}
      entries={optionEntries}
    />
  );
}
