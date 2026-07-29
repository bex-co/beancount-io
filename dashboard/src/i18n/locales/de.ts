import { extractMessages } from "../utils";
import deCommon from "./common/de";
import deSeo from "./seo/de";
import deAuth from "@/features/auth/locales/de";
import deUserSettings from "@/features/user-settings/locales/de";
import deLedgerList from "@/features/ledger-list/locales/de";
import deSettings from "@/features/ledger-data/settings/locales/de";
import deCollaboration from "@/features/collaboration/locales/de";
import deLedgerEditor from "@/features/ledger-editor/locales/de";
import deJournal from "@/features/journal/locales/de";
import deReports from "@/features/reports/locales/de";
import deAccounts from "@/features/ledger-data/accounts/locales/de";
import deBudget from "@/features/ledger-data/budget/locales/de";
import deCommodities from "@/features/ledger-data/commodities/locales/de";
import deDocuments from "@/features/ledger-data/documents/locales/de";
import deErrors from "@/features/ledger-data/errors/locales/de";
import deEvents from "@/features/ledger-data/events/locales/de";
import deHoldings from "@/features/ledger-data/holdings/locales/de";
import deStatistics from "@/features/ledger-data/statistics/locales/de";
import deBql from "@/features/bql/locales/de";
import deAiAgent from "@/features/ai-agent/locales/de";
import dePullRequests from "@/features/git/pull-requests/locales/de";
import deCommits from "@/features/git/commits/locales/de";
import deImporter from "@/features/importer/locales/de";
import dePlaid from "@/features/plaid/locales/de";
import deReceipt from "@/features/receipt/locales/de";

const de: Record<string, string> = {
  ...extractMessages(deCommon),
  ...extractMessages(deSeo),
  ...extractMessages(deAuth),
  ...extractMessages(deUserSettings),
  ...extractMessages(deLedgerList),
  ...extractMessages(deSettings),
  ...extractMessages(deCollaboration),
  ...extractMessages(deLedgerEditor),
  ...extractMessages(deJournal),
  ...extractMessages(deReports),
  ...extractMessages(deAccounts),
  ...extractMessages(deBudget),
  ...extractMessages(deCommodities),
  ...extractMessages(deDocuments),
  ...extractMessages(deErrors),
  ...extractMessages(deEvents),
  ...extractMessages(deHoldings),
  ...extractMessages(deStatistics),
  ...extractMessages(deBql),
  ...extractMessages(deAiAgent),
  ...extractMessages(dePullRequests),
  ...extractMessages(deCommits),
  ...extractMessages(deImporter),
  ...extractMessages(dePlaid),
  ...extractMessages(deReceipt),
};

export default de;
