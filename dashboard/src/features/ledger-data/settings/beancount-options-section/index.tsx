import { useTranslations } from "@/common/hooks/use-translations";
import { docsUrl } from "@/common/lib/docs-url";
import type { GetLedgerQuery } from "@/graphql/definitions";
import {
  OptionsTableSection,
  type OptionEntry,
} from "../options-table-section";

export function BeancountOptionsSection({
  ledger,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
}) {
  const { t, i18n } = useTranslations();
  const options = ledger.options;

  if (!options) return null;

  const optionEntries: OptionEntry[] = [
    { name: "title", value: options.title },
    { name: "name_assets", value: options.nameAssets },
    { name: "name_liabilities", value: options.nameLiabilities },
    { name: "name_equity", value: options.nameEquity },
    { name: "name_income", value: options.nameIncome },
    { name: "name_expenses", value: options.nameExpenses },
    {
      name: "account_current_conversions",
      value: options.accountCurrentConversions,
    },
    { name: "account_current_earnings", value: options.accountCurrentEarnings },
    { name: "render_commas", value: options.renderCommas },
    { name: "operating_currency", value: options.operatingCurrency },
  ];

  return (
    <OptionsTableSection
      title={t("page.settings.beancountOptions")}
      description={t("page.settings.beancountOptionsDescription")}
      docUrl={docsUrl(i18n.language, "Basics/options-configuration")}
      entries={optionEntries}
    />
  );
}
