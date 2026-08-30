import { extractMessages } from "../utils";
import koCommon from "./common/ko";
import koSeo from "./seo/ko";
import koAuth from "@/features/auth/locales/ko";
import koUserSettings from "@/features/user-settings/locales/ko";
import koLedgerList from "@/features/ledger-list/locales/ko";
import koSettings from "@/features/ledger-data/settings/locales/ko";
import koCollaboration from "@/features/collaboration/locales/ko";
import koLedgerEditor from "@/features/ledger-editor/locales/ko";
import koJournal from "@/features/journal/locales/ko";
import koReports from "@/features/reports/locales/ko";
import koAccounts from "@/features/ledger-data/accounts/locales/ko";
import koBudget from "@/features/ledger-data/budget/locales/ko";
import koCommodities from "@/features/ledger-data/commodities/locales/ko";
import koDocuments from "@/features/ledger-data/documents/locales/ko";
import koErrors from "@/features/ledger-data/errors/locales/ko";
import koEvents from "@/features/ledger-data/events/locales/ko";
import koHoldings from "@/features/ledger-data/holdings/locales/ko";
import koStatistics from "@/features/ledger-data/statistics/locales/ko";
import koBql from "@/features/bql/locales/ko";
import koAiAgent from "@/features/ai-agent/locales/ko";
import koPullRequests from "@/features/git/pull-requests/locales/ko";
import koCommits from "@/features/git/commits/locales/ko";
import koImporter from "@/features/importer/locales/ko";
import koPlaid from "@/features/plaid/locales/ko";
import koReceipt from "@/features/receipt/locales/ko";
import koAwesome from "@/features/awesome-plain-text-accounting/locales/ko";

const ko: Record<string, string> = {
  ...extractMessages(koCommon),
  ...extractMessages(koSeo),
  ...extractMessages(koAuth),
  ...extractMessages(koUserSettings),
  ...extractMessages(koLedgerList),
  ...extractMessages(koSettings),
  ...extractMessages(koCollaboration),
  ...extractMessages(koLedgerEditor),
  ...extractMessages(koJournal),
  ...extractMessages(koReports),
  ...extractMessages(koAccounts),
  ...extractMessages(koBudget),
  ...extractMessages(koCommodities),
  ...extractMessages(koDocuments),
  ...extractMessages(koErrors),
  ...extractMessages(koEvents),
  ...extractMessages(koHoldings),
  ...extractMessages(koStatistics),
  ...extractMessages(koBql),
  ...extractMessages(koAiAgent),
  ...extractMessages(koPullRequests),
  ...extractMessages(koCommits),
  ...extractMessages(koImporter),
  ...extractMessages(koPlaid),
  ...extractMessages(koReceipt),
  ...extractMessages(koAwesome),
};

export default ko;
