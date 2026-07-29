import { extractMessages } from "../utils";
import nlCommon from "./common/nl";
import nlSeo from "./seo/nl";
import nlAuth from "@/features/auth/locales/nl";
import nlUserSettings from "@/features/user-settings/locales/nl";
import nlLedgerList from "@/features/ledger-list/locales/nl";
import nlSettings from "@/features/ledger-data/settings/locales/nl";
import nlCollaboration from "@/features/collaboration/locales/nl";
import nlLedgerEditor from "@/features/ledger-editor/locales/nl";
import nlJournal from "@/features/journal/locales/nl";
import nlReports from "@/features/reports/locales/nl";
import nlAccounts from "@/features/ledger-data/accounts/locales/nl";
import nlBudget from "@/features/ledger-data/budget/locales/nl";
import nlCommodities from "@/features/ledger-data/commodities/locales/nl";
import nlDocuments from "@/features/ledger-data/documents/locales/nl";
import nlErrors from "@/features/ledger-data/errors/locales/nl";
import nlEvents from "@/features/ledger-data/events/locales/nl";
import nlHoldings from "@/features/ledger-data/holdings/locales/nl";
import nlStatistics from "@/features/ledger-data/statistics/locales/nl";
import nlBql from "@/features/bql/locales/nl";
import nlAiAgent from "@/features/ai-agent/locales/nl";
import nlPullRequests from "@/features/git/pull-requests/locales/nl";
import nlCommits from "@/features/git/commits/locales/nl";
import nlImporter from "@/features/importer/locales/nl";
import nlPlaid from "@/features/plaid/locales/nl";
import nlReceipt from "@/features/receipt/locales/nl";

const nl: Record<string, string> = {
  ...extractMessages(nlCommon),
  ...extractMessages(nlSeo),
  ...extractMessages(nlAuth),
  ...extractMessages(nlUserSettings),
  ...extractMessages(nlLedgerList),
  ...extractMessages(nlSettings),
  ...extractMessages(nlCollaboration),
  ...extractMessages(nlLedgerEditor),
  ...extractMessages(nlJournal),
  ...extractMessages(nlReports),
  ...extractMessages(nlAccounts),
  ...extractMessages(nlBudget),
  ...extractMessages(nlCommodities),
  ...extractMessages(nlDocuments),
  ...extractMessages(nlErrors),
  ...extractMessages(nlEvents),
  ...extractMessages(nlHoldings),
  ...extractMessages(nlStatistics),
  ...extractMessages(nlBql),
  ...extractMessages(nlAiAgent),
  ...extractMessages(nlPullRequests),
  ...extractMessages(nlCommits),
  ...extractMessages(nlImporter),
  ...extractMessages(nlPlaid),
  ...extractMessages(nlReceipt),
};

export default nl;
