import { extractMessages } from "../utils";
import ruCommon from "./common/ru";
import ruSeo from "./seo/ru";
import ruAuth from "@/features/auth/locales/ru";
import ruUserSettings from "@/features/user-settings/locales/ru";
import ruLedgerList from "@/features/ledger-list/locales/ru";
import ruSettings from "@/features/ledger-data/settings/locales/ru";
import ruCollaboration from "@/features/collaboration/locales/ru";
import ruLedgerEditor from "@/features/ledger-editor/locales/ru";
import ruJournal from "@/features/journal/locales/ru";
import ruReports from "@/features/reports/locales/ru";
import ruAccounts from "@/features/ledger-data/accounts/locales/ru";
import ruBudget from "@/features/ledger-data/budget/locales/ru";
import ruCommodities from "@/features/ledger-data/commodities/locales/ru";
import ruDocuments from "@/features/ledger-data/documents/locales/ru";
import ruErrors from "@/features/ledger-data/errors/locales/ru";
import ruEvents from "@/features/ledger-data/events/locales/ru";
import ruHoldings from "@/features/ledger-data/holdings/locales/ru";
import ruStatistics from "@/features/ledger-data/statistics/locales/ru";
import ruBql from "@/features/bql/locales/ru";
import ruAiAgent from "@/features/ai-agent/locales/ru";
import ruPullRequests from "@/features/git/pull-requests/locales/ru";
import ruCommits from "@/features/git/commits/locales/ru";
import ruImporter from "@/features/importer/locales/ru";
import ruPlaid from "@/features/plaid/locales/ru";
import ruReceipt from "@/features/receipt/locales/ru";

const ru: Record<string, string> = {
  ...extractMessages(ruCommon),
  ...extractMessages(ruSeo),
  ...extractMessages(ruAuth),
  ...extractMessages(ruUserSettings),
  ...extractMessages(ruLedgerList),
  ...extractMessages(ruSettings),
  ...extractMessages(ruCollaboration),
  ...extractMessages(ruLedgerEditor),
  ...extractMessages(ruJournal),
  ...extractMessages(ruReports),
  ...extractMessages(ruAccounts),
  ...extractMessages(ruBudget),
  ...extractMessages(ruCommodities),
  ...extractMessages(ruDocuments),
  ...extractMessages(ruErrors),
  ...extractMessages(ruEvents),
  ...extractMessages(ruHoldings),
  ...extractMessages(ruStatistics),
  ...extractMessages(ruBql),
  ...extractMessages(ruAiAgent),
  ...extractMessages(ruPullRequests),
  ...extractMessages(ruCommits),
  ...extractMessages(ruImporter),
  ...extractMessages(ruPlaid),
  ...extractMessages(ruReceipt),
};

export default ru;
