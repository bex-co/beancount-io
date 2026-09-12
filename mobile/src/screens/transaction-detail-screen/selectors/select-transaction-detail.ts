import type { JournalTransaction } from "../../transactions-screen/types";
import { selectTransactionAmount } from "../../transactions-screen/utils/transaction-display-utils";

// Beancount/Fava reserve these flags for entries synthesized by reports or
// plugins. They are not standalone source directives, so asking the source
// context API to edit or delete one either fails or resolves to the directive
// that generated it (for example, a `pad` directive instead of its `P`
// transaction).
const GENERATED_TRANSACTION_FLAGS = new Set([
  "P",
  "S",
  "T",
  "C",
  "U",
  "R",
  "M",
]);

export function hasEditableSource(txn: JournalTransaction): boolean {
  return !GENERATED_TRANSACTION_FLAGS.has(txn.flag);
}

/** Headline amount for the detail screen, matching the list rows' convention:
 * `+` prefix for cash inflows, unsigned otherwise. */
export type HeroAmount = {
  text: string;
  isPositive: boolean | null;
};

/**
 * The headline amount, from the same selector `EntryRow` uses for list
 * rows, so the hero number can never disagree with the row the user tapped.
 */
export function selectHeroAmount(txn: JournalTransaction): HeroAmount {
  const amount = selectTransactionAmount(txn);
  if (!amount) {
    return { text: "", isPositive: null };
  }

  const { text, value } = amount;
  return {
    text: value > 0 ? `+${text}` : text,
    isPositive: value > 0 ? true : value < 0 ? false : null,
  };
}

/** One posting shaped for display: signed amount string + sign for coloring. */
export type PostingDisplayRow = {
  account: string;
  amount: string;
  sign: -1 | 0 | 1;
};

/**
 * Format a posting units number from its recorded decimal string so commodity
 * quantities keep their source scale (e.g. 1.843 RGAGX). USD still pads to
 * two fraction digits when the source is shorter. Avoids parseFloat →
 * maximumFractionDigits: 2 which rounded share quantities away.
 */
function formatPostingUnits(
  number: string,
  currency: string,
): {
  amount: string;
  sign: -1 | 0 | 1;
} {
  const trimmed = number.trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return { amount: `${number} ${currency}`, sign: 0 };
  }

  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[+-]/, "");
  const isZero = /^0+(\.0+)?$/.test(unsigned);
  const [intPart, fracPart = ""] = unsigned.split(".");
  const displayFrac =
    currency === "USD" && fracPart.length < 2
      ? fracPart.padEnd(2, "0")
      : fracPart;
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body =
    displayFrac.length > 0 ? `${groupedInt}.${displayFrac}` : groupedInt;
  const magnitude = currency === "USD" ? `$${body}` : `${body} ${currency}`;

  if (isZero) {
    return { amount: magnitude, sign: 0 };
  }
  if (negative) {
    return { amount: `-${magnitude}`, sign: -1 };
  }
  return { amount: `+${magnitude}`, sign: 1 };
}

export function selectPostingRows(
  txn: JournalTransaction,
): PostingDisplayRow[] {
  return (txn.postings ?? []).map((p) => {
    const { amount, sign } = formatPostingUnits(
      p.units.number,
      p.units.currency,
    );
    return {
      account: p.account,
      amount,
      sign,
    };
  });
}

export function selectTransactionTitle(txn: JournalTransaction): string {
  return txn.payee || txn.narration || "";
}

/** An overflow-menu action on the transaction detail screen. */
export type TransactionMenuAction =
  "shareLink" | "copyLink" | "deleteTransaction";

/**
 * Which overflow-menu actions a transaction offers, in display order.
 *
 * A generated entry (see `hasEditableSource`) has no source directive, so an
 * entry permalink opens "No entry context data available" rather than the
 * transaction — offering Share/Copy there hands the user a broken link. Write
 * actions keep their own gate (`shouldShowTransactionWriteActions`), which
 * needs a loaded `sha256sum` and so is already false for a generated entry.
 *
 * @returns The actions to show; an empty list means render no menu button at
 *   all, since an ellipsis that opens nothing is worse than no ellipsis.
 */
export function selectTransactionMenuActions({
  isGenerated,
  showWriteActions,
}: {
  isGenerated: boolean;
  showWriteActions: boolean;
}): TransactionMenuAction[] {
  const actions: TransactionMenuAction[] = [];
  if (!isGenerated) {
    actions.push("shareLink", "copyLink");
  }
  if (showWriteActions) {
    actions.push("deleteTransaction");
  }
  return actions;
}
