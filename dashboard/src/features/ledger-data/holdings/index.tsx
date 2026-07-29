import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";

import { useParams } from "@tanstack/react-router";

import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { useState } from "react";
import { DatasetTable } from "./holdings-table";
import {
  holdingsStatement,
  holdingsStatementByAccount,
  holdingsStatementByCurrency,
  holdingsStatementByCostCurrency,
} from "./holdings-statement";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { holdingsRowsFilter, defaultRowsFilter } from "./utils";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";

const LedgerHoldingsTabs = () => {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/holdings",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const [selectedTab, setSelectedTab] = useState<string>("holdings");
  const tabOptions = [
    { label: t("page.holdings.holdings"), value: "holdings" },
    { label: t("page.holdings.holdingsByAccount"), value: "by-account" },
    { label: t("page.holdings.holdingsByCurrency"), value: "by-currency" },
    {
      label: t("page.holdings.holdingsByCostCurrency"),
      value: "by-cost-currency",
    },
  ];
  return (
    <Tabs
      className="w-full max-w-full"
      value={selectedTab}
      onValueChange={setSelectedTab}
    >
      <div className="flex items-center justify-between overflow-x-auto">
        <ResponsiveTabTriggerList
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          tabOptions={tabOptions}
        />
      </div>
      <TabsContent value="holdings" className="mt-2 max-w-full">
        <DatasetTable
          query={holdingsStatement}
          ledgerId={ledgerId}
          rowsFilter={holdingsRowsFilter}
        />
      </TabsContent>

      <TabsContent value="by-account" className="mt-2 max-w-full">
        <DatasetTable
          query={holdingsStatementByAccount}
          ledgerId={ledgerId}
          rowsFilter={defaultRowsFilter}
        />
      </TabsContent>

      <TabsContent value="by-currency" className="mt-2 max-w-full">
        <DatasetTable
          query={holdingsStatementByCurrency}
          ledgerId={ledgerId}
          rowsFilter={defaultRowsFilter}
        />
      </TabsContent>

      <TabsContent value="by-cost-currency" className="mt-2 max-w-full">
        <DatasetTable
          query={holdingsStatementByCostCurrency}
          ledgerId={ledgerId}
          rowsFilter={defaultRowsFilter}
        />
      </TabsContent>
    </Tabs>
  );
};

const LedgerHoldingsPage = () => {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/holdings",
  });
  const { ledgerName: ledgerDisplayName } = useLedger();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      <LedgerPageSEO seoKey="ledgerHoldings" />
      <PageHeader
        title={t("page.holdings.holdings")}
        description={t("common.pageDescription.holdings", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <LedgerHoldingsTabs />

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.commodities"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/commodities`,
          },
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerName}`,
          },
          {
            label: t("common.relatedLinks.statistics"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/statistics`,
          },
        ]}
      />
    </div>
  );
};

export default LedgerHoldingsPage;
