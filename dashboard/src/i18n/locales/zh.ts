import { extractMessages } from "../utils";
import zhCommon from "./common/zh";
import zhSeo from "./seo/zh";
import zhAuth from "@/features/auth/locales/zh";
import zhUserSettings from "@/features/user-settings/locales/zh";
import zhLedgerList from "@/features/ledger-list/locales/zh";
import zhSettings from "@/features/ledger-data/settings/locales/zh";
import zhCollaboration from "@/features/collaboration/locales/zh";
import zhLedgerEditor from "@/features/ledger-editor/locales/zh";
import zhJournal from "@/features/journal/locales/zh";
import zhReports from "@/features/reports/locales/zh";
import zhAccounts from "@/features/ledger-data/accounts/locales/zh";
import zhBudget from "@/features/ledger-data/budget/locales/zh";
import zhCommodities from "@/features/ledger-data/commodities/locales/zh";
import zhDocuments from "@/features/ledger-data/documents/locales/zh";
import zhErrors from "@/features/ledger-data/errors/locales/zh";
import zhEvents from "@/features/ledger-data/events/locales/zh";
import zhHoldings from "@/features/ledger-data/holdings/locales/zh";
import zhStatistics from "@/features/ledger-data/statistics/locales/zh";
import zhBql from "@/features/bql/locales/zh";
import zhAiAgent from "@/features/ai-agent/locales/zh";
import zhPullRequests from "@/features/git/pull-requests/locales/zh";
import zhCommits from "@/features/git/commits/locales/zh";
import zhImporter from "@/features/importer/locales/zh";
import zhPlaid from "@/features/plaid/locales/zh";
import zhReceipt from "@/features/receipt/locales/zh";

const zh: Record<string, string> = {
  ...extractMessages(zhCommon),
  ...extractMessages(zhSeo),
  ...extractMessages(zhAuth),
  ...extractMessages(zhUserSettings),
  ...extractMessages(zhLedgerList),
  ...extractMessages(zhSettings),
  ...extractMessages(zhCollaboration),
  ...extractMessages(zhLedgerEditor),
  ...extractMessages(zhJournal),
  ...extractMessages(zhReports),
  ...extractMessages(zhAccounts),
  ...extractMessages(zhBudget),
  ...extractMessages(zhCommodities),
  ...extractMessages(zhDocuments),
  ...extractMessages(zhErrors),
  ...extractMessages(zhEvents),
  ...extractMessages(zhHoldings),
  ...extractMessages(zhStatistics),
  ...extractMessages(zhBql),
  ...extractMessages(zhAiAgent),
  ...extractMessages(zhPullRequests),
  ...extractMessages(zhCommits),
  ...extractMessages(zhImporter),
  ...extractMessages(zhPlaid),
  ...extractMessages(zhReceipt),
};

export default zh;
