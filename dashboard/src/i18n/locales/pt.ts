import { extractMessages } from "../utils";
import ptCommon from "./common/pt";
import ptSeo from "./seo/pt";
import ptAuth from "@/features/auth/locales/pt";
import ptUserSettings from "@/features/user-settings/locales/pt";
import ptLedgerList from "@/features/ledger-list/locales/pt";
import ptSettings from "@/features/ledger-data/settings/locales/pt";
import ptCollaboration from "@/features/collaboration/locales/pt";
import ptLedgerEditor from "@/features/ledger-editor/locales/pt";
import ptJournal from "@/features/journal/locales/pt";
import ptReports from "@/features/reports/locales/pt";
import ptAccounts from "@/features/ledger-data/accounts/locales/pt";
import ptBudget from "@/features/ledger-data/budget/locales/pt";
import ptCommodities from "@/features/ledger-data/commodities/locales/pt";
import ptDocuments from "@/features/ledger-data/documents/locales/pt";
import ptErrors from "@/features/ledger-data/errors/locales/pt";
import ptEvents from "@/features/ledger-data/events/locales/pt";
import ptHoldings from "@/features/ledger-data/holdings/locales/pt";
import ptStatistics from "@/features/ledger-data/statistics/locales/pt";
import ptBql from "@/features/bql/locales/pt";
import ptAiAgent from "@/features/ai-agent/locales/pt";
import ptPullRequests from "@/features/git/pull-requests/locales/pt";
import ptCommits from "@/features/git/commits/locales/pt";
import ptImporter from "@/features/importer/locales/pt";
import ptPlaid from "@/features/plaid/locales/pt";
import ptReceipt from "@/features/receipt/locales/pt";
import ptAwesome from "@/features/awesome-plain-text-accounting/locales/pt";

const pt: Record<string, string> = {
  ...extractMessages(ptCommon),
  ...extractMessages(ptSeo),
  ...extractMessages(ptAuth),
  ...extractMessages(ptUserSettings),
  ...extractMessages(ptLedgerList),
  ...extractMessages(ptSettings),
  ...extractMessages(ptCollaboration),
  ...extractMessages(ptLedgerEditor),
  ...extractMessages(ptJournal),
  ...extractMessages(ptReports),
  ...extractMessages(ptAccounts),
  ...extractMessages(ptBudget),
  ...extractMessages(ptCommodities),
  ...extractMessages(ptDocuments),
  ...extractMessages(ptErrors),
  ...extractMessages(ptEvents),
  ...extractMessages(ptHoldings),
  ...extractMessages(ptStatistics),
  ...extractMessages(ptBql),
  ...extractMessages(ptAiAgent),
  ...extractMessages(ptPullRequests),
  ...extractMessages(ptCommits),
  ...extractMessages(ptImporter),
  ...extractMessages(ptPlaid),
  ...extractMessages(ptReceipt),
  ...extractMessages(ptAwesome),
};

export default pt;
