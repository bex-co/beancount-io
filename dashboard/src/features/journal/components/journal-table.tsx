import {
  isJournalBalance,
  type JournalDirectiveType,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { useBalanceAccountOpenDates } from "../hooks/use-balance-account-open-dates";
import { JournalDays, type JournalMoney } from "./journal-days";
import { JournalLines } from "./journal-lines";
import type { JournalRegister, JournalTableItem } from "./journal-register";

export type { JournalTableItem } from "./journal-register";

interface JournalTableProps {
  data: JournalTableItem[];
  ledgerId?: string;
  /** Actual Open directives, keyed by account. An unknown directory leaves checks neutral. */
  openedAccounts?: ReadonlyMap<string, string>;
  /**
   * `lines` is one line per entry with its date and status in columns of
   * their own, for reconciling; `days` reads as a ledger, entries under day
   * headings. The reader picks one with the Journal's layout choice.
   */
  layout: "lines" | "days";
  /** The ledger's names the rows need to say how much moved. */
  money: JournalMoney;
  /**
   * An account's journal: each row also says what the entry did to that
   * account and where the account then stood, from `change` and `balance`.
   */
  register?: JournalRegister;
  showMetadata?: boolean;
  showPostings?: boolean;
  onEntryClick?: (
    entry: JournalDirectiveType,
    opener: HTMLElement | null,
  ) => void;
  ledgerOwner?: string;
  ledgerName?: string;
  /** The table's accessible name, where the page names the list itself. */
  label?: string;
}

/**
 * The one list of ledger entries: the Journal, an account's journal and the
 * Overview's recent activity all draw their entries here, so an entry reads
 * the same wherever it appears.
 */
export function JournalTable(props: JournalTableProps) {
  const { data, ledgerId, openedAccounts } = props;
  if (
    ledgerId &&
    !openedAccounts &&
    data.some(
      ({ directive }) => isJournalBalance(directive) && !directive.diff_amount,
    )
  ) {
    return <JournalTableWithOpenedAccounts {...props} ledgerId={ledgerId} />;
  }
  return <JournalTableLayout {...props} />;
}

function JournalTableWithOpenedAccounts(
  props: JournalTableProps & { ledgerId: string },
) {
  const openedAccounts = useBalanceAccountOpenDates(props.ledgerId);
  return <JournalTableLayout {...props} openedAccounts={openedAccounts} />;
}

function JournalTableLayout({
  data,
  openedAccounts,
  layout,
  money,
  register,
  showMetadata = true,
  showPostings = true,
  onEntryClick,
  ledgerOwner,
  ledgerName,
  label,
}: JournalTableProps) {
  const { t } = useTranslations();
  const Layout = layout === "lines" ? JournalLines : JournalDays;
  return (
    <Layout
      data={data}
      openedAccounts={openedAccounts}
      money={money}
      register={register}
      showMetadata={showMetadata}
      showPostings={showPostings}
      onEntryClick={onEntryClick}
      ledgerOwner={ledgerOwner}
      ledgerName={ledgerName}
      label={
        label ??
        (register
          ? t("journal.accountJournalTable")
          : t("journal.journalTable"))
      }
    />
  );
}
