import { extractMessages } from "../utils";
import faCommon from "./common/fa";
import faSeo from "./seo/fa";
import faAuth from "@/features/auth/locales/fa";
import faUserSettings from "@/features/user-settings/locales/fa";
import faLedgerList from "@/features/ledger-list/locales/fa";
import faSettings from "@/features/ledger-data/settings/locales/fa";
import faCollaboration from "@/features/collaboration/locales/fa";
import faLedgerEditor from "@/features/ledger-editor/locales/fa";
import faJournal from "@/features/journal/locales/fa";
import faReports from "@/features/reports/locales/fa";
import faAccounts from "@/features/ledger-data/accounts/locales/fa";
import faBudget from "@/features/ledger-data/budget/locales/fa";
import faCommodities from "@/features/ledger-data/commodities/locales/fa";
import faDocuments from "@/features/ledger-data/documents/locales/fa";
import faErrors from "@/features/ledger-data/errors/locales/fa";
import faEvents from "@/features/ledger-data/events/locales/fa";
import faHoldings from "@/features/ledger-data/holdings/locales/fa";
import faStatistics from "@/features/ledger-data/statistics/locales/fa";
import faBql from "@/features/bql/locales/fa";
import faAiAgent from "@/features/ai-agent/locales/fa";
import faPullRequests from "@/features/git/pull-requests/locales/fa";
import faCommits from "@/features/git/commits/locales/fa";
import faImporter from "@/features/importer/locales/fa";
import faPlaid from "@/features/plaid/locales/fa";
import faReceipt from "@/features/receipt/locales/fa";

const fa: Record<string, string> = {
  ...extractMessages(faCommon),
  ...extractMessages(faSeo),
  ...extractMessages(faAuth),
  ...extractMessages(faUserSettings),
  ...extractMessages(faLedgerList),
  ...extractMessages(faSettings),
  ...extractMessages(faCollaboration),
  ...extractMessages(faLedgerEditor),
  ...extractMessages(faJournal),
  ...extractMessages(faReports),
  ...extractMessages(faAccounts),
  ...extractMessages(faBudget),
  ...extractMessages(faCommodities),
  ...extractMessages(faDocuments),
  ...extractMessages(faErrors),
  ...extractMessages(faEvents),
  ...extractMessages(faHoldings),
  ...extractMessages(faStatistics),
  ...extractMessages(faBql),
  ...extractMessages(faAiAgent),
  ...extractMessages(faPullRequests),
  ...extractMessages(faCommits),
  ...extractMessages(faImporter),
  ...extractMessages(faPlaid),
  ...extractMessages(faReceipt),
};

export default fa;
