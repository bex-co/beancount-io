import { extractMessages } from "../utils";
import enCommon from "./common/en";
import enSeo from "./seo/en";
import enAuth from "@/features/auth/locales/en";
import enUserSettings from "@/features/user-settings/locales/en";
import enLedgerList from "@/features/ledger-list/locales/en";
import enSettings from "@/features/ledger-data/settings/locales/en";
import enCollaboration from "@/features/collaboration/locales/en";
import enLedgerEditor from "@/features/ledger-editor/locales/en";
import enJournal from "@/features/journal/locales/en";
import enReports from "@/features/reports/locales/en";
import enAccounts from "@/features/ledger-data/accounts/locales/en";
import enBudget from "@/features/ledger-data/budget/locales/en";
import enCommodities from "@/features/ledger-data/commodities/locales/en";
import enDocuments from "@/features/ledger-data/documents/locales/en";
import enErrors from "@/features/ledger-data/errors/locales/en";
import enEvents from "@/features/ledger-data/events/locales/en";
import enHoldings from "@/features/ledger-data/holdings/locales/en";
import enStatistics from "@/features/ledger-data/statistics/locales/en";
import enBql from "@/features/bql/locales/en";
import enUserProfile from "@/features/user-profile/locales/en";
import enPullRequests from "@/features/git/pull-requests/locales/en";
import enCommits from "@/features/git/commits/locales/en";
import enAiAgent from "@/features/ai-agent/locales/en";
import enImporter from "@/features/importer/locales/en";
import enPlaid from "@/features/plaid/locales/en";
import enReceipt from "@/features/receipt/locales/en";
import enAwesome from "@/features/awesome-plain-text-accounting/locales/en";

const en: Record<string, string> = {
  ...extractMessages(enCommon),
  ...extractMessages(enSeo),
  ...extractMessages(enAuth),
  ...extractMessages(enUserSettings),
  ...extractMessages(enLedgerList),
  ...extractMessages(enSettings),
  ...extractMessages(enCollaboration),
  ...extractMessages(enLedgerEditor),
  ...extractMessages(enJournal),
  ...extractMessages(enReports),
  ...extractMessages(enAccounts),
  ...extractMessages(enBudget),
  ...extractMessages(enCommodities),
  ...extractMessages(enDocuments),
  ...extractMessages(enErrors),
  ...extractMessages(enEvents),
  ...extractMessages(enHoldings),
  ...extractMessages(enStatistics),
  ...extractMessages(enBql),
  ...extractMessages(enUserProfile),
  ...extractMessages(enPullRequests),
  ...extractMessages(enCommits),
  ...extractMessages(enAiAgent),
  ...extractMessages(enImporter),
  ...extractMessages(enPlaid),
  ...extractMessages(enReceipt),
  ...extractMessages(enAwesome),
};

export default en;
