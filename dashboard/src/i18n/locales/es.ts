import { extractMessages } from "../utils";
import esCommon from "./common/es";
import esSeo from "./seo/es";
import esAuth from "@/features/auth/locales/es";
import esUserSettings from "@/features/user-settings/locales/es";
import esLedgerList from "@/features/ledger-list/locales/es";
import esSettings from "@/features/ledger-data/settings/locales/es";
import esCollaboration from "@/features/collaboration/locales/es";
import esLedgerEditor from "@/features/ledger-editor/locales/es";
import esJournal from "@/features/journal/locales/es";
import esReports from "@/features/reports/locales/es";
import esAccounts from "@/features/ledger-data/accounts/locales/es";
import esBudget from "@/features/ledger-data/budget/locales/es";
import esCommodities from "@/features/ledger-data/commodities/locales/es";
import esDocuments from "@/features/ledger-data/documents/locales/es";
import esErrors from "@/features/ledger-data/errors/locales/es";
import esEvents from "@/features/ledger-data/events/locales/es";
import esHoldings from "@/features/ledger-data/holdings/locales/es";
import esStatistics from "@/features/ledger-data/statistics/locales/es";
import esBql from "@/features/bql/locales/es";
import esAiAgent from "@/features/ai-agent/locales/es";
import esPullRequests from "@/features/git/pull-requests/locales/es";
import esCommits from "@/features/git/commits/locales/es";
import esImporter from "@/features/importer/locales/es";
import esPlaid from "@/features/plaid/locales/es";
import esReceipt from "@/features/receipt/locales/es";

const es: Record<string, string> = {
  ...extractMessages(esCommon),
  ...extractMessages(esSeo),
  ...extractMessages(esAuth),
  ...extractMessages(esUserSettings),
  ...extractMessages(esLedgerList),
  ...extractMessages(esSettings),
  ...extractMessages(esCollaboration),
  ...extractMessages(esLedgerEditor),
  ...extractMessages(esJournal),
  ...extractMessages(esReports),
  ...extractMessages(esAccounts),
  ...extractMessages(esBudget),
  ...extractMessages(esCommodities),
  ...extractMessages(esDocuments),
  ...extractMessages(esErrors),
  ...extractMessages(esEvents),
  ...extractMessages(esHoldings),
  ...extractMessages(esStatistics),
  ...extractMessages(esBql),
  ...extractMessages(esAiAgent),
  ...extractMessages(esPullRequests),
  ...extractMessages(esCommits),
  ...extractMessages(esImporter),
  ...extractMessages(esPlaid),
  ...extractMessages(esReceipt),
};

export default es;
