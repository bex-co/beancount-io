import type { RootNames } from "../../../common/account-root";
import { entryRowSecondaryText } from "../../transactions-screen/entry-row/entry-row-secondary";
import { isolateLtr } from "../../../common/bidi";
import {
  currencyMinorUnits,
  getCurrencySymbol,
} from "../../../common/currency-util";
import type { JournalTransaction } from "../../transactions-screen/types";
import {
  isMixedPostingsAmount,
  selectTransactionAmount,
} from "../../transactions-screen/utils/transaction-display-utils";
import { formatEntryRowAmount } from "../../transactions-screen/entry-row/format-entry-row-amount";

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

/** Headline amount for the detail screen, signed exactly as the list row is:
 * `+` for money in, `-` for money out, unsigned with no direction. */
export type HeroAmount = {
  text: string;
  isPositive: boolean | null;
};

/**
 * The headline amount, from the same selector `EntryRow` uses for list
 * rows, so the hero number can never disagree with the row the user tapped.
 *
 * @param mixedLabel - Localized neutral summary shown, unsigned and uncolored,
 *   for a trade whose money side spans several accounts (see
 *   `selectTransactionAmount`); its exact postings are listed below the hero.
 */
export function selectHeroAmount(
  txn: JournalTransaction,
  mixedLabel: string,
  operatingCurrency?: string,
  roots?: RootNames,
): HeroAmount {
  const amount = selectTransactionAmount(txn, operatingCurrency, roots);
  if (!amount) {
    return { text: "", isPositive: null };
  }
  if (isMixedPostingsAmount(amount)) {
    return { text: mixedLabel, isPositive: null };
  }

  const { text, value } = amount;
  return {
    text: formatEntryRowAmount(text, value),
    isPositive: value > 0 ? true : value < 0 ? false : null,
  };
}

/** One posting shaped for display: signed amount string + sign for coloring. */
export type PostingDisplayRow = {
  account: string;
  amount: string;
  sign: -1 | 0 | 1;
  /** Per-unit lot cost, unsigned, when the posting holds one (`{1.50 USD}`). */
  cost?: string;
  /**
   * The lot a cost belongs to: its date and label as the ledger writes them
   * (`2023-01-15`, `lot-b`). Two sales from different lots read alike without
   * it, and the lot's date decides short- or long-term gain (w21/603).
   */
  lot?: string;
  /** Per-unit price, unsigned, when the posting carries one (`@ 2.00 USD`). */
  price?: string;
  /**
   * The posting's own `!` flag: one leg left unconfirmed, as when
   * reconciling. Dropped, the transaction read as fully cleared (w21/161).
   */
  pending?: true;
  /** The posting's own metadata as "key: value" lines (w21/162). */
  meta?: string[];
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
  heldAtCost = false,
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
  // Padded to a known currency's own minor units, as the headline above is: 4.5
  // EUR read "4.5 EUR" under "-4.50 EUR", and 1500 JPY stays whole (w21/445). A
  // commodity that is not a currency (a share count) keeps its recorded digits.
  // A ticker can also be a currency code (BND, AMD, NOK), so units held at a
  // cost are a commodity whatever their name says (w21/506).
  const minorUnits =
    !heldAtCost && getCurrencySymbol(currency) !== ""
      ? currencyMinorUnits(currency)
      : 0;
  const displayFrac =
    fracPart.length < minorUnits ? fracPart.padEnd(minorUnits, "0") : fracPart;
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

/** Keys the server adds to every entry: where it was written, not what. */
const SOURCE_META_KEYS = new Set(["filename", "lineno"]);

function metaValueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    const { number, currency } = value as {
      number?: unknown;
      currency?: unknown;
    };
    if (typeof number === "string" && typeof currency === "string") {
      return `${number} ${currency}`;
    }
  }
  return JSON.stringify(value);
}

/**
 * An entry's or posting's own metadata (`invoice: "INV-0914"`) as
 * "key: value" lines, without the source position the server adds or its
 * internal `__…` keys. Metadata never reached the detail screen, so an
 * invoice number was readable only in the raw source (w21/162).
 */
export function userMetadataLines(
  meta: Record<string, unknown> | null | undefined,
): string[] {
  return (
    Object.entries(meta ?? {})
      .filter(([key]) => !SOURCE_META_KEYS.has(key) && !key.startsWith("__"))
      // A bare `key:` line has no value; "key: null" was not what was written
      // (w21/322).
      .map(([key, value]) =>
        value === null || value === undefined
          ? key
          : `${key}: ${metaValueText(value)}`,
      )
  );
}

