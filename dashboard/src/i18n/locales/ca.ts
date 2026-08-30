import { extractMessages } from "../utils";
import caCommon from "./common/ca";
import caSeo from "./seo/ca";
import caAuth from "@/features/auth/locales/ca";
import caUserSettings from "@/features/user-settings/locales/ca";
import caLedgerList from "@/features/ledger-list/locales/ca";
import caSettings from "@/features/ledger-data/settings/locales/ca";
import caCollaboration from "@/features/collaboration/locales/ca";
import caLedgerEditor from "@/features/ledger-editor/locales/ca";
import caJournal from "@/features/journal/locales/ca";
import caReports from "@/features/reports/locales/ca";
import caAccounts from "@/features/ledger-data/accounts/locales/ca";
import caBudget from "@/features/ledger-data/budget/locales/ca";
import caCommodities from "@/features/ledger-data/commodities/locales/ca";
import caDocuments from "@/features/ledger-data/documents/locales/ca";
import caErrors from "@/features/ledger-data/errors/locales/ca";
import caEvents from "@/features/ledger-data/events/locales/ca";
import caHoldings from "@/features/ledger-data/holdings/locales/ca";
import caStatistics from "@/features/ledger-data/statistics/locales/ca";
import caBql from "@/features/bql/locales/ca";
import caAiAgent from "@/features/ai-agent/locales/ca";
import caPullRequests from "@/features/git/pull-requests/locales/ca";
import caCommits from "@/features/git/commits/locales/ca";
import caImporter from "@/features/importer/locales/ca";
import caPlaid from "@/features/plaid/locales/ca";
import caReceipt from "@/features/receipt/locales/ca";
import caAwesome from "@/features/awesome-plain-text-accounting/locales/ca";

const ca: Record<string, string> = {
  ...extractMessages(caCommon),
  ...extractMessages(caSeo),
  ...extractMessages(caAuth),
  ...extractMessages(caUserSettings),
  ...extractMessages(caLedgerList),
  ...extractMessages(caSettings),
  ...extractMessages(caCollaboration),
  ...extractMessages(caLedgerEditor),
  ...extractMessages(caJournal),
  ...extractMessages(caReports),
  ...extractMessages(caAccounts),
  ...extractMessages(caBudget),
  ...extractMessages(caCommodities),
  ...extractMessages(caDocuments),
  ...extractMessages(caErrors),
  ...extractMessages(caEvents),
  ...extractMessages(caHoldings),
  ...extractMessages(caStatistics),
  ...extractMessages(caBql),
  ...extractMessages(caAiAgent),
  ...extractMessages(caPullRequests),
  ...extractMessages(caCommits),
  ...extractMessages(caImporter),
  ...extractMessages(caPlaid),
  ...extractMessages(caReceipt),
  ...extractMessages(caAwesome),
};

export default ca;
