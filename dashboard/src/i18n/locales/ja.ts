import { extractMessages } from "../utils";
import jaCommon from "./common/ja";
import jaSeo from "./seo/ja";
import jaAuth from "@/features/auth/locales/ja";
import jaUserSettings from "@/features/user-settings/locales/ja";
import jaLedgerList from "@/features/ledger-list/locales/ja";
import jaSettings from "@/features/ledger-data/settings/locales/ja";
import jaCollaboration from "@/features/collaboration/locales/ja";
import jaLedgerEditor from "@/features/ledger-editor/locales/ja";
import jaJournal from "@/features/journal/locales/ja";
import jaReports from "@/features/reports/locales/ja";
import jaAccounts from "@/features/ledger-data/accounts/locales/ja";
import jaBudget from "@/features/ledger-data/budget/locales/ja";
import jaCommodities from "@/features/ledger-data/commodities/locales/ja";
import jaDocuments from "@/features/ledger-data/documents/locales/ja";
import jaErrors from "@/features/ledger-data/errors/locales/ja";
import jaEvents from "@/features/ledger-data/events/locales/ja";
import jaHoldings from "@/features/ledger-data/holdings/locales/ja";
import jaStatistics from "@/features/ledger-data/statistics/locales/ja";
import jaBql from "@/features/bql/locales/ja";
import jaAiAgent from "@/features/ai-agent/locales/ja";
import jaPullRequests from "@/features/git/pull-requests/locales/ja";
import jaCommits from "@/features/git/commits/locales/ja";
import jaImporter from "@/features/importer/locales/ja";
import jaPlaid from "@/features/plaid/locales/ja";
import jaReceipt from "@/features/receipt/locales/ja";

const ja: Record<string, string> = {
  ...extractMessages(jaCommon),
  ...extractMessages(jaSeo),
  ...extractMessages(jaAuth),
  ...extractMessages(jaUserSettings),
  ...extractMessages(jaLedgerList),
  ...extractMessages(jaSettings),
  ...extractMessages(jaCollaboration),
  ...extractMessages(jaLedgerEditor),
  ...extractMessages(jaJournal),
  ...extractMessages(jaReports),
  ...extractMessages(jaAccounts),
  ...extractMessages(jaBudget),
  ...extractMessages(jaCommodities),
  ...extractMessages(jaDocuments),
  ...extractMessages(jaErrors),
  ...extractMessages(jaEvents),
  ...extractMessages(jaHoldings),
  ...extractMessages(jaStatistics),
  ...extractMessages(jaBql),
  ...extractMessages(jaAiAgent),
  ...extractMessages(jaPullRequests),
  ...extractMessages(jaCommits),
  ...extractMessages(jaImporter),
  ...extractMessages(jaPlaid),
  ...extractMessages(jaReceipt),
};

export default ja;
