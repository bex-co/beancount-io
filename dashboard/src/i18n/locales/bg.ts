import { extractMessages } from "../utils";
import bgCommon from "./common/bg";
import bgSeo from "./seo/bg";
import bgAuth from "@/features/auth/locales/bg";
import bgUserSettings from "@/features/user-settings/locales/bg";
import bgLedgerList from "@/features/ledger-list/locales/bg";
import bgSettings from "@/features/ledger-data/settings/locales/bg";
import bgCollaboration from "@/features/collaboration/locales/bg";
import bgLedgerEditor from "@/features/ledger-editor/locales/bg";
import bgJournal from "@/features/journal/locales/bg";
import bgReports from "@/features/reports/locales/bg";
import bgAccounts from "@/features/ledger-data/accounts/locales/bg";
import bgBudget from "@/features/ledger-data/budget/locales/bg";
import bgCommodities from "@/features/ledger-data/commodities/locales/bg";
import bgDocuments from "@/features/ledger-data/documents/locales/bg";
import bgErrors from "@/features/ledger-data/errors/locales/bg";
import bgEvents from "@/features/ledger-data/events/locales/bg";
import bgHoldings from "@/features/ledger-data/holdings/locales/bg";
import bgStatistics from "@/features/ledger-data/statistics/locales/bg";
import bgBql from "@/features/bql/locales/bg";
import bgAiAgent from "@/features/ai-agent/locales/bg";
import bgPullRequests from "@/features/git/pull-requests/locales/bg";
import bgCommits from "@/features/git/commits/locales/bg";
import bgImporter from "@/features/importer/locales/bg";
import bgPlaid from "@/features/plaid/locales/bg";
import bgReceipt from "@/features/receipt/locales/bg";

const bg: Record<string, string> = {
  ...extractMessages(bgCommon),
  ...extractMessages(bgSeo),
  ...extractMessages(bgAuth),
  ...extractMessages(bgUserSettings),
  ...extractMessages(bgLedgerList),
  ...extractMessages(bgSettings),
  ...extractMessages(bgCollaboration),
  ...extractMessages(bgLedgerEditor),
  ...extractMessages(bgJournal),
  ...extractMessages(bgReports),
  ...extractMessages(bgAccounts),
  ...extractMessages(bgBudget),
  ...extractMessages(bgCommodities),
  ...extractMessages(bgDocuments),
  ...extractMessages(bgErrors),
  ...extractMessages(bgEvents),
  ...extractMessages(bgHoldings),
  ...extractMessages(bgStatistics),
  ...extractMessages(bgBql),
  ...extractMessages(bgAiAgent),
  ...extractMessages(bgPullRequests),
  ...extractMessages(bgCommits),
  ...extractMessages(bgImporter),
  ...extractMessages(bgPlaid),
  ...extractMessages(bgReceipt),
};

export default bg;
