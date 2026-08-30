import { extractMessages } from "../utils";
import skCommon from "./common/sk";
import skSeo from "./seo/sk";
import skAuth from "@/features/auth/locales/sk";
import skUserSettings from "@/features/user-settings/locales/sk";
import skLedgerList from "@/features/ledger-list/locales/sk";
import skSettings from "@/features/ledger-data/settings/locales/sk";
import skCollaboration from "@/features/collaboration/locales/sk";
import skLedgerEditor from "@/features/ledger-editor/locales/sk";
import skJournal from "@/features/journal/locales/sk";
import skReports from "@/features/reports/locales/sk";
import skAccounts from "@/features/ledger-data/accounts/locales/sk";
import skBudget from "@/features/ledger-data/budget/locales/sk";
import skCommodities from "@/features/ledger-data/commodities/locales/sk";
import skDocuments from "@/features/ledger-data/documents/locales/sk";
import skErrors from "@/features/ledger-data/errors/locales/sk";
import skEvents from "@/features/ledger-data/events/locales/sk";
import skHoldings from "@/features/ledger-data/holdings/locales/sk";
import skStatistics from "@/features/ledger-data/statistics/locales/sk";
import skBql from "@/features/bql/locales/sk";
import skAiAgent from "@/features/ai-agent/locales/sk";
import skPullRequests from "@/features/git/pull-requests/locales/sk";
import skCommits from "@/features/git/commits/locales/sk";
import skImporter from "@/features/importer/locales/sk";
import skPlaid from "@/features/plaid/locales/sk";
import skReceipt from "@/features/receipt/locales/sk";

const sk: Record<string, string> = {
  ...extractMessages(skCommon),
  ...extractMessages(skSeo),
  ...extractMessages(skAuth),
  ...extractMessages(skUserSettings),
  ...extractMessages(skLedgerList),
  ...extractMessages(skSettings),
  ...extractMessages(skCollaboration),
  ...extractMessages(skLedgerEditor),
  ...extractMessages(skJournal),
  ...extractMessages(skReports),
  ...extractMessages(skAccounts),
  ...extractMessages(skBudget),
  ...extractMessages(skCommodities),
  ...extractMessages(skDocuments),
  ...extractMessages(skErrors),
  ...extractMessages(skEvents),
  ...extractMessages(skHoldings),
  ...extractMessages(skStatistics),
  ...extractMessages(skBql),
  ...extractMessages(skAiAgent),
  ...extractMessages(skPullRequests),
  ...extractMessages(skCommits),
  ...extractMessages(skImporter),
  ...extractMessages(skPlaid),
  ...extractMessages(skReceipt),
};

export default sk;
