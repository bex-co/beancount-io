import { extractMessages } from "../utils";
import ukCommon from "./common/uk";
import ukSeo from "./seo/uk";
import ukAuth from "@/features/auth/locales/uk";
import ukUserSettings from "@/features/user-settings/locales/uk";
import ukLedgerList from "@/features/ledger-list/locales/uk";
import ukSettings from "@/features/ledger-data/settings/locales/uk";
import ukCollaboration from "@/features/collaboration/locales/uk";
import ukLedgerEditor from "@/features/ledger-editor/locales/uk";
import ukJournal from "@/features/journal/locales/uk";
import ukReports from "@/features/reports/locales/uk";
import ukAccounts from "@/features/ledger-data/accounts/locales/uk";
import ukBudget from "@/features/ledger-data/budget/locales/uk";
import ukCommodities from "@/features/ledger-data/commodities/locales/uk";
import ukDocuments from "@/features/ledger-data/documents/locales/uk";
import ukErrors from "@/features/ledger-data/errors/locales/uk";
import ukEvents from "@/features/ledger-data/events/locales/uk";
import ukHoldings from "@/features/ledger-data/holdings/locales/uk";
import ukStatistics from "@/features/ledger-data/statistics/locales/uk";
import ukBql from "@/features/bql/locales/uk";
import ukAiAgent from "@/features/ai-agent/locales/uk";
import ukPullRequests from "@/features/git/pull-requests/locales/uk";
import ukCommits from "@/features/git/commits/locales/uk";
import ukImporter from "@/features/importer/locales/uk";
import ukPlaid from "@/features/plaid/locales/uk";
import ukReceipt from "@/features/receipt/locales/uk";
import ukAwesome from "@/features/awesome-plain-text-accounting/locales/uk";

const uk: Record<string, string> = {
  ...extractMessages(ukCommon),
  ...extractMessages(ukSeo),
  ...extractMessages(ukAuth),
  ...extractMessages(ukUserSettings),
  ...extractMessages(ukLedgerList),
  ...extractMessages(ukSettings),
  ...extractMessages(ukCollaboration),
  ...extractMessages(ukLedgerEditor),
  ...extractMessages(ukJournal),
  ...extractMessages(ukReports),
  ...extractMessages(ukAccounts),
  ...extractMessages(ukBudget),
  ...extractMessages(ukCommodities),
  ...extractMessages(ukDocuments),
  ...extractMessages(ukErrors),
  ...extractMessages(ukEvents),
  ...extractMessages(ukHoldings),
  ...extractMessages(ukStatistics),
  ...extractMessages(ukBql),
  ...extractMessages(ukAiAgent),
  ...extractMessages(ukPullRequests),
  ...extractMessages(ukCommits),
  ...extractMessages(ukImporter),
  ...extractMessages(ukPlaid),
  ...extractMessages(ukReceipt),
  ...extractMessages(ukAwesome),
};

export default uk;
