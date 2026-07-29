import { extractMessages } from "../utils";
import frCommon from "./common/fr";
import frSeo from "./seo/fr";
import frAuth from "@/features/auth/locales/fr";
import frUserSettings from "@/features/user-settings/locales/fr";
import frLedgerList from "@/features/ledger-list/locales/fr";
import frSettings from "@/features/ledger-data/settings/locales/fr";
import frCollaboration from "@/features/collaboration/locales/fr";
import frLedgerEditor from "@/features/ledger-editor/locales/fr";
import frJournal from "@/features/journal/locales/fr";
import frReports from "@/features/reports/locales/fr";
import frAccounts from "@/features/ledger-data/accounts/locales/fr";
import frBudget from "@/features/ledger-data/budget/locales/fr";
import frCommodities from "@/features/ledger-data/commodities/locales/fr";
import frDocuments from "@/features/ledger-data/documents/locales/fr";
import frErrors from "@/features/ledger-data/errors/locales/fr";
import frEvents from "@/features/ledger-data/events/locales/fr";
import frHoldings from "@/features/ledger-data/holdings/locales/fr";
import frStatistics from "@/features/ledger-data/statistics/locales/fr";
import frBql from "@/features/bql/locales/fr";
import frAiAgent from "@/features/ai-agent/locales/fr";
import frPullRequests from "@/features/git/pull-requests/locales/fr";
import frCommits from "@/features/git/commits/locales/fr";
import frImporter from "@/features/importer/locales/fr";
import frPlaid from "@/features/plaid/locales/fr";
import frReceipt from "@/features/receipt/locales/fr";

const fr: Record<string, string> = {
  ...extractMessages(frCommon),
  ...extractMessages(frSeo),
  ...extractMessages(frAuth),
  ...extractMessages(frUserSettings),
  ...extractMessages(frLedgerList),
  ...extractMessages(frSettings),
  ...extractMessages(frCollaboration),
  ...extractMessages(frLedgerEditor),
  ...extractMessages(frJournal),
  ...extractMessages(frReports),
  ...extractMessages(frAccounts),
  ...extractMessages(frBudget),
  ...extractMessages(frCommodities),
  ...extractMessages(frDocuments),
  ...extractMessages(frErrors),
  ...extractMessages(frEvents),
  ...extractMessages(frHoldings),
  ...extractMessages(frStatistics),
  ...extractMessages(frBql),
  ...extractMessages(frAiAgent),
  ...extractMessages(frPullRequests),
  ...extractMessages(frCommits),
  ...extractMessages(frImporter),
  ...extractMessages(frPlaid),
  ...extractMessages(frReceipt),
};

export default fr;