/**
 * More fractional digits than anyone writes: a total divided per unit. Twelve:
 * at eight, a precise FX rate (`@ 1.123456789 USD`) or a tiny crypto price
 * read as derived and showed "≈" and rounded, an exact written value marked
 * approximate (w21/322). A division the decimal context carries out runs to
 * twenty-odd digits, so it is still caught.
 */
const DERIVED_SCALE = 12;
/** Significant decimals a derived per-unit figure is shown to. */
const DERIVED_DIGITS = 4;

/**
 * A per-unit figure the ledger derived from a total (`@@ 10.00 USD` on three
 * units, `{{…}}`), rounded half-up to four significant decimals. Divided at
 * full precision it read "@ $3.3333333333333333333333333333" and squeezed
 * the account name to an ellipsis (w21/160). Null for a figure as written.
 */
function roundDerivedPerUnit(number: string): string | null {
  const negative = number.startsWith("-");
  const [whole, frac = ""] = number.replace(/^[+-]/, "").split(".");
  if (frac.length <= DERIVED_SCALE) return null;
  const leadingZeros = /^0*/.exec(whole === "0" ? frac : "")![0].length;
  const scale = Math.min(frac.length, leadingZeros + DERIVED_DIGITS);
  const digits = BigInt(`${whole}${frac.slice(0, scale)}`);
  const rounded = Number(frac[scale]) >= 5 ? digits + 1n : digits;
  const text = rounded.toString().padStart(scale + 1, "0");
  const roundedFrac = text.slice(-scale).replace(/0+$/, "");
  const roundedWhole = text.slice(0, -scale);
  return `${negative ? "-" : ""}${roundedWhole}${roundedFrac ? `.${roundedFrac}` : ""}`;
}

/** A per-unit cost or price at its recorded scale, without a sign. */
const formatPerUnit = (amount: {
  number: string;
  currency: string;
}): string => {
  const derived = roundDerivedPerUnit(amount.number.trim());
  const shown = formatPostingUnits(
    derived ?? amount.number,
    amount.currency,
  ).amount.replace(/^[+-]/, "");
  return derived === null ? shown : `≈${shown}`;
};

/** A cost's lot: its date and label, when it has them. */
const lotOf = (cost: {
  date?: string | null;
  label?: string | null;
}): { lot?: string } => {
  const lot = [cost.date, cost.label]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
  return lot ? { lot } : {};
};

export function selectPostingRows(
  txn: JournalTransaction,
): PostingDisplayRow[] {
  return (txn.postings ?? []).map((p) => {
    const { amount, sign } = formatPostingUnits(
      p.units.number,
      p.units.currency,
      Boolean(p.cost?.number && p.cost.currency),
    );
    return {
      account: p.account,
      amount,
      sign,
      // A trade's cost basis and sale price explain its gain; the row used
      // to show only the units (w21/059).
      ...(p.cost?.number && p.cost.currency
        ? { cost: formatPerUnit(p.cost), ...lotOf(p.cost) }
        : {}),
      ...(p.price?.number && p.price.currency
        ? { price: formatPerUnit(p.price) }
        : {}),
      ...(p.flag === "!" ? { pending: true as const } : {}),
      ...(userMetadataLines(p.meta).length > 0
        ? { meta: userMetadataLines(p.meta) }
        : {}),
    };
  });
}

/**
 * The line under a posting's units naming its cost and price, or null for an
 * ordinary posting. A price alone reads as the ledger writes it, `@ 1.10 USD`.
 */
export function postingBasisText(
  row: Pick<PostingDisplayRow, "cost" | "price" | "lot">,
  t: (
    key: "postingCost" | "postingPrice",
    params: { amount: string },
  ) => string,
): string | null {
  // Each amount isolated, so a right-to-left sentence keeps "185.00 USD" in
  // order and its currency on the side the number was written (w21/536).
  const lot = row.lot ? ` · ${isolateLtr(row.lot)}` : "";
  if (row.cost && row.price) {
    return `${t("postingCost", { amount: isolateLtr(row.cost) })}${lot} · ${t("postingPrice", { amount: isolateLtr(row.price) })}`;
  }
  if (row.cost)
    return `${t("postingCost", { amount: isolateLtr(row.cost) })}${lot}`;
  if (row.price) return `@ ${row.price}`;
  return null;
}

export function selectTransactionTitle(txn: JournalTransaction): string {
  return txn.payee?.trim() || txn.narration?.trim() || "";
}

/**
 * The line under the title: the narration when the payee is the title and the
 * narration says something else. A payee of spaces, or one equal to the
 * narration, left the title repeated beneath itself (w21/668).
 */
export function selectTransactionSubtitle(
  txn: JournalTransaction,
): string | null {
  return entryRowSecondaryText(txn);
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
